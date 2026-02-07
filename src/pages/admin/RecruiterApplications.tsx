import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Clock, CheckCircle, XCircle, Loader2, User, Mail, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface RecruiterApplication {
  id: string;
  user_id: string;
  recruiter_id: string;
  display_name: string | null;
  discord_username: string | null;
  email: string | null;
  promotion_method: string;
  expected_servers: string | null;
  paypal_email: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export default function RecruiterApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<RecruiterApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch pending applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ['recruiter-applications-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruiter_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as RecruiterApplication[];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('recruiter_applications')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Application approved', description: 'Recruiter role has been assigned.' });
      queryClient.invalidateQueries({ queryKey: ['recruiter-applications-pending'] });
      queryClient.invalidateQueries({ queryKey: ['recruiter-stats'] });
      setSelectedApp(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase
        .from('recruiter_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Application rejected' });
      queryClient.invalidateQueries({ queryKey: ['recruiter-applications-pending'] });
      queryClient.invalidateQueries({ queryKey: ['recruiter-stats'] });
      setSelectedApp(null);
      setShowRejectDialog(false);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleReject = () => {
    if (!selectedApp) return;
    rejectMutation.mutate({ applicationId: selectedApp.id, reason: rejectionReason });
  };

  return (
    <AdminLayout requiredPermissions={['review_recruiter_applications']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruiter Applications</h1>
          <p className="text-muted-foreground">
            Review and approve new recruiter applications
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : applications && applications.length > 0 ? (
          <div className="grid gap-4">
            {applications.map((app) => (
              <Card key={app.id} className={selectedApp?.id === app.id ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{app.display_name || 'Unknown'}</CardTitle>
                        <CardDescription className="font-mono text-xs">{app.recruiter_id}</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{app.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>@{app.discord_username || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Promotion Method</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {app.promotion_method}
                    </p>
                  </div>

                  {app.expected_servers && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Expected Servers/Month</h4>
                      <p className="text-sm text-muted-foreground">{app.expected_servers}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">PayPal Email</h4>
                    <p className="text-sm text-muted-foreground">{app.paypal_email || 'Not provided'}</p>
                  </div>

                  {app.notes && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Additional Notes</h4>
                      <p className="text-sm text-muted-foreground">{app.notes}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Applied: {format(new Date(app.created_at), 'PPpp')}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => approveMutation.mutate(app.id)}
                      disabled={approveMutation.isPending}
                      className="flex-1"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        setSelectedApp(app);
                        setShowRejectDialog(true);
                      }}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pending applications</p>
                <p className="text-sm">All caught up!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this application. This will be shown to the applicant.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Reject Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
