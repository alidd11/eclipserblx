import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Shield, Trash2, Search, RefreshCw, Clock, User, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';

interface IpBan {
  id: string;
  ip_address: string;
  reason: string | null;
  banned_by: string;
  user_id: string | null;
  created_at: string;
  expires_at: string | null;
  banned_by_profile?: {
    display_name: string | null;
    email: string;
  } | null;
  banned_user_profile?: {
    display_name: string | null;
    email: string;
  } | null;
}

export default function IpBans() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: bans, isLoading, refetch } = useQuery({
    queryKey: ['ip-bans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_bans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for banned_by and user_id
      const bansWithProfiles: IpBan[] = await Promise.all(
        (data || []).map(async (ban) => {
          let banned_by_profile = null;
          let banned_user_profile = null;

          if (ban.banned_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, email')
              .eq('user_id', ban.banned_by)
              .single();
            banned_by_profile = profile;
          }

          if (ban.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, email')
              .eq('user_id', ban.user_id)
              .single();
            banned_user_profile = profile;
          }

          return {
            ...ban,
            banned_by_profile,
            banned_user_profile,
          };
        })
      );

      return bansWithProfiles;
    },
  });

  const removeBanMutation = useMutation({
    mutationFn: async (banId: string) => {
      const { error } = await supabase
        .from('ip_bans')
        .delete()
        .eq('id', banId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-bans'] });
      showSuccessNotification('Ban Removed', 'IP address has been unbanned');
    },
    onError: (error) => {
      showErrorNotification('Remove Failed', error.message);
    },
  });

  const filteredBans = bans?.filter((ban) => {
    const query = searchQuery.toLowerCase();
    return (
      ban.ip_address.toLowerCase().includes(query) ||
      ban.reason?.toLowerCase().includes(query) ||
      ban.banned_by_profile?.display_name?.toLowerCase().includes(query) ||
      ban.banned_by_profile?.email.toLowerCase().includes(query) ||
      ban.banned_user_profile?.display_name?.toLowerCase().includes(query) ||
      ban.banned_user_profile?.email.toLowerCase().includes(query)
    );
  });

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const activeBans = filteredBans?.filter(ban => !isExpired(ban.expires_at)) || [];
  const expiredBans = filteredBans?.filter(ban => isExpired(ban.expires_at)) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IP Bans</h1>
            <p className="text-muted-foreground">
              Manage banned IP addresses and view ban history
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bans</CardTitle>
              <Ban className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBans.length}</div>
              <p className="text-xs text-muted-foreground">Currently enforced</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Bans</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiredBans.length}</div>
              <p className="text-xs text-muted-foreground">Historical records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bans</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bans?.length || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by IP, reason, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Active Bans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Active Bans
            </CardTitle>
            <CardDescription>
              Currently enforced IP bans
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : activeBans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active bans found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Banned User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Banned By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBans.map((ban) => (
                    <TableRow key={ban.id}>
                      <TableCell className="font-mono text-sm">
                        {ban.ip_address}
                      </TableCell>
                      <TableCell>
                        {ban.banned_user_profile ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{ban.banned_user_profile.display_name || ban.banned_user_profile.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ban.reason || <span className="text-muted-foreground">No reason provided</span>}
                      </TableCell>
                      <TableCell>
                        {ban.banned_by_profile?.display_name || ban.banned_by_profile?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ban.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {ban.expires_at ? (
                          <Badge variant="outline">
                            {format(new Date(ban.expires_at), 'MMM d, yyyy')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Permanent</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove IP Ban</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove the ban for IP address{' '}
                                <span className="font-mono font-semibold">{ban.ip_address}</span>?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeBanMutation.mutate(ban.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove Ban
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Expired Bans / History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Ban History
            </CardTitle>
            <CardDescription>
              Expired bans for reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : expiredBans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No expired bans in history
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Banned User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Banned By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expired</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredBans.map((ban) => (
                    <TableRow key={ban.id} className="opacity-60">
                      <TableCell className="font-mono text-sm">
                        {ban.ip_address}
                      </TableCell>
                      <TableCell>
                        {ban.banned_user_profile ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{ban.banned_user_profile.display_name || ban.banned_user_profile.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ban.reason || <span className="text-muted-foreground">No reason provided</span>}
                      </TableCell>
                      <TableCell>
                        {ban.banned_by_profile?.display_name || ban.banned_by_profile?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ban.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {format(new Date(ban.expires_at!), 'MMM d, yyyy')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Ban Record</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this historical ban record?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeBanMutation.mutate(ban.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Record
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
