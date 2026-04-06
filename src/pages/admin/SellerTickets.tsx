import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle, Send, Link as LinkIcon, User, Store, AlertCircle, XCircle, AlertTriangle, Paperclip, X, ChevronDown, Zap, Loader2, ShoppingBag, History, UserCheck, Mail, Headphones } from 'lucide-react';
import { AttachmentDisplay } from '@/components/chat/AttachmentDisplay';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator,
 DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface TicketMessage {
 id: string;
 message: string;
 is_admin: boolean;
 created_at: string;
 user_id: string;
 attachment_url?: string | null;
}

interface Ticket {
 id: string;
 ticket_number: string;
 store_id: string | null;
 user_id: string;
 category: string;
 subject: string;
 description: string;
 status: string;
 priority: string;
 link_change_type?: string;
 new_discord_username?: string;
 new_roblox_username?: string;
 change_reason?: string;
 assigned_to?: string;
 resolved_by?: string;
 resolved_at?: string;
 resolution_notes?: string;
 escalated_at?: string;
 last_staff_response_at?: string;
 created_at: string;
 updated_at: string;
 profiles?: {
 display_name: string | null;
 email: string;
 customer_id: string | null;
 discord_username: string | null;
 roblox_username: string | null;
 avatar_url: string | null;
 created_at: string | null;
 };
 stores?: {
 name: string;
 store_id: string;
 };
}

const CATEGORY_LABELS: Record<string, string> = {
 account_link_change: 'Account Link Change',
 payout_issue: 'Payout Issue',
 product_issue: 'Product Issue',
 technical_support: 'Technical Support',
 policy_question: 'Policy Question',
 other: 'Other',
};

const CANNED_RESPONSES = [
 { label: 'Greeting', text: 'Hi there! Thanks for reaching out. I\'d be happy to help you with this.' },
 { label: 'Need more info', text: 'Could you please provide more details so we can investigate further?' },
 { label: 'Looking into it', text: 'I\'m looking into this now. Please give me a moment to review the details.' },
 { label: 'Payout info', text: 'Payouts are processed within 7 business days. You can track the status in your Seller Dashboard under Payouts.' },
 { label: 'Account change processed', text: 'Your account link change has been processed. Please verify your new account from the Settings page.' },
 { label: 'Issue resolved', text: 'The issue has been resolved. Please let us know if you need anything else!' },
 { label: 'Escalating', text: 'I\'m escalating this to our senior team for further review. You\'ll hear back shortly.' },
];

