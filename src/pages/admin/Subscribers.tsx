import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';
import { Mail, Users, Tag, Newspaper, Bell, Search, Download, Send, Loader2 } from 'lucide-react';
import { errMsg } from '@/lib/errors';

type Subscriber = {
 id: string;
 email: string;
 user_id: string | null;
 subscribed_to_updates: boolean;
 subscribed_to_discounts: boolean;
 subscribed_to_newsletters: boolean;
 created_at: string;
 updated_at: string;
 display_name?: string | null;
};

type FilterType = 'all' | 'updates' | 'discounts' | 'newsletters';

export default function Subscribers() {
 
 const [searchQuery, setSearchQuery] = useState('');
 const [filterType, setFilterType] = useState<FilterType>('all');
 const [sendEmailOpen, setSendEmailOpen] = useState(false);
 const [emailSubject, setEmailSubject] = useState('');
 const [emailContent, setEmailContent] = useState('');
 const [emailTarget, setEmailTarget] = useState<FilterType>('all');
 const [isSending, setIsSending] = useState(false);

 const { data: subscribers = [], isLoading, refetch } = useQuery({
 queryKey: ['admin-subscribers'],
 queryFn: async () => {
 // Fetch subscriptions - only those subscribed to at least one category
 const { data: subscriptions, error } = await supabase
 .from('email_subscriptions')
 .select('id, email, user_id, subscribed_to_updates, subscribed_to_discounts, subscribed_to_newsletters, created_at, updated_at')
 .or('subscribed_to_updates.eq.true,subscribed_to_discounts.eq.true,subscribed_to_newsletters.eq.true')
 .order('created_at', { ascending: false })
 .limit(500);

 if (error) throw error;

 // Fetch profiles to get display names
 const userIds = (subscriptions?.filter(s => s.user_id).map(s => s.user_id) || []) as string[];
 const profilesMap: Record<string, string> = {};

 if (userIds.length > 0) {
 const { data: profiles } = await supabase
 .from('profiles')
 .select('user_id, display_name')
 .in('user_id', userIds);

 profiles?.forEach(p => {
 if (p.display_name) {
 profilesMap[p.user_id] = p.display_name;
 }
 });
 }

 return (subscriptions || []).map(sub => ({
 ...sub,
 display_name: sub.user_id ? profilesMap[sub.user_id] || null : null,
 })) as Subscriber[];
 },
 });

 // Filter subscribers
 const filteredSubscribers = useMemo(() => {
 return subscribers.filter(sub => {
 // Search filter
 const matchesSearch = searchQuery === '' ||
 sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (sub.display_name && sub.display_name.toLowerCase().includes(searchQuery.toLowerCase()));

 // Type filter
 let matchesType = true;
 if (filterType === 'updates') matchesType = sub.subscribed_to_updates;
 else if (filterType === 'discounts') matchesType = sub.subscribed_to_discounts;
 else if (filterType === 'newsletters') matchesType = sub.subscribed_to_newsletters;

 return matchesSearch && matchesType;
 });
 }, [subscribers, searchQuery, filterType]);

 // Stats
 const stats = useMemo(() => ({
 total: subscribers.length,
 updates: subscribers.filter(s => s.subscribed_to_updates).length,
 discounts: subscribers.filter(s => s.subscribed_to_discounts).length,
 newsletters: subscribers.filter(s => s.subscribed_to_newsletters).length,
 }), [subscribers]);

 // Get recipient count for email target
 const getRecipientCount = (target: FilterType) => {
 if (target === 'all') return subscribers.length;
 if (target === 'updates') return stats.updates;
 if (target === 'discounts') return stats.discounts;
 if (target === 'newsletters') return stats.newsletters;
 return 0;
 };

 // Export to CSV
 const handleExport = () => {
 const headers = ['Email', 'Username', 'Updates', 'Discounts', 'Newsletters', 'Subscribed At'];
 const rows = filteredSubscribers.map(sub => [
 sub.email,
 sub.display_name || '',
 sub.subscribed_to_updates ? 'Yes' : 'No',
 sub.subscribed_to_discounts ? 'Yes' : 'No',
 sub.subscribed_to_newsletters ? 'Yes' : 'No',
 format(new Date(sub.created_at), 'yyyy-MM-dd HH:mm'),
 ]);

 const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
 const blob = new Blob([csv], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
 a.click();
 URL.revokeObjectURL(url);

 toast.success('Export Complete', { description: `Exported ${filteredSubscribers.length} subscribers.` });
 };

 // Send mass email
 const handleSendEmail = async () => {
 if (!emailSubject.trim() || !emailContent.trim()) {
 toast.error('Missing Fields', { description: 'Please fill in subject and message.' });
 return;
 }

 setIsSending(true);

 try {
 // Get recipients based on target
 let recipients = subscribers;
 if (emailTarget === 'updates') recipients = subscribers.filter(s => s.subscribed_to_updates);
 else if (emailTarget === 'discounts') recipients = subscribers.filter(s => s.subscribed_to_discounts);
 else if (emailTarget === 'newsletters') recipients = subscribers.filter(s => s.subscribed_to_newsletters);

 const emails = recipients.map(r => r.email);

 const { data, error } = await supabase.functions.invoke('send-admin-email', {
 body: {
 email_type: 'mass_email',
 emails,
 subject: emailSubject,
 content: emailContent,
 },
 });

 if (error) throw error;

 toast.success('Emails Sent', { description: `Successfully sent to ${data?.sent || emails.length} recipients.` });

 setSendEmailOpen(false);
 setEmailSubject('');
 setEmailContent('');
 setEmailTarget('all');
 } catch (error) {
 console.error('Error sending emails:', error);
 toast.error('Send Failed', { description: errMsg(error) || 'Failed to send emails.' });
 } finally {
 setIsSending(false);
 }
 };

 return (
 <AdminLayout requiredPermissions={['view_subscribers']}>
 <div className="space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold">Email Subscribers</h1>
 <p className="text-muted-foreground">Manage email subscriptions and send campaigns</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleExport} disabled={filteredSubscribers.length === 0}>
 <Download className="h-4 w-4 mr-2" />
 Export CSV
 </Button>
 <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
 <DialogTrigger asChild>
 <Button>
 <Send className="h-4 w-4 mr-2" />
 Send Email
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-lg">
 <DialogHeader>
 <DialogTitle>Send Mass Email</DialogTitle>
 <DialogDescription>
 Compose and send an email to your subscribers
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>Recipients</Label>
 <Select value={emailTarget} onValueChange={(v) => setEmailTarget(v as FilterType)}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Subscribers ({stats.total})</SelectItem>
 <SelectItem value="updates">Product Updates ({stats.updates})</SelectItem>
 <SelectItem value="discounts">Discounts & Vouchers ({stats.discounts})</SelectItem>
 <SelectItem value="newsletters">Newsletters ({stats.newsletters})</SelectItem>
 </SelectContent>
 </Select>
 <p className="text-xs text-muted-foreground">
 Will send to {getRecipientCount(emailTarget)} recipient(s)
 </p>
 </div>
 <div className="space-y-2">
 <Label htmlFor="subject">Subject</Label>
 <Input
 id="subject"
 placeholder="Email subject..."
 value={emailSubject}
 onChange={(e) => setEmailSubject(e.target.value)}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="content">Message</Label>
 <Textarea
 id="content"
 placeholder="Write your email message here..."
 rows={6}
 value={emailContent}
 onChange={(e) => setEmailContent(e.target.value)}
 />
 <p className="text-xs text-muted-foreground">
 Plain text. HTML formatting will be applied automatically.
 </p>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setSendEmailOpen(false)}>
 Cancel
 </Button>
 <Button onClick={handleSendEmail} disabled={isSending}>
 {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
 Send to {getRecipientCount(emailTarget)} Recipients
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
 <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
 <div className="px-4 py-3 border-b border-border bg-muted/30 p-3 pb-1 md:p-6 md:pb-2">
 <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs md:text-sm">
 <Users className="h-3 w-3 md:h-4 md:w-4" />
 Total
 </p>
 </div>
 <div className="p-4 p-3 pt-0 md:p-6 md:pt-0">
 <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
 <div className="px-4 py-3 border-b border-border bg-muted/30 p-3 pb-1 md:p-6 md:pb-2">
 <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs md:text-sm">
 <Bell className="h-3 w-3 md:h-4 md:w-4" />
 Updates
 </p>
 </div>
 <div className="p-4 p-3 pt-0 md:p-6 md:pt-0">
 <p className="text-lg md:text-2xl font-bold">{stats.updates}</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
 <div className="px-4 py-3 border-b border-border bg-muted/30 p-3 pb-1 md:p-6 md:pb-2">
 <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs md:text-sm">
 <Tag className="h-3 w-3 md:h-4 md:w-4" />
 Discounts
 </p>
 </div>
 <div className="p-4 p-3 pt-0 md:p-6 md:pt-0">
 <p className="text-lg md:text-2xl font-bold">{stats.discounts}</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
 <div className="px-4 py-3 border-b border-border bg-muted/30 p-3 pb-1 md:p-6 md:pb-2">
 <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs md:text-sm">
 <Newspaper className="h-3 w-3 md:h-4 md:w-4" />
 Newsletters
 </p>
 </div>
 <div className="p-4 p-3 pt-0 md:p-6 md:pt-0">
 <p className="text-lg md:text-2xl font-bold">{stats.newsletters}</p>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm">Subscriber List</h3>
 </div>
 <div className="p-4 space-y-4">
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search by email or name..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-10"
 />
 </div>
 <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
 <SelectTrigger className="w-auto min-w-[140px]">
 <SelectValue placeholder="Filter by type" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Subscribers</SelectItem>
 <SelectItem value="updates">Product Updates</SelectItem>
 <SelectItem value="discounts">Discounts</SelectItem>
 <SelectItem value="newsletters">Newsletters</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Table */}
 {isLoading ? (
 <div className="flex items-center justify-center py-8">
 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
 </div>
 ) : filteredSubscribers.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground">
 <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
 <p>No subscribers found</p>
 </div>
 ) : (
 <div className="rounded-md border">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Email</TableHead>
 <TableHead className="hidden sm:table-cell">Name</TableHead>
 <TableHead>Subscriptions</TableHead>
 <TableHead className="hidden md:table-cell">Subscribed</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredSubscribers.map((sub) => (
 <TableRow key={sub.id}>
 <TableCell className="font-medium">{sub.email}</TableCell>
 <TableCell className="hidden sm:table-cell text-muted-foreground">
 {sub.display_name || '—'}
 </TableCell>
 <TableCell>
 <div className="flex flex-wrap gap-1">
 {sub.subscribed_to_updates && (
 <Badge variant="secondary" className="text-xs">Updates</Badge>
 )}
 {sub.subscribed_to_discounts && (
 <Badge variant="secondary" className="text-xs">Discounts</Badge>
 )}
 {sub.subscribed_to_newsletters && (
 <Badge variant="secondary" className="text-xs">Newsletter</Badge>
 )}
 </div>
 </TableCell>
 <TableCell className="hidden md:table-cell text-muted-foreground">
 {format(new Date(sub.created_at), 'MMM d, yyyy')}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </div>
 </div>
 </div>
 </AdminLayout>
 );
}
