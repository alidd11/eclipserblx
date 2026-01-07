import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Shield, UserPlus, UserMinus, Filter } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', 'user_roles', search, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('resource', 'user_roles')
        .order('created_at', { ascending: false });

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Get admin profiles to show who made the changes
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-for-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, display_name, email');
      if (error) throw error;
      return data;
    },
  });

  const getAdminName = (userId: string) => {
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.display_name || profile?.email || 'Unknown';
  };

  const filteredLogs = logs?.filter(log => {
    if (!search) return true;
    const details = log.details as { target_email?: string; role?: string } | null;
    const targetEmail = details?.target_email || '';
    const role = details?.role || '';
    const adminName = getAdminName(log.user_id);
    return (
      targetEmail.toLowerCase().includes(search.toLowerCase()) ||
      role.toLowerCase().includes(search.toLowerCase()) ||
      adminName.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-display">Role Change Audit Logs</CardTitle>
            <CardDescription>Track all role additions and removals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, role, or admin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-background">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="role_added">Role Added</SelectItem>
                  <SelectItem value="role_removed">Role Removed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : filteredLogs?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No audit logs found</p>
              ) : (
                filteredLogs?.map((log) => {
                  const details = log.details as { target_email?: string; role?: string } | null;
                  const isAdded = log.action === 'role_added';
                  return (
                    <div key={log.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={isAdded ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}>
                          {isAdded ? <UserPlus className="h-3 w-3 mr-1" /> : <UserMinus className="h-3 w-3 mr-1" />}
                          {isAdded ? 'Added' : 'Removed'}
                        </Badge>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          <Shield className="h-3 w-3 mr-1" />
                          {details?.role || 'Unknown'}
                        </Badge>
                      </div>
                      <p className="text-sm truncate">{details?.target_email || 'Unknown'}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>by {getAdminName(log.user_id)}</span>
                        <span>{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Action</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs found</TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log) => {
                      const details = log.details as { target_email?: string; role?: string } | null;
                      const isAdded = log.action === 'role_added';
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline" className={isAdded ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}>
                              {isAdded ? <UserPlus className="h-3 w-3 mr-1" /> : <UserMinus className="h-3 w-3 mr-1" />}
                              {isAdded ? 'Added' : 'Removed'}
                            </Badge>
                          </TableCell>
                          <TableCell><span className="text-sm">{details?.target_email || 'Unknown'}</span></TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              <Shield className="h-3 w-3 mr-1" />
                              {details?.role || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{getAdminName(log.user_id)}</span></TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span></TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
