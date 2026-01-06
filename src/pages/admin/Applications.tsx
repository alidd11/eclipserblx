import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, Eye, FileText, Clock, CheckCircle, XCircle, ExternalLink, User, Mail, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface JobApplication {
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
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  reviewing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  reviewing: <Eye className="h-3 w-3" />,
  accepted: <CheckCircle className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
};

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [notes, setNotes] = useState('');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['job-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as JobApplication[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('job_applications')
        .update({ 
          status, 
          notes: notes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application updated');
      setSelectedApplication(null);
    },
    onError: () => {
      toast.error('Failed to update application');
    },
  });

  const filteredApplications = applications?.filter(app => {
    const matchesSearch = 
      app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications?.length || 0,
    pending: applications?.filter(a => a.status === 'pending').length || 0,
    reviewing: applications?.filter(a => a.status === 'reviewing').length || 0,
    accepted: applications?.filter(a => a.status === 'accepted').length || 0,
    rejected: applications?.filter(a => a.status === 'rejected').length || 0,
  };

  const handleUpdateStatus = (status: string) => {
    if (selectedApplication) {
      updateStatusMutation.mutate({ 
        id: selectedApplication.id, 
        status,
        notes 
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Job Applications</h1>
          <p className="text-muted-foreground">Review and manage job applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.reviewing}</p>
              <p className="text-sm text-muted-foreground">Reviewing</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.accepted}</p>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
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
                  placeholder="Search by name, email, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Applications ({filteredApplications?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading applications...</p>
            ) : filteredApplications?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No applications found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>
                        <Badge className={statusColors[app.status] || ''} variant="outline">
                          <span className="flex items-center gap-1">
                            {statusIcons[app.status]}
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(app.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedApplication(app);
                            setNotes(app.notes || '');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Application Detail Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Review the application and update status
              </DialogDescription>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-6">
                {/* Applicant Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedApplication.applicant_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedApplication.applicant_email}</p>
                    </div>
                  </div>
                </div>

                {selectedApplication.discord_username && (
                  <div>
                    <p className="text-sm text-muted-foreground">Discord</p>
                    <p className="font-medium">{selectedApplication.discord_username}</p>
                  </div>
                )}

                {selectedApplication.portfolio_url && (
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio</p>
                    <a 
                      href={selectedApplication.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {selectedApplication.portfolio_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Position</p>
                  <Badge variant="secondary">{selectedApplication.position}</Badge>
                </div>

                {selectedApplication.experience && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Experience</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedApplication.experience}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Application Message
                  </p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                    {selectedApplication.message}
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Internal Notes</p>
                  <Textarea
                    placeholder="Add notes about this application..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('reviewing')}
                    disabled={updateStatusMutation.isPending}
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Mark Reviewing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('accepted')}
                    disabled={updateStatusMutation.isPending}
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={updateStatusMutation.isPending}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}