export default function SellerTickets() {
 const { user } = useAuth();
 const queryClient = useQueryClient();

 const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
 const [newMessage, setNewMessage] = useState('');
 const [resolutionNotes, setResolutionNotes] = useState('');
 const [showResolveDialog, setShowResolveDialog] = useState(false);
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 // ── Realtime ──────────────────────────────────────────────────────────────
 useEffect(() => {
 const channel = supabase
 .channel('seller-tickets-realtime')
 .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_support_tickets' }, () => {
 queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
 })
 .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_ticket_messages' }, () => {
 queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages'] });
 })
 .subscribe();
 return () => { supabase.removeChannel(channel); };
 }, [queryClient]);

 // Scroll to bottom on new messages
 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [selectedTicket]);

 // ── Fetch tickets ─────────────────────────────────────────────────────────
 const { data: tickets, isLoading } = useQuery({
 queryKey: ['admin-seller-tickets'],
 queryFn: async () => {
 const { data: ticketsData, error: ticketsError } = await supabase
 .from('seller_support_tickets')
 .select(`*, stores:store_id (name, store_id)`)
 .not('status', 'in', '("closed","resolved")')
 .order('created_at', { ascending: false });
 if (ticketsError) throw ticketsError;

 const userIds = [...new Set(ticketsData.map(t => t.user_id))];
 const { data: profilesData, error: profilesError } = await supabase
 .from('profiles')
 .select('user_id, display_name, email, customer_id, discord_username, roblox_username, avatar_url, created_at')
 .in('user_id', userIds);
 if (profilesError) throw profilesError;

 const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));
 return ticketsData.map(t => ({ ...t, profiles: profilesMap.get(t.user_id) || null })) as Ticket[];
 },
 });

 // ── Fetch messages ────────────────────────────────────────────────────────
 const { data: messages } = useQuery({
 queryKey: ['admin-ticket-messages', selectedTicket?.id],
 queryFn: async () => {
 if (!selectedTicket?.id) return [];
 const { data, error } = await supabase
 .from('seller_ticket_messages')
 .select('*')
 .eq('ticket_id', selectedTicket.id)
 .order('created_at', { ascending: true });
 if (error) throw error;
 return data as TicketMessage[];
 },
 enabled: !!selectedTicket?.id,
 });

 // ── Seller's past tickets ─────────────────────────────────────────────────
 const { data: sellerPastTickets } = useQuery({
 queryKey: ['seller-past-tickets', selectedTicket?.user_id, selectedTicket?.id],
 queryFn: async () => {
 if (!selectedTicket?.user_id) return [];
 const { data, error } = await supabase
 .from('seller_support_tickets')
 .select('id, ticket_number, subject, status, created_at')
 .eq('user_id', selectedTicket.user_id)
 .neq('id', selectedTicket.id)
 .order('created_at', { ascending: false })
 .limit(5);
 if (error) return [];
 return data;
 },
 enabled: !!selectedTicket?.user_id,
 });

 // ── Grouped messages by date ──────────────────────────────────────────────
 const groupedMessages = useMemo(() => {
 if (!messages) return [];
 const groups: { date: string; messages: TicketMessage[] }[] = [];
 let currentDate = '';
 for (const msg of messages) {
 const date = format(new Date(msg.created_at), 'MMM d, yyyy');
 if (date !== currentDate) {
 currentDate = date;
 groups.push({ date, messages: [msg] });
 } else {
 groups[groups.length - 1].messages.push(msg);
 }
 }
 return groups;
 }, [messages]);

 // ── Send message ──────────────────────────────────────────────────────────
 const sendMessage = useMutation({
 mutationFn: async () => {
 if (!user?.id || !selectedTicket?.id) throw new Error('Invalid state');

 let attachmentUrl: string | null = null;
 if (attachmentFile) {
 const fileExt = attachmentFile.name.split('.').pop();
 const filePath = `${user.id}/${selectedTicket.id}/${Date.now()}.${fileExt}`;
 const { error: uploadError } = await supabase.storage
 .from('seller-ticket-attachments')
 .upload(filePath, attachmentFile);
 if (uploadError) throw uploadError;
 attachmentUrl = filePath;
 }

 const { error } = await supabase
 .from('seller_ticket_messages')
 .insert({
 ticket_id: selectedTicket.id,
 user_id: user.id,
 message: newMessage.trim() || (attachmentUrl ? '\uD83D\uDCCE Attachment' : ''),
 is_admin: true,
 attachment_url: attachmentUrl,
 });
 if (error) throw error;

 if (selectedTicket.status === 'open') {
 await supabase
 .from('seller_support_tickets')
 .update({ status: 'in_progress', assigned_to: user.id })
 .eq('id', selectedTicket.id);
 }
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', selectedTicket?.id] });
 queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
 setNewMessage('');
 setAttachmentFile(null);
 },
 onError: (error) => toast.error('Error', { description: error.message }),
 });

 // ── Update status ─────────────────────────────────────────────────────────
 const updateStatus = useMutation({
 mutationFn: async (newStatus: string) => {
 if (!selectedTicket?.id) throw new Error('No ticket selected');
 const updateData: Record<string, unknown> = { status: newStatus };
 if (newStatus === 'in_progress' && !selectedTicket.assigned_to) updateData.assigned_to = user?.id;
 const { error } = await supabase.from('seller_support_tickets').update(updateData).eq('id', selectedTicket.id);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
 toast.success('Status updated');
 },
 onError: (error) => toast.error('Error', { description: error.message }),
 });

 // ── Update priority ───────────────────────────────────────────────────────
 const updatePriority = useMutation({
 mutationFn: async (newPriority: string) => {
 if (!selectedTicket?.id) throw new Error('No ticket selected');
 const { error } = await supabase.from('seller_support_tickets').update({ priority: newPriority }).eq('id', selectedTicket.id);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
 toast.success('Priority updated');
 },
 onError: (error) => toast.error('Error', { description: error.message }),
 });

 // ── Resolve ticket ────────────────────────────────────────────────────────
 const resolveTicket = useMutation({
 mutationFn: async () => {
 if (!selectedTicket?.id || !user?.id) throw new Error('Invalid state');
 const { error } = await supabase
 .from('seller_support_tickets')
 .update({ status: 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString(), resolution_notes: resolutionNotes })
 .eq('id', selectedTicket.id);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
 toast.success('Ticket resolved');
 setShowResolveDialog(false);
 setResolutionNotes('');
 setSelectedTicket(null);
 },
 onError: (error) => toast.error('Error', { description: error.message }),
 });

 // ── Apply link change ─────────────────────────────────────────────────────
 const applyLinkChange = useMutation({
 mutationFn: async () => {
 if (!selectedTicket?.user_id) throw new Error('No user ID');
 const updates: Record<string, unknown> = {};
 if (selectedTicket.new_discord_username) updates.discord_username = selectedTicket.new_discord_username;
 if (selectedTicket.new_roblox_username) updates.roblox_username = selectedTicket.new_roblox_username;
 if (Object.keys(updates).length === 0) throw new Error('No changes to apply');
 const { error } = await supabase.from('profiles').update(updates).eq('user_id', selectedTicket.user_id);
 if (error) throw error;
 },
 onSuccess: () => toast.success('Link change applied', { description: 'User will need to re-verify.' }),
 onError: (error) => toast.error('Error', { description: error.message }),
 });

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && (newMessage.trim() || attachmentFile)) {
 e.preventDefault();
 sendMessage.mutate();
 }
 };

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (file.size > 10 * 1024 * 1024) {
 toast.error('File too large', { description: 'Max 10MB' });
 return;
 }
 setAttachmentFile(file);
 if (fileInputRef.current) fileInputRef.current.value = '';
 };

 const insertCannedResponse = (text: string) => {
 setNewMessage(prev => prev ? `${prev}\n\n${text}` : text);
 };

 const getStatusBadge = (status: string) => {
 const configs: Record<string, { label: string; className: string }> = {
 open: { label: 'Open', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
 in_progress: { label: 'In Progress', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
 awaiting_seller: { label: 'Awaiting Seller', className: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
 resolved: { label: 'Resolved', className: 'bg-green-500/10 text-green-500 border-green-500/30' },
 closed: { label: 'Closed', className: '' },
 };
 const c = configs[status];
 if (!c) return null;
 return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
 };

 const getPriorityBadge = (priority: string) => {
 if (priority === 'urgent') return <Badge variant="destructive">Urgent</Badge>;
 if (priority === 'high') return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">High</Badge>;
 return null;
 };

 const filteredTickets = tickets?.filter(t => {
 if (statusFilter === 'all') return true;
 if (statusFilter === 'open') return !['resolved', 'closed'].includes(t.status);
 if (statusFilter === 'escalated') return !!t.escalated_at && !['resolved', 'closed'].includes(t.status);
 return t.status === statusFilter;
 }) || [];

 const sortedTickets = [...filteredTickets].sort((a, b) => {
 if (a.escalated_at && !b.escalated_at) return -1;
 if (!a.escalated_at && b.escalated_at) return 1;
 return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
 });

 const openCount = tickets?.filter(t => t.status === 'open').length || 0;
 const inProgressCount = tickets?.filter(t => t.status === 'in_progress').length || 0;
 const awaitingCount = tickets?.filter(t => t.status === 'awaiting_seller').length || 0;
 const escalatedCount = tickets?.filter(t => t.escalated_at && !['resolved', 'closed'].includes(t.status)).length || 0;

 return (
 <AdminLayout requiredPermissions={['view_seller_tickets']}>
 <div className="space-y-4">
 <div>
 <h1 className="text-2xl font-display font-bold">Seller Support Tickets</h1>
 <p className="text-sm text-muted-foreground">Manage support requests from sellers</p>
 </div>

 {/* Inline stats */}
 <div className="flex items-center gap-4 text-sm flex-wrap">
 {escalatedCount > 0 && (
 <span className="text-destructive font-semibold">{escalatedCount} escalated</span>
 )}
 <span className="text-muted-foreground">
 <span className="font-semibold text-foreground">{openCount}</span> open
 </span>
 <span className="text-muted-foreground">
 <span className="font-semibold text-yellow-500">{inProgressCount}</span> in progress
 </span>
 <span className="text-muted-foreground">
 <span className="font-semibold text-orange-500">{awaitingCount}</span> awaiting seller
 </span>
 <span className="text-muted-foreground">
 <span className="font-semibold text-muted-foreground">{tickets?.length || 0}</span> total
 </span>
 </div>

 {/* Filters */}
 <div className="flex gap-3">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-auto min-w-[140px]">
 <SelectValue placeholder="Filter by status" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Tickets</SelectItem>
 <SelectItem value="escalated">{'\uD83D\uDD25'} Escalated</SelectItem>
 <SelectItem value="open">Open Only</SelectItem>
 <SelectItem value="in_progress">In Progress</SelectItem>
 <SelectItem value="awaiting_seller">Awaiting Seller</SelectItem>
 <SelectItem value="resolved">Resolved</SelectItem>
 <SelectItem value="closed">Closed</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Tickets List */}
 {sortedTickets.length === 0 ? (
 <div className="text-center py-12">
 <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
 <h3 className="text-sm font-medium mb-1">No tickets found</h3>
 <p className="text-xs text-muted-foreground">{statusFilter === 'all' ? 'No support tickets yet' : `No ${statusFilter} tickets`}</p>
 </div>
 ) : (
 <div className="divide-y divide-border">
 {sortedTickets.map((ticket) => {
 const slaHours = ticket.last_staff_response_at
 ? (Date.now() - new Date(ticket.last_staff_response_at).getTime()) / (1000 * 60 * 60)
 : (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
 const slaColor = slaHours < 4 ? 'text-green-500' : slaHours < 12 ? 'text-yellow-500' : slaHours < 24 ? 'text-orange-500' : 'text-destructive';

 return (
 <div
 key={ticket.id}
 className={cn(
 'py-3 flex items-start gap-3 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors',
 ticket.escalated_at && 'bg-destructive/5'
 )}
 onClick={() => setSelectedTicket(ticket)}
 >
 <Avatar className="h-8 w-8 shrink-0 mt-0.5">
 <AvatarImage src={ticket.profiles?.avatar_url || undefined} />
 <AvatarFallback className={cn('text-xs', ticket.escalated_at ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary')}>
 {ticket.escalated_at ? <AlertTriangle className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
 </AvatarFallback>
 </Avatar>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5 flex-wrap">
 <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">{ticket.ticket_number}</Badge>
 {ticket.escalated_at && <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><AlertTriangle className="h-3 w-3 mr-0.5" />Escalated</Badge>}
 {getStatusBadge(ticket.status)}
 {getPriorityBadge(ticket.priority)}
 </div>
 <h3 className="text-sm font-medium line-clamp-1">{ticket.subject}</h3>
 <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
 <span>{ticket.profiles?.display_name || 'Unknown'}</span>
 {ticket.stores && (
 <>
 <span>\u00B7</span>
 <span>{ticket.stores.name}</span>
 </>
 )}
 <span>\u00B7</span>
 <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
 <span>\u00B7</span>
 <span className={cn('font-medium', slaColor)}>
 SLA: {Math.floor(slaHours)}h
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* ── Ticket Detail Drawer ─────────────────────────────────────────── */}
 <Drawer open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
 <DrawerContent className="h-[95dvh] flex flex-col">
 {selectedTicket && (
 <>
 {/* Header */}
 <div className="px-4 pt-2 pb-3 border-b space-y-2">
 <DrawerTitle className="text-base leading-tight">{selectedTicket.subject}</DrawerTitle>
 <div className="flex items-center gap-1.5 flex-wrap">
 <Badge variant="outline" className="font-mono text-xs">{selectedTicket.ticket_number}</Badge>
 {getStatusBadge(selectedTicket.status)}
 {getPriorityBadge(selectedTicket.priority)}
 {(CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category) && (
 <Badge variant="secondary" className="text-xs">
 {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
 </Badge>
 )}
 </div>
 <div className="flex items-center gap-2">
 <Select value={selectedTicket.priority || 'medium'} onValueChange={(v) => updatePriority.mutate(v)}>
 <SelectTrigger className="w-auto min-w-[90px] h-7 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="low">Low</SelectItem>
 <SelectItem value="medium">Medium</SelectItem>
 <SelectItem value="high">High</SelectItem>
 <SelectItem value="urgent">Urgent</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <DrawerDescription className="sr-only">Ticket details</DrawerDescription>

 {/* Collapsible seller info */}
 <Collapsible>
 <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
 <Avatar className="h-5 w-5">
 <AvatarImage src={selectedTicket.profiles?.avatar_url || undefined} />
 <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
 {selectedTicket.profiles?.display_name?.charAt(0) || 'U'}
 </AvatarFallback>
 </Avatar>
 <span className="font-medium text-foreground">{selectedTicket.profiles?.display_name || 'Unknown'}</span>
 {selectedTicket.stores && (
 <>
 <span className="text-muted-foreground">\u00B7</span>
 <Store className="h-3.5 w-3.5" />
 <span>{selectedTicket.stores.name}</span>
 </>
 )}
 <ChevronDown className="h-3.5 w-3.5 ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
 </CollapsibleTrigger>
 <CollapsibleContent className="mt-2">
 <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg text-sm">
 <div>
 <Label className="text-xs text-muted-foreground">Email</Label>
 <p className="text-sm truncate">{selectedTicket.profiles?.email || '\u2014'}</p>
 </div>
 {selectedTicket.stores && (
 <div>
 <Label className="text-xs text-muted-foreground">Store ID</Label>
 <p className="text-xs font-mono">{selectedTicket.stores.store_id}</p>
 </div>
 )}
 <div>
 <Label className="text-xs text-muted-foreground">Discord</Label>
 <p className="text-sm">{selectedTicket.profiles?.discord_username || 'Not linked'}</p>
 </div>
 <div>
 <Label className="text-xs text-muted-foreground">Roblox</Label>
 <p className="text-sm">{selectedTicket.profiles?.roblox_username || 'Not linked'}</p>
 </div>
 {selectedTicket.profiles?.created_at && (
 <div>
 <Label className="text-xs text-muted-foreground">Member since</Label>
 <p className="text-sm">{format(new Date(selectedTicket.profiles.created_at), 'MMM yyyy')}</p>
 </div>
 )}
 </div>

 {/* Past tickets */}
 {sellerPastTickets && sellerPastTickets.length > 0 && (
 <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1.5">
 <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
 <History className="h-3 w-3" />
 Past Tickets ({sellerPastTickets.length})
 </p>
 {sellerPastTickets.map((pt) => (
 <div key={pt.id} className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-1.5">
 <Badge variant="outline" className="font-mono text-[10px] px-1 h-4">{pt.ticket_number}</Badge>
 <span className="truncate max-w-[150px]">{pt.subject}</span>
 </div>
 {getStatusBadge(pt.status)}
 </div>
 ))}
 </div>
 )}
 </CollapsibleContent>
 </Collapsible>
 </div>

 {/* Scrollable content */}
 <ScrollArea className="flex-1 min-h-0">
 <div className="px-4 py-3 space-y-4">
 {/* Original message */}
 <div className="border-l-2 border-border pl-3">
 <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
 {selectedTicket.category === 'account_link_change' && (
 <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
 <div className="flex items-center justify-between">
 <p className="text-xs font-medium text-muted-foreground">Account Link Change Request</p>
 <Button size="sm" variant="outline" onClick={() => applyLinkChange.mutate()} disabled={applyLinkChange.isPending}>
 <LinkIcon className="h-3 w-3 mr-1" />
 Apply Changes
 </Button>
 </div>
 {selectedTicket.new_discord_username && <p className="text-sm">New Discord: <span className="font-medium">{selectedTicket.new_discord_username}</span></p>}
 {selectedTicket.new_roblox_username && <p className="text-sm">New Roblox: <span className="font-medium">{selectedTicket.new_roblox_username}</span></p>}
 {selectedTicket.change_reason && <p className="text-sm">Reason: {selectedTicket.change_reason}</p>}
 </div>
 )}
 </div>

 {selectedTicket.resolution_notes && (
 <div className="border-l-2 border-green-500/50 pl-3">
 <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Resolution</p>
 <p className="text-sm">{selectedTicket.resolution_notes}</p>
 </div>
 )}

 {/* Messages with date grouping */}
 <div className="space-y-4">
 {groupedMessages.map((group) => (
 <div key={group.date} className="space-y-3">
 <div className="flex items-center gap-3">
 <Separator className="flex-1" />
 <span className="text-xs text-muted-foreground whitespace-nowrap">{group.date}</span>
 <Separator className="flex-1" />
 </div>

 {group.messages.map((msg) => (
 <div key={msg.id} className={cn('flex gap-2.5', msg.is_admin ? 'flex-row-reverse' : 'flex-row')}>
 <Avatar className="h-7 w-7 shrink-0 mt-1">
 {msg.is_admin ? (
 <AvatarFallback className="bg-green-500/20 text-green-500 text-xs">
 <Headphones className="h-3.5 w-3.5" />
 </AvatarFallback>
 ) : (
 <>
 <AvatarImage src={selectedTicket.profiles?.avatar_url || undefined} />
 <AvatarFallback className="bg-primary/20 text-primary text-xs">
 <User className="h-3.5 w-3.5" />
 </AvatarFallback>
 </>
 )}
 </Avatar>
 <div className={cn(
 'max-w-[80%] rounded-xl px-3.5 py-2.5',
 msg.is_admin
 ? 'bg-primary text-primary-foreground'
 : 'bg-muted'
 )}>
 <div className={cn(
 'text-xs mb-1 flex items-center gap-1.5',
 msg.is_admin ? 'text-primary-foreground/70' : 'text-muted-foreground'
 )}>
 <span className="font-medium">{msg.is_admin ? 'Staff' : 'Seller'}</span>
 <span>\u00B7</span>
 <span>{format(new Date(msg.created_at), 'h:mm a')}</span>
 </div>
 <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
 {msg.attachment_url && (
 <div className="mt-2">
 <AttachmentDisplay url={msg.attachment_url} bucket="seller-ticket-attachments" />
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 ))}
 </div>
 <div ref={messagesEndRef} />
 </div>
 </ScrollArea>

 {/* Sticky input */}
 {!['resolved', 'closed'].includes(selectedTicket.status) && (
 <div className="border-t px-4 py-3 space-y-2">
 {attachmentFile && (
 <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-1.5">
 <Paperclip className="h-3 w-3" />
 <span className="truncate flex-1">{attachmentFile.name}</span>
 <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAttachmentFile(null)}>
 <X className="h-3 w-3" />
 </Button>
 </div>
 )}
 <div className="flex gap-2">
 <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.zip,.rar,.txt,.doc,.docx" onChange={handleFileSelect} />
 <Button variant="outline" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()}>
 <Paperclip className="h-4 w-4" />
 </Button>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="outline" size="icon" className="shrink-0">
 <Zap className="h-4 w-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-64">
 <DropdownMenuLabel>Quick Replies</DropdownMenuLabel>
 <DropdownMenuSeparator />
 {CANNED_RESPONSES.map((resp) => (
 <DropdownMenuItem key={resp.label} onClick={() => insertCannedResponse(resp.text)}>
 <div>
 <div className="font-medium text-sm">{resp.label}</div>
 <div className="text-xs text-muted-foreground truncate max-w-[220px]">{resp.text}</div>
 </div>
 </DropdownMenuItem>
 ))}
 </DropdownMenuContent>
 </DropdownMenu>
 <Input
 placeholder="Type your message..."
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 onKeyDown={handleKeyDown}
 />
 <Button onClick={() => sendMessage.mutate()} disabled={(!newMessage.trim() && !attachmentFile) || sendMessage.isPending} className="shrink-0">
 {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
 </Button>
 </div>

 <div className="flex gap-2 flex-wrap">
 <Select value={selectedTicket.status} onValueChange={(val) => updateStatus.mutate(val)}>
 <SelectTrigger className="w-auto min-w-[140px] h-8 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="open">Open</SelectItem>
 <SelectItem value="in_progress">In Progress</SelectItem>
 <SelectItem value="awaiting_seller">Awaiting Seller</SelectItem>
 </SelectContent>
 </Select>
 <Button variant="outline" size="sm" className="text-green-600 h-8" onClick={() => setShowResolveDialog(true)}>
 <CheckCircle className="h-4 w-4 mr-1" />
 Resolve
 </Button>
 </div>
 </div>
 )}
 </>
 )}
 </DrawerContent>
 </Drawer>

 {/* Resolve Dialog */}
 <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Resolve Ticket</DialogTitle>
 <DialogDescription>Add resolution notes to close this ticket</DialogDescription>
 </DialogHeader>
 <div className="space-y-2">
 <Label>Resolution Notes</Label>
 <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Describe how the issue was resolved..." rows={4} />
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowResolveDialog(false)}>Cancel</Button>
 <Button onClick={() => resolveTicket.mutate()} disabled={!resolutionNotes.trim() || resolveTicket.isPending}>
 <CheckCircle className="h-4 w-4 mr-2" />
 Resolve Ticket
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </AdminLayout>
 );
}
