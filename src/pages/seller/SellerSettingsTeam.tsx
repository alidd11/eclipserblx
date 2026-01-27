import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  Trash2, 
  Shield,
  Eye,
  Pencil,
  Crown,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useFormPersistence } from '@/hooks/useFormPersistence';

type TeamRole = 'manager' | 'editor' | 'viewer';

interface TeamMember {
  id: string;
  user_id: string;
  role: TeamRole;
  invited_at: string;
  accepted_at: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

interface TeamInvite {
  id: string;
  email: string;
  role: TeamRole;
  expires_at: string;
  created_at: string;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  manager: 'Manager',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  manager: 'Can manage products, orders, and team settings',
  editor: 'Can edit products and view orders',
  viewer: 'Can only view store data',
};

const ROLE_ICONS: Record<TeamRole, typeof Shield> = {
  manager: Shield,
  editor: Pencil,
  viewer: Eye,
};

const ROLE_COLORS: Record<TeamRole, string> = {
  manager: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  editor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  viewer: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const INITIAL_INVITE_DATA = {
  email: '',
  role: 'viewer' as TeamRole,
};

export default function SellerSettingsTeam() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  
  const [inviteData, setInviteData, clearInviteData] = useFormPersistence(
    'seller-team-invite',
    INITIAL_INVITE_DATA
  );
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<TeamInvite | null>(null);

  // Fetch team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['store-team-members', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('store_team_members')
        .select('*')
        .eq('store_id', store.id)
        .order('invited_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles for each team member
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, email')
            .eq('user_id', member.user_id)
            .single();
          
          return {
            ...member,
            profile,
          } as TeamMember;
        })
      );
      
      return membersWithProfiles;
    },
    enabled: !!store?.id,
  });

  // Fetch pending invites
  const { data: pendingInvites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['store-team-invites', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('store_team_invites')
        .select('*')
        .eq('store_id', store.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TeamInvite[];
    },
    enabled: !!store?.id,
  });

  // Send invite mutation
  const sendInvite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: TeamRole }) => {
      if (!store?.id) throw new Error('No store found');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('store_team_invites')
        .insert({
          store_id: store.id,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
        });
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('An invite has already been sent to this email');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully');
      clearInviteData();
      queryClient.invalidateQueries({ queryKey: ['store-team-invites'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  // Remove team member mutation
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('store_team_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Team member removed');
      setMemberToRemove(null);
      queryClient.invalidateQueries({ queryKey: ['store-team-members'] });
    },
    onError: () => {
      toast.error('Failed to remove team member');
    },
  });

  // Cancel invite mutation
  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('store_team_invites')
        .delete()
        .eq('id', inviteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation cancelled');
      setInviteToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['store-team-invites'] });
    },
    onError: () => {
      toast.error('Failed to cancel invitation');
    },
  });

  // Update member role mutation
  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: TeamRole }) => {
      const { error } = await supabase
        .from('store_team_members')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['store-team-members'] });
    },
    onError: () => {
      toast.error('Failed to update role');
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    sendInvite.mutate({ email: inviteData.email, role: inviteData.role });
  };

  const isLoading = membersLoading || invitesLoading;

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            Invite and manage team members who can help run your store
          </p>
        </div>

        {/* Invite Team Member */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Send an invitation to add someone to your store team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr,auto,auto]">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="teammate@example.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteData.role} onValueChange={(v) => setInviteData({ ...inviteData, role: v as TeamRole })}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as TeamRole[]).map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const Icon = ROLE_ICONS[role];
                              return <Icon className="h-3.5 w-3.5" />;
                            })()}
                            {ROLE_LABELS[role]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={sendInvite.isPending}>
                    <Mail className="h-4 w-4 mr-2" />
                    {sendInvite.isPending ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p className="font-medium mb-1">Role Permissions:</p>
                <ul className="space-y-1">
                  {(Object.keys(ROLE_DESCRIPTIONS) as TeamRole[]).map((role) => (
                    <li key={role} className="flex items-center gap-2">
                      <Badge variant="outline" className={ROLE_COLORS[role]}>
                        {ROLE_LABELS[role]}
                      </Badge>
                      <span>{ROLE_DESCRIPTIONS[role]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Current Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Team ({teamMembers.length})
            </CardTitle>
            <CardDescription>
              People who have access to your store
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading team members...
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No team members yet</p>
                <p className="text-sm text-muted-foreground">
                  Invite someone above to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(member.profile?.display_name || member.profile?.email || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.profile?.display_name || member.profile?.email || 'Unknown User'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Joined {format(new Date(member.accepted_at || member.invited_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={member.role}
                        onValueChange={(role) => updateMemberRole.mutate({ 
                          memberId: member.id, 
                          role: role as TeamRole 
                        })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as TeamRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setMemberToRemove(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations ({pendingInvites.length})
              </CardTitle>
              <CardDescription>
                Invitations that haven't been accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(invite.expires_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={ROLE_COLORS[invite.role]}>
                        {ROLE_LABELS[invite.role]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setInviteToCancel(invite)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-primary">Team Member Access</p>
                <p className="text-sm text-muted-foreground">
                  Team members will receive an email invitation. Once they accept and sign in, 
                  they'll be able to access your store based on their assigned role. You can 
                  change roles or remove access at any time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium">
                {memberToRemove?.profile?.display_name || memberToRemove?.profile?.email}
              </span>{' '}
              from your team? They will lose access to your store immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => memberToRemove && removeMember.mutate(memberToRemove.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invite Dialog */}
      <AlertDialog open={!!inviteToCancel} onOpenChange={() => setInviteToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{' '}
              <span className="font-medium">{inviteToCancel?.email}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => inviteToCancel && cancelInvite.mutate(inviteToCancel.id)}
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SellerLayout>
  );
}
