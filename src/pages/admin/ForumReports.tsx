import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag, Search, MessageSquare, FileText, Check, X, Eye, Send } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface ForumReport {
  id: string;
  thread_id: string | null;
  post_id: string | null;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  staff_response: string | null;
  created_at: string;
  reporter?: { display_name: string | null; email: string };
  thread?: { title: string; slug: string };
  post?: { content: string };
}

export default function AdminForumReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<ForumReport | null>(null);
  const [staffResponse, setStaffResponse] = useState('');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['forum-reports', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('forum_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch related data separately
      const reporterIds = [...new Set(data.map(r => r.reporter_id))];
      const threadIds = [...new Set(data.filter(r => r.thread_id).map(r => r.thread_id))];
      const postIds = [...new Set(data.filter(r => r.post_id).map(r => r.post_id))];

      const [profilesRes, threadsRes, postsRes] = await Promise.all([
        reporterIds.length ? supabase.from('profiles').select('user_id, display_name, email').in('user_id', reporterIds) : { data: [] },
        threadIds.length ? supabase.from('forum_threads').select('id, title, slug').in('id', threadIds as string[]) : { data: [] },
        postIds.length ? supabase.from('forum_posts').select('id, content').in('id', postIds as string[]) : { data: [] },
      ]);

      const profilesMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p]));
      const threadsMap = Object.fromEntries((threadsRes.data || []).map(t => [t.id, t]));
      const postsMap = Object.fromEntries((postsRes.data || []).map(p => [p.id, p]));

      return data.map(report => ({
        ...report,
        reporter: profilesMap[report.reporter_id] || null,
        thread: report.thread_id ? threadsMap[report.thread_id] : null,
        post: report.post_id ? postsMap[report.post_id] : null,
      })) as ForumReport[];
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, response }: { id: string; status: string; response?: string }) => {
      const { error } = await supabase
        .from('forum_reports')
        .update({
          status,
          staff_response: response || null,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-reports'] });
      toast.success('Report updated');
      setSelectedReport(null);
      setStaffResponse('');
    },
    onError: () => {
      toast.error('Failed to update report');
    },
  });

  const handleResolve = (status: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;
    updateReportMutation.mutate({
      id: selectedReport.id,
      status,
      response: staffResponse,
    });
  };

  const filteredReports = reports?.filter(report => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      report.reason.toLowerCase().includes(searchLower) ||
      report.reporter?.display_name?.toLowerCase().includes(searchLower) ||
      report.reporter?.email.toLowerCase().includes(searchLower) ||
      report.thread?.title.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Dismissed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = {
    pending: reports?.filter(r => r.status === 'pending').length || 0,
    resolved: reports?.filter(r => r.status === 'resolved').length || 0,
    dismissed: reports?.filter(r => r.status === 'dismissed').length || 0,
  };

  return (
    <AdminLayout requiredRoles={['admin', 'support_agent']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-display flex items-center gap-2">
              <Flag className="h-6 w-6" />
              Forum Reports
            </CardTitle>
            <CardDescription>Review and respond to user-reported forum content</CardDescription>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.dismissed}</p>
              <p className="text-sm text-muted-foreground">Dismissed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Reports ({filteredReports?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading reports...</p>
            ) : filteredReports?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No reports found</p>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3">
                  {filteredReports?.map((report) => (
                    <div key={report.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {report.thread_id ? <FileText className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                          <span className="text-sm font-medium">
                            {report.thread_id ? 'Thread Report' : 'Post Report'}
                          </span>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-sm">{report.reason}</p>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
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
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reported</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports?.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {report.thread_id ? <FileText className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                              <span>{report.thread_id ? 'Thread' : 'Post'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{report.reason}</TableCell>
                          <TableCell>{report.reporter?.display_name || report.reporter?.email}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)}>
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
          </CardContent>
        </Card>
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="font-medium">{selectedReport.thread_id ? 'Thread' : 'Post'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reporter</span>
                  <span className="font-medium">
                    {selectedReport.reporter?.display_name || selectedReport.reporter?.email}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Reason</h4>
                <p className="text-sm p-2 rounded bg-muted">{selectedReport.reason}</p>
              </div>

              {selectedReport.details && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Additional Details</h4>
                  <p className="text-sm p-2 rounded bg-muted">{selectedReport.details}</p>
                </div>
              )}

              {selectedReport.thread?.title && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Reported Thread</h4>
                  <p className="text-sm p-2 rounded bg-muted">{selectedReport.thread.title}</p>
                </div>
              )}

              {selectedReport.post?.content && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Reported Post Content</h4>
                  <p className="text-sm p-2 rounded bg-muted line-clamp-4">{selectedReport.post.content}</p>
                </div>
              )}

              {selectedReport.status === 'pending' ? (
                <>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Staff Response (Optional)</h4>
                    <Textarea
                      value={staffResponse}
                      onChange={(e) => setStaffResponse(e.target.value)}
                      placeholder="Add a response to the reporter..."
                      rows={3}
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleResolve('dismissed')}
                      disabled={updateReportMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" /> Dismiss
                    </Button>
                    <Button
                      onClick={() => handleResolve('resolved')}
                      disabled={updateReportMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" /> Resolve
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                selectedReport.staff_response && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Staff Response</h4>
                    <p className="text-sm p-2 rounded bg-muted">{selectedReport.staff_response}</p>
                  </div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
