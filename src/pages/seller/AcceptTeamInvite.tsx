import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Users, LogIn, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type InviteStatus = 'loading' | 'valid' | 'expired' | 'already_member' | 'accepted' | 'error' | 'needs_auth' | 'wrong_email' | 'not_found';

interface InviteInfo {
 storeName: string;
 role: string;
 inviteId: string;
 storeId: string;
 invitedBy: string;
}

export default function AcceptTeamInvite() {
 const [searchParams] = useSearchParams();
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const token = searchParams.get('token');

 const [status, setStatus] = useState<InviteStatus>('loading');
 const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
 const [accepting, setAccepting] = useState(false);
 const [expectedEmail, setExpectedEmail] = useState<string | null>(null);

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
 const { data, error } = await supabase.rpc('validate_team_invite', {
 p_token: token,
 p_user_id: user.id,
 });

 if (error) {
 setStatus('error');
 return;
 }

 const result = data as { status: string; invite_id?: string; store_id?: string; store_name?: string; role?: string; invited_by?: string; expected_email?: string };

 switch (result.status) {
 case 'valid':
 setInviteInfo({
 storeName: result.store_name || 'Unknown Store',
 role: result.role || 'viewer',
 inviteId: result.invite_id || '',
 storeId: result.store_id || '',
 invitedBy: result.invited_by || '',
 });
 setStatus('valid');
 break;
 case 'expired':
 setStatus('expired');
 break;
 case 'wrong_email':
 setExpectedEmail(result.expected_email || null);
 setStatus('wrong_email');
 break;
 case 'already_member':
 setStatus('already_member');
 break;
 case 'not_found':
 setStatus('not_found');
 break;
 default:
 setStatus('error');
 }
 } catch {
 setStatus('error');
 }
 };

 const acceptInvite = async () => {
 if (!user || !inviteInfo) return;
 setAccepting(true);

 try {
 const { error: insertError } = await supabase
 .from('store_team_members')
 .insert({
 store_id: inviteInfo.storeId,
 user_id: user.id,
 role: inviteInfo.role as 'manager' | 'editor' | 'viewer',
 invited_by: inviteInfo.invitedBy,
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

 // Properly encode the redirect so the token query param is preserved
 const redirectPath = `/seller/team/accept?token=${token}`;
 const signInUrl = `/auth?redirect=${encodeURIComponent(redirectPath)}`;

 return (
 <div className="min-h-screen flex items-center justify-center bg-background p-4">
 <div className="border border-border rounded-xl overflow-hidden max-w-md w-full">
 <div className="px-4 py-3 border-b border-border bg-muted/30 text-center">
 <Users className="h-10 w-10 mx-auto text-primary mb-2" />
 <h3 className="font-semibold text-sm">Team Invitation</h3>
 <p className="text-xs text-muted-foreground mt-0.5">
 {status === 'loading' && 'Verifying your invitation...'}
 {status === 'needs_auth' && 'Sign in to accept this invitation'}
 {status === 'valid' && `You've been invited to join a store team`}
 {status === 'accepted' && 'Invitation accepted!'}
 {status === 'expired' && 'This invitation has expired'}
 {status === 'already_member' && "You're already a member of this team"}
 {status === 'wrong_email' && 'Email mismatch'}
 {status === 'not_found' && 'Invitation not found'}
 {status === 'error' && 'Invalid invitation'}
 </p>
 </div>
 <div className="p-4 space-y-4">
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
 <Link to={signInUrl}>
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
 <Button onClick={() => navigate('/seller')}>
 Go to Dashboard
 </Button>
 </div>
 )}

 {status === 'wrong_email' && (
 <div className="text-center space-y-4">
 <AlertTriangle className="h-12 w-12 mx-auto text-warning" />
 <p className="text-sm text-muted-foreground">
 This invitation was sent to a different email address{expectedEmail ? ` (${expectedEmail})` : ''}. Please sign in with the correct account.
 </p>
 <Button variant="outline" onClick={() => navigate('/auth')}>
 Switch Account
 </Button>
 </div>
 )}

 {status === 'not_found' && (
 <div className="text-center space-y-4">
 <XCircle className="h-12 w-12 mx-auto text-destructive" />
 <p className="text-sm text-muted-foreground">
 This invitation link is invalid or has already been used. Please ask the store owner to send a new one.
 </p>
 <Button variant="outline" onClick={() => navigate('/')}>
 Go Home
 </Button>
 </div>
 )}

 {status === 'expired' && (
 <div className="text-center space-y-4">
 <XCircle className="h-12 w-12 mx-auto text-destructive" />
 <p className="text-sm text-muted-foreground">
 This invitation has expired. Please ask the store owner to send a new one.
 </p>
 <Button variant="outline" onClick={() => navigate('/')}>
 Go Home
 </Button>
 </div>
 )}

 {status === 'error' && (
 <div className="text-center space-y-4">
 <XCircle className="h-12 w-12 mx-auto text-destructive" />
 <p className="text-sm text-muted-foreground">
 Something went wrong. The invitation link may be invalid.
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
 <Button variant="outline" onClick={() => navigate('/seller')}>
 Go to Dashboard
 </Button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
