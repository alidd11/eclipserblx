import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Shield, UserPlus, UserMinus, Filter, Ban, Wifi, Trash2, Eye } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

type AuditLog = {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('roles');

  // Fetch all audit logs
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ['audit-logs-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Get profiles to show who made the changes
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-for-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, display_name, email');
      if (error) throw error;
      return data;
    },
  });

  const getAdminName = (userId: string) => {
    if (userId === '00000000-0000-0000-0000-000000000000') return 'System';
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.display_name || profile?.email || 'Unknown';
  };

  // Filter logs by category
  const roleLogs = allLogs?.filter(log => log.resource === 'user_roles') || [];
  const vpnLogs = allLogs?.filter(log => log.action === 'vpn_signup_blocked') || [];
  const ipBanLogs = allLogs?.filter(log => 
    log.action === 'ip_banned' || log.action === 'ip_unbanned'
  ) || [];
  const accountLogs = allLogs?.filter(log => 
    log.action === 'account_deleted' || log.action === 'user_deleted'
  ) || [];
  const incomeLogs = allLogs?.filter(log => log.action === 'income_viewed') || [];

  // Search filter function
  const filterBySearch = (logs: AuditLog[]) => {
    if (!search) return logs;
    return logs.filter(log => {
      const details = log.details as Record<string, string> | null;
      const searchLower = search.toLowerCase();
      return (
        (details?.target_email?.toLowerCase().includes(searchLower)) ||
        (details?.role?.toLowerCase().includes(searchLower)) ||
        (details?.ip?.toLowerCase().includes(searchLower)) ||
        (details?.reason?.toLowerCase().includes(searchLower)) ||
        (log.ip_address?.toLowerCase().includes(searchLower)) ||
        getAdminName(log.user_id).toLowerCase().includes(searchLower)
      );
    });
  };

  const renderRoleLogsTable = (logs: AuditLog[]) => (
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
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs found</TableCell>
          </TableRow>
        ) : (
          logs.map((log) => {
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
  );

  const renderVpnLogsTable = (logs: AuditLog[]) => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Status</TableHead>
          <TableHead>IP Address</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>ISP</TableHead>
          <TableHead>Date & Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No VPN blocks recorded</TableCell>
          </TableRow>
        ) : (
          logs.map((log) => {
            const details = log.details as { country?: string; city?: string; isp?: string; proxy?: boolean; hosting?: boolean } | null;
            return (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                    <Wifi className="h-3 w-3 mr-1" />
                    Blocked
                  </Badge>
                </TableCell>
                <TableCell><span className="text-sm font-mono">{log.ip_address || 'Unknown'}</span></TableCell>
                <TableCell>
                  <span className="text-sm">
                    {details?.city && details?.country ? `${details.city}, ${details.country}` : details?.country || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{details?.isp || 'Unknown'}</span></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span></TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  const renderIpBanLogsTable = (logs: AuditLog[]) => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Action</TableHead>
          <TableHead>IP Address</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Banned By</TableHead>
          <TableHead>Date & Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No IP ban logs found</TableCell>
          </TableRow>
        ) : (
          logs.map((log) => {
            const details = log.details as { ip?: string; reason?: string } | null;
            const isBanned = log.action === 'ip_banned';
            return (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="outline" className={isBanned ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}>
                    <Ban className="h-3 w-3 mr-1" />
                    {isBanned ? 'Banned' : 'Unbanned'}
                  </Badge>
                </TableCell>
                <TableCell><span className="text-sm font-mono">{details?.ip || log.ip_address || 'Unknown'}</span></TableCell>
                <TableCell><span className="text-sm">{details?.reason || '-'}</span></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{getAdminName(log.user_id)}</span></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span></TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  const renderAccountLogsTable = (logs: AuditLog[]) => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Action</TableHead>
          <TableHead>Target User</TableHead>
          <TableHead>Deleted By</TableHead>
          <TableHead>Date & Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No account deletion logs found</TableCell>
          </TableRow>
        ) : (
          logs.map((log) => {
            const details = log.details as { target_email?: string; target_user_id?: string } | null;
            return (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Deleted
                  </Badge>
                </TableCell>
                <TableCell><span className="text-sm">{details?.target_email || details?.target_user_id || 'Unknown'}</span></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{getAdminName(log.user_id)}</span></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span></TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  const renderIncomeLogsTable = (logs: AuditLog[]) => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Action</TableHead>
          <TableHead>Viewed By</TableHead>
          <TableHead>Date & Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No income view logs found</TableCell>
          </TableRow>
        ) : (
          logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                  <Eye className="h-3 w-3 mr-1" />
                  Viewed
                </Badge>
              </TableCell>
              <TableCell><span className="text-sm">{getAdminName(log.user_id)}</span></TableCell>
              <TableCell><span className="text-sm text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span></TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  // Mobile card renderers
  const renderMobileRoleCard = (log: AuditLog) => {
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
  };

  const renderMobileVpnCard = (log: AuditLog) => {
    const details = log.details as { country?: string; city?: string; isp?: string } | null;
    return (
      <div key={log.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
            <Wifi className="h-3 w-3 mr-1" />
            VPN Blocked
          </Badge>
        </div>
        <p className="text-sm font-mono">{log.ip_address || 'Unknown'}</p>
        <p className="text-sm text-muted-foreground">
          {details?.city && details?.country ? `${details.city}, ${details.country}` : details?.country || 'Unknown'}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{details?.isp || 'Unknown ISP'}</span>
          <span>{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
        </div>
      </div>
    );
  };

  const renderMobileIpBanCard = (log: AuditLog) => {
    const details = log.details as { ip?: string; reason?: string } | null;
    const isBanned = log.action === 'ip_banned';
    return (
      <div key={log.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
        <Badge variant="outline" className={isBanned ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}>
          <Ban className="h-3 w-3 mr-1" />
          {isBanned ? 'IP Banned' : 'IP Unbanned'}
        </Badge>
        <p className="text-sm font-mono">{details?.ip || log.ip_address || 'Unknown'}</p>
        {details?.reason && <p className="text-sm text-muted-foreground">{details.reason}</p>}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>by {getAdminName(log.user_id)}</span>
          <span>{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
        </div>
      </div>
    );
  };

  const renderMobileAccountCard = (log: AuditLog) => {
    const details = log.details as { target_email?: string; target_user_id?: string } | null;
    return (
      <div key={log.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
          <Trash2 className="h-3 w-3 mr-1" />
          Account Deleted
        </Badge>
        <p className="text-sm truncate">{details?.target_email || details?.target_user_id || 'Unknown'}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>by {getAdminName(log.user_id)}</span>
          <span>{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
        </div>
      </div>
    );
  };

  const renderMobileIncomeCard = (log: AuditLog) => (
    <div key={log.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
        <Eye className="h-3 w-3 mr-1" />
        Income Viewed
      </Badge>
      <p className="text-sm">{getAdminName(log.user_id)}</p>
      <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'MMM d, h:mm a')}</p>
    </div>
  );

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-display">Audit Logs</CardTitle>
            <CardDescription>Track all moderation and administrative actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Mobile dropdown */}
              <div className="sm:hidden mb-4">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="roles">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Roles ({roleLogs.length})
                      </div>
                    </SelectItem>
                    <SelectItem value="vpn">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4" />
                        VPN Blocks ({vpnLogs.length})
                      </div>
                    </SelectItem>
                    <SelectItem value="ipban">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4" />
                        IP Bans ({ipBanLogs.length})
                      </div>
                    </SelectItem>
                    <SelectItem value="accounts">
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Deletions ({accountLogs.length})
                      </div>
                    </SelectItem>
                    <SelectItem value="income">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Income ({incomeLogs.length})
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop tabs */}
              <TabsList className="hidden sm:flex w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="roles" className="flex-1 min-w-[100px] gap-1.5 data-[state=active]:bg-background">
                  <Shield className="h-4 w-4" />
                  Roles
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{roleLogs.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="vpn" className="flex-1 min-w-[100px] gap-1.5 data-[state=active]:bg-background">
                  <Wifi className="h-4 w-4" />
                  VPN Blocks
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{vpnLogs.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="ipban" className="flex-1 min-w-[100px] gap-1.5 data-[state=active]:bg-background">
                  <Ban className="h-4 w-4" />
                  IP Bans
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{ipBanLogs.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="accounts" className="flex-1 min-w-[100px] gap-1.5 data-[state=active]:bg-background">
                  <Trash2 className="h-4 w-4" />
                  Deletions
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{accountLogs.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="income" className="flex-1 min-w-[100px] gap-1.5 data-[state=active]:bg-background">
                  <Eye className="h-4 w-4" />
                  Income
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{incomeLogs.length}</Badge>
                </TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <>
                  <TabsContent value="roles" className="mt-4">
                    <div className="block md:hidden space-y-3">
                      {filterBySearch(roleLogs).map(renderMobileRoleCard)}
                      {filterBySearch(roleLogs).length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">No role change logs found</p>
                      )}
                    </div>
                    <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                      {renderRoleLogsTable(filterBySearch(roleLogs))}
                    </div>
                  </TabsContent>

                  <TabsContent value="vpn" className="mt-4">
                    <div className="block md:hidden space-y-3">
                      {filterBySearch(vpnLogs).map(renderMobileVpnCard)}
                      {filterBySearch(vpnLogs).length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">No VPN block logs found</p>
                      )}
                    </div>
                    <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                      {renderVpnLogsTable(filterBySearch(vpnLogs))}
                    </div>
                  </TabsContent>

                  <TabsContent value="ipban" className="mt-4">
                    <div className="block md:hidden space-y-3">
                      {filterBySearch(ipBanLogs).map(renderMobileIpBanCard)}
                      {filterBySearch(ipBanLogs).length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">No IP ban logs found</p>
                      )}
                    </div>
                    <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                      {renderIpBanLogsTable(filterBySearch(ipBanLogs))}
                    </div>
                  </TabsContent>

                  <TabsContent value="accounts" className="mt-4">
                    <div className="block md:hidden space-y-3">
                      {filterBySearch(accountLogs).map(renderMobileAccountCard)}
                      {filterBySearch(accountLogs).length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">No account deletion logs found</p>
                      )}
                    </div>
                    <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                      {renderAccountLogsTable(filterBySearch(accountLogs))}
                    </div>
                  </TabsContent>

                  <TabsContent value="income" className="mt-4">
                    <div className="block md:hidden space-y-3">
                      {filterBySearch(incomeLogs).map(renderMobileIncomeCard)}
                      {filterBySearch(incomeLogs).length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">No income view logs found</p>
                      )}
                    </div>
                    <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                      {renderIncomeLogsTable(filterBySearch(incomeLogs))}
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
