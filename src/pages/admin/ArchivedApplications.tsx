import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Search, Eye, CheckCircle, XCircle, FileText } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } formatRelative } from '@/lib/dateUtils';

interface ArchivedApplication {
 id: string;
 position: string;
 applicant_name: string;
 applicant_email: string;
 discord_username: string | null;
 portfolio_url: string | null;
 experience: string | null;
 message: string;
 status: string;
 notes: string | null;
 reviewed_at: string | null;
 created_at: string;
}

export default function AdminArchivedApplications() {
 const [search, setSearch] = useState('');
 const [selectedApplication, setSelectedApplication] = useState<ArchivedApplication | null>(null);
 const [currentPage, setCurrentPage] = useState(1);
 const ITEMS_PER_PAGE = 25;

 // Fetch applications with pagination
 const { data: applicationsData, isLoading } = useQuery({
 queryKey: ['archived-applications', currentPage],
 queryFn: async () => {
 const from = (currentPage - 1) * ITEMS_PER_PAGE;
 const to = from + ITEMS_PER_PAGE - 1;

 const { data, error, count } = await supabase
 .from('job_applications')
 .select('id, position, applicant_name, applicant_email, discord_username, portfolio_url, experience, message, status, notes, reviewed_at, created_at', { count: 'exact' })
 .in('status', ['accepted', 'rejected'])
 .order('reviewed_at', { ascending: false })
 .range(from, to);
 
 if (error) throw error;
 return { applications: data as ArchivedApplication[], totalCount: count || 0 };
 },
 });

 const applications = applicationsData?.applications;
 const totalCount = applicationsData?.totalCount || 0;
 const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

 const filteredApplications = applications?.filter(app => {
 if (!search) return true;
 const searchLower = search.toLowerCase();
 return (
 app.applicant_name.toLowerCase().includes(searchLower) ||
 app.applicant_email.toLowerCase().includes(searchLower) ||
 app.position.toLowerCase().includes(searchLower)
 );
 });

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'accepted':
 return <Badge variant="secondary" className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
 case 'rejected':
 return <Badge variant="secondary" className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
 default:
 return <Badge variant="secondary">{status}</Badge>;
 }
 };

 const stats = {
 total: applications?.length || 0,
 accepted: applications?.filter(a => a.status === 'accepted').length || 0,
 rejected: applications?.filter(a => a.status === 'rejected').length || 0,
 };

 return (
 <AdminLayout requiredPermissions={['review_applications']}>
 <div className="space-y-4">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-4">
 <h3 className="font-semibold text-sm text-2xl sm:text-3xl font-display flex items-center gap-2">
 <Archive className="h-6 w-6" />
 Archived Applications
 </h3>
 <p className="text-xs text-muted-foreground mt-0.5">View completed job applications (accepted/rejected)</p>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-3 gap-3">
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 pt-6 text-center">
 <p className="text-2xl font-bold">{stats.total}</p>
 <p className="text-sm text-muted-foreground">Total Archived</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 pt-6 text-center">
 <p className="text-2xl font-bold text-green-400">{stats.accepted}</p>
 <p className="text-sm text-muted-foreground">Accepted</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 pt-6 text-center">
 <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
 <p className="text-sm text-muted-foreground">Rejected</p>
 </div>
 </div>
 </div>

 {/* Search */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 pt-6">
 <div className="relative w-full max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search archived applications..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-10"
 />
 </div>
 </div>
 </div>

 {/* Applications Table */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <FileText className="h-5 w-5" />
 Archived ({filteredApplications?.length || 0})
 </h3>
 </div>
 <div className="p-4">
 {isLoading ? (
 <p className="text-muted-foreground text-center py-8">Loading...</p>
 ) : filteredApplications?.length === 0 ? (
 <p className="text-muted-foreground text-center py-8">No archived applications</p>
 ) : (
 <>
 {/* Mobile Card View */}
 <div className="block md:hidden space-y-3">
 {filteredApplications?.map((app) => (
 <div key={app.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
 <div className="flex items-center justify-between">
 <p className="font-medium">{app.applicant_name}</p>
 {getStatusBadge(app.status)}
 </div>
 <p className="text-sm text-muted-foreground">{app.position}</p>
 <div className="flex items-center justify-between pt-2">
 <span className="text-xs text-muted-foreground">
 {app.reviewed_at && formatRelative(app.reviewed_at)}
 </span>
 <Button variant="outline" size="sm" onClick={() => setSelectedApplication(app)}>
 <Eye className="h-4 w-4 mr-1" /> View
 </Button>
 </div>
 </div>
 ))}
 </div>

 {/* Desktop Table View */}
 <div className="hidden md:block overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Applicant</TableHead>
 <TableHead>Position</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Reviewed</TableHead>
 <TableHead>Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredApplications?.map((app) => (
 <TableRow key={app.id}>
 <TableCell>
 <div>
 <p className="font-medium">{app.applicant_name}</p>
 <p className="text-sm text-muted-foreground">{app.applicant_email}</p>
 </div>
 </TableCell>
 <TableCell>{app.position}</TableCell>
 <TableCell>{getStatusBadge(app.status)}</TableCell>
 <TableCell>
 {app.reviewed_at && formatRelative(app.reviewed_at)}
 </TableCell>
 <TableCell>
 <Button variant="ghost" size="sm" onClick={() => setSelectedApplication(app)}>
 <Eye className="h-4 w-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 </>
 )}

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between pt-4">
 <p className="text-sm text-muted-foreground">
 Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
 </p>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
 <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Application Detail Dialog */}
 <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
 <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Application Details</DialogTitle>
 </DialogHeader>

 {selectedApplication && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold">{selectedApplication.applicant_name}</h3>
 {getStatusBadge(selectedApplication.status)}
 </div>

 <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
 <div>
 <p className="text-xs text-muted-foreground">Email</p>
 <p className="text-sm font-medium">{selectedApplication.applicant_email}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">Position</p>
 <p className="text-sm font-medium">{selectedApplication.position}</p>
 </div>
 {selectedApplication.discord_username && (
 <div>
 <p className="text-xs text-muted-foreground">Discord</p>
 <p className="text-sm font-medium">{selectedApplication.discord_username}</p>
 </div>
 )}
 {selectedApplication.portfolio_url && (
 <div>
 <p className="text-xs text-muted-foreground">Portfolio</p>
 <a 
 href={selectedApplication.portfolio_url} 
 target="_blank" 
 rel="noopener noreferrer"
 className="text-sm font-medium text-primary hover:underline"
 >
 View
 </a>
 </div>
 )}
 </div>

 {selectedApplication.experience && (
 <div>
 <h4 className="text-sm font-medium mb-1">Experience</h4>
 <p className="text-sm p-2 rounded bg-muted">{selectedApplication.experience}</p>
 </div>
 )}

 <div>
 <h4 className="text-sm font-medium mb-1">Application Message</h4>
 <p className="text-sm p-2 rounded bg-muted whitespace-pre-wrap">{selectedApplication.message}</p>
 </div>

 {selectedApplication.notes && (
 <div>
 <h4 className="text-sm font-medium mb-1">Staff Notes</h4>
 <p className="text-sm p-2 rounded bg-muted">{selectedApplication.notes}</p>
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 </AdminLayout>
 );
}
