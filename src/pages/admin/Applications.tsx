import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, Search, User, Mail, Calendar, ExternalLink, 
  MessageSquare, CheckCircle, XCircle, Clock, Eye, Send, Users, Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApplicantMessage {
  id: string;
  application_id: string;
  subject: string;
  message: string;
  sent_by: string | null;
  is_read: boolean;
  created_at: string;
}

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [notes, setNotes] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  
  // Mass messaging state
  const [showMassMessage, setShowMassMessage] = useState(false);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [massMessageSubject, setMassMessageSubject] = useState('');
  const [massMessageBody, setMassMessageBody] = useState('');
  const [massMessageStatusFilter, setMassMessageStatusFilter] = useState('all');

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

  const { data: applicationMessages } = useQuery({
    queryKey: ['application-messages', selectedApplication?.id],
    queryFn: async () => {
      if (!selectedApplication) return [];
      const { data, error } = await supabase
        .from('applicant_messages')
        .select('*')
        .eq('application_id', selectedApplication.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ApplicantMessage[];
    },
    enabled: !!selectedApplication,
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
    },
    onError: () => {
      toast.error('Failed to update application');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ applicationId, subject, message }: { applicationId: string; subject: string; message: string }) => {
      const { error } = await supabase
        .from('applicant_messages')
        .insert([{
          application_id: applicationId,
          subject,
          message,
          sent_by: user?.id,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-messages', selectedApplication?.id] });
      toast.success('Message sent to applicant');
      setMessageSubject('');
      setMessageBody('');
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  const sendMassMessageMutation = useMutation({
    mutationFn: async ({ applicationIds, subject, message }: { applicationIds: string[]; subject: string; message: string }) => {
      const messages = applicationIds.map(appId => ({
        application_id: appId,
        subject,
        message,
        sent_by: user?.id,
      }));
      
      const { error } = await supabase
        .from('applicant_messages')
        .insert(messages);
      
      if (error) throw error;
      return applicationIds.length;
    },
    onSuccess: (count) => {
      toast.success(`Message sent to ${count} applicant${count > 1 ? 's' : ''}`);
      setShowMassMessage(false);
      setMassMessageSubject('');
      setMassMessageBody('');
      setSelectedApplicationIds([]);
    },
    onError: () => {
      toast.error('Failed to send mass message');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'reviewing':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400"><Eye className="h-3 w-3 mr-1" />Reviewing</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSendMessage = () => {
    if (!selectedApplication || !messageSubject || !messageBody) {
      toast.error('Please fill in subject and message');
      return;
    }
    sendMessageMutation.mutate({
      applicationId: selectedApplication.id,
      subject: messageSubject,
      message: messageBody,
    });
  };

  const handleSendMassMessage = () => {
    if (selectedApplicationIds.length === 0 || !massMessageSubject || !massMessageBody) {
      toast.error('Please select applicants and fill in subject and message');
      return;
    }
    sendMassMessageMutation.mutate({
      applicationIds: selectedApplicationIds,
      subject: massMessageSubject,
      message: massMessageBody,
    });
  };

  const toggleApplicationSelection = (id: string) => {
    setSelectedApplicationIds(prev => 
      prev.includes(id) 
        ? prev.filter(appId => appId !== id)
        : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (!filteredApplications) return;
    const allIds = filteredApplications.map(app => app.id);
    const allSelected = allIds.every(id => selectedApplicationIds.includes(id));
    
    if (allSelected) {
      setSelectedApplicationIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedApplicationIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const getApplicationsForMassMessage = () => {
    if (!applications) return [];
    if (massMessageStatusFilter === 'all') return applications;
    return applications.filter(app => app.status === massMessageStatusFilter);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Job Applications</h1>
            <p className="text-muted-foreground">Review and manage job applications</p>
          </div>
          <Button 
            onClick={() => setShowMassMessage(true)}
            variant="outline"
            className="gap-2"
          >
            <Megaphone className="h-4 w-4" />
            Mass Message
          </Button>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={filteredApplications?.length > 0 && filteredApplications.every(app => selectedApplicationIds.includes(app.id))}
                          onCheckedChange={selectAllFiltered}
                        />
                      </TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications?.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedApplicationIds.includes(app.id)}
                            onCheckedChange={() => toggleApplicationSelection(app.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.applicant_name}</p>
                            <p className="text-sm text-muted-foreground">{app.applicant_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{app.position}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(app);
                              setNotes(app.notes || '');
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Detail Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Review application and send messages to the applicant.
              </DialogDescription>
            </DialogHeader>

            {selectedApplication && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="messages">
                    Messages
                    {applicationMessages && applicationMessages.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{applicationMessages.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {selectedApplication.applicant_name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {selectedApplication.applicant_email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Position</Label>
                      <p className="font-medium">{selectedApplication.position}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Applied</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(selectedApplication.created_at).toLocaleString()}
                      </p>
                    </div>
                    {selectedApplication.discord_username && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Discord</Label>
                        <p className="font-medium">{selectedApplication.discord_username}</p>
                      </div>
                    )}
                    {selectedApplication.portfolio_url && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Portfolio</Label>
                        <a 
                          href={selectedApplication.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-primary flex items-center gap-1 hover:underline"
                        >
                          View Portfolio <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {selectedApplication.experience && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Experience</Label>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{selectedApplication.experience}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Message</Label>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{selectedApplication.message}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Internal Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add internal notes about this application..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Update Status</Label>
                    <div className="flex gap-2 flex-wrap">
                      {['pending', 'reviewing', 'accepted', 'rejected'].map((status) => (
                        <Button
                          key={status}
                          variant={selectedApplication.status === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            updateStatusMutation.mutate({ 
                              id: selectedApplication.id, 
                              status,
                              notes 
                            });
                            setSelectedApplication({ ...selectedApplication, status, notes });
                          }}
                          disabled={updateStatusMutation.isPending}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="messages" className="space-y-4 mt-4">
                  {/* Send new message */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Send Message to Applicant
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input
                          value={messageSubject}
                          onChange={(e) => setMessageSubject(e.target.value)}
                          placeholder="Message subject..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                          placeholder="Type your message to the applicant..."
                          rows={4}
                        />
                      </div>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending || !messageSubject || !messageBody}
                      >
                        {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Message history */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message History
                    </h4>
                    {applicationMessages?.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No messages sent yet.</p>
                    ) : (
                      applicationMessages?.map((msg) => (
                        <div key={msg.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{msg.subject}</span>
                            <div className="flex items-center gap-2">
                              {msg.is_read && (
                                <Badge variant="outline" className="text-xs">Read</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Mass Message Dialog */}
        <Dialog open={showMassMessage} onOpenChange={setShowMassMessage}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Send Mass Message
              </DialogTitle>
              <DialogDescription>
                Send a message to multiple applicants at once. Use this to notify applicants about decisions or updates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Filter by Status</Label>
                <Select value={massMessageStatusFilter} onValueChange={setMassMessageStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Applicants ({applications?.length || 0})</SelectItem>
                    <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
                    <SelectItem value="reviewing">Reviewing ({stats.reviewing})</SelectItem>
                    <SelectItem value="accepted">Accepted ({stats.accepted})</SelectItem>
                    <SelectItem value="rejected">Rejected ({stats.rejected})</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  <Users className="h-3 w-3 inline mr-1" />
                  {getApplicationsForMassMessage().length} applicant{getApplicationsForMassMessage().length !== 1 ? 's' : ''} will receive this message
                </p>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  value={massMessageSubject}
                  onChange={(e) => setMassMessageSubject(e.target.value)}
                  placeholder="e.g., Application Status Update"
                />
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={massMessageBody}
                  onChange={(e) => setMassMessageBody(e.target.value)}
                  placeholder="Type your message to all selected applicants..."
                  rows={5}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowMassMessage(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const targetApps = getApplicationsForMassMessage();
                    if (targetApps.length === 0) {
                      toast.error('No applicants match the selected filter');
                      return;
                    }
                    sendMassMessageMutation.mutate({
                      applicationIds: targetApps.map(a => a.id),
                      subject: massMessageSubject,
                      message: massMessageBody,
                    });
                  }}
                  disabled={sendMassMessageMutation.isPending || !massMessageSubject || !massMessageBody}
                >
                  {sendMassMessageMutation.isPending ? 'Sending...' : `Send to ${getApplicationsForMassMessage().length} Applicant${getApplicationsForMassMessage().length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
