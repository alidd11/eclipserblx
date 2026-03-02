import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Users, LogIn } from 'lucide-react';
import { toast } from 'sonner';

type InviteStatus = 'loading' | 'valid' | 'expired' | 'already_member' | 'accepted' | 'error' | 'needs_auth';

interface InviteInfo {
  storeName: string;
  role: string;
  inviteId: string;
  storeId: string;
}

export default function AcceptTeamInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setStatus('error');
      return;
    }
    if (!user) {
      setStatus('needs_auth');
      return;
    }
    validateInvite();
  }, [token, user, authLoading]);

  const validateInvite = async () => {
    if (!token || !user) return;
    setStatus('loading');

    try {
      // Look up invite by token
      const { data: invite, error } = await supabase
        .from('store_team_invites')
        .select('id, store_id, email, role, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (error || !invite) {
        setStatus('expired');
        return;
      }

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      // Check if user email matches
      if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        setStatus('error');
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('store_team_members')
        .select('id')
        .eq('store_id', invite.store_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setStatus('already_member');
        return;
      }

      // Get store name for display
      const { data: store } = await supabase
        .from('stores')
        .select('name')
        .eq('id', invite.store_id)
        .single();

      setInviteInfo({
        storeName: store?.name || 'Unknown Store',
        role: invite.role,
        inviteId: invite.id,
        storeId: invite.store_id,
      });
      setStatus('valid');
    } catch {
      setStatus('error');
    }
  };

  const acceptInvite = async () => {
    if (!user || !inviteInfo) return;
    setAccepting(true);

    try {
      // Insert team member
      const { error: insertError } = await supabase
        .from('store_team_members')
        .insert({
          store_id: inviteInfo.storeId,
          user_id: user.id,
          role: inviteInfo.role as 'manager' | 'editor' | 'viewer',
          invited_by: user.id,
          accepted_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Delete the invite
      await supabase
        .from('store_team_invites')
        .delete()
        .eq('id', inviteInfo.inviteId);

      setStatus('accepted');
      toast.success(`You've joined ${inviteInfo.storeName}!`);
    } catch {
      toast.error('Failed to accept invitation');
      setStatus('error');
    } finally {
      setAccepting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    manager: 'Manager',
    editor: 'Editor',
    viewer: 'Viewer',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Users className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Verifying your invitation...'}
            {status === 'needs_auth' && 'Sign in to accept this invitation'}
            {status === 'valid' && `You've been invited to join a store team`}
            {status === 'accepted' && 'Invitation accepted!'}
            {status === 'expired' && 'This invitation has expired'}
            {status === 'already_member' && "You're already a member of this team"}
            {status === 'error' && 'Invalid invitation'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === 'needs_auth' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Please sign in with the email address that received this invitation.
              </p>
              <Button asChild>
                <Link to={`/auth?redirect=/seller/team/accept?token=${token}`}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          )}

          {status === 'valid' && inviteInfo && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Store</span>
                  <span className="font-medium">{inviteInfo.storeName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{roleLabels[inviteInfo.role] || inviteInfo.role}</span>
                </div>
              </div>
              <Button className="w-full" onClick={acceptInvite} disabled={accepting}>
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            </div>
          )}

          {status === 'accepted' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                You now have access to <strong>{inviteInfo?.storeName}</strong>.
              </p>
              <Button onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
            </div>
          )}

          {(status === 'expired' || status === 'error') && (
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-sm text-muted-foreground">
                {status === 'expired'
                  ? 'This invitation has expired or has already been used. Please ask the store owner to send a new one.'
                  : 'This invitation link is invalid or was not sent to your email address.'}
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Home
              </Button>
            </div>
          )}

          {status === 'already_member' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                You're already a member of this store team.
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
