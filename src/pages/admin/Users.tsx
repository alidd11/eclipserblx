import { Search, Shield, Ban, Trash2, Eye, ChevronLeft, ChevronRight, Users, IdCard } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { UserDialogs } from '@/components/admin/users/UserDialogs';

export default function AdminUsers() {
  const isMobile = useIsMobile();
  const data = useAdminUsers();
  const {
    activeView, setActiveView, search, setSearch, currentPage, setCurrentPage,
    profiles, isLoading, customRoles, paginatedProfiles,
    stats, totalPages, startIndex, endIndex, totalCustomers,
    isAdmin, isPrimaryAdmin,
    getUserRoles, canDeleteUser,
    setSelectedUser, setIpBanDialogUser, setDeleteConfirmUser, setViewProfileUser,
  } = data;

  const getRoleBadge = (role: string) => {
    const config = customRoles.find(r => r.name === role);
    return (
      <Badge key={role} variant="outline" className={`${config?.color || 'bg-gray-500'} text-foreground border-transparent`}>
        {config?.display_name || role}
      </Badge>
    );
  };

  return (
    <AdminLayout requiredPermissions={['view_users']}>
      <div className="space-y-6 min-h-0">
        <AdminPageHeader title="User Management" description="Manage customers, staff, and roles" />
        </div>

        {/* View Toggle - Mobile: Select, Desktop: Tabs */}
        <div className="sm:hidden">
          <Select value={activeView} onValueChange={v => { setActiveView(v as any); setCurrentPage(1); }}>
            <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="customers">Customers ({stats.total})</SelectItem>
              <SelectItem value="staff">Staff ({stats.staff})</SelectItem>
              <SelectItem value="all">All Users ({(profiles || []).length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden sm:flex gap-1 border-b border-border">
          {[
            { value: 'customers', label: 'Customers', count: stats.total, icon: Users },
            { value: 'staff', label: 'Staff', count: stats.staff, icon: IdCard },
            { value: 'all', label: 'All Users', count: (profiles || []).length, icon: Users },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => { setActiveView(tab.value as any); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                activeView === tab.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-[20px] justify-center">{tab.count}</Badge>
            </button>
          ))}
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground"><span className="font-semibold text-foreground">{stats.total}</span> customers</span>
          <span className="text-muted-foreground"><span className="font-semibold text-foreground">{stats.staff}</span> staff</span>
          <span className="text-muted-foreground"><span className="font-semibold text-foreground">{stats.eclipsePlus}</span> Subscribers</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by customer ID, name or username..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm">{activeView === 'staff' ? 'Staff Members' : activeView === 'all' ? 'All Users' : 'Customer List'}</h3>
            <p className="text-xs text-muted-foreground">Showing {startIndex + 1}-{Math.min(endIndex, totalCustomers)} of {totalCustomers}</p>
          </div>
          <div>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>User</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 3 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>
                    ))
                  ) : paginatedProfiles.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
                  ) : (
                    paginatedProfiles.map((profile) => {
                      const roles = getUserRoles(profile.user_id);
                      return (
                        <TableRow key={profile.user_id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{profile.display_name || 'No name'}</p>
                                {roles.length === 0 ? <Badge variant="secondary" className="text-xs">Customer</Badge> : roles.map(r => getRoleBadge(r.role))}
                              </div>
                              {profile.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
                              {profile.customer_id && <p className="text-xs font-mono text-primary">Customer ID: {profile.customer_id}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {isPrimaryAdmin && <Button variant="ghost" size="sm" onClick={() => setViewProfileUser(profile)} className="text-muted-foreground hover:text-primary" title="View Profile"><Eye className="h-4 w-4" /></Button>}
                              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(profile)}><Shield className="h-4 w-4 mr-2" />Roles</Button>
                              {isAdmin && <Button variant="ghost" size="sm" onClick={() => setIpBanDialogUser(profile)} className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"><Ban className="h-4 w-4" /></Button>}
                              {canDeleteUser(profile) && <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmUser(profile)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                      <Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /><Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : paginatedProfiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No customers found</div>
              ) : (
                paginatedProfiles.map((profile) => {
                  const roles = getUserRoles(profile.user_id);
                  return (
                    <div key={profile.user_id} className={`rounded-lg border border-border bg-card p-4 ${isPrimaryAdmin ? 'cursor-pointer active:bg-muted/50' : ''}`} onClick={() => isPrimaryAdmin && setViewProfileUser(profile)}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-base truncate pr-2">{profile.display_name || 'Unnamed'}</h3>
                        {roles.length === 0 ? <Badge variant="secondary" className="text-xs shrink-0">Customer</Badge> : <div className="flex gap-1.5 shrink-0">{roles.map(r => getRoleBadge(r.role))}</div>}
                      </div>
                      <div className="space-y-1.5 mb-4">
                        {profile.customer_id && <p className="text-xs font-mono text-primary">ID: {profile.customer_id}</p>}
                        <p className="text-xs text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                        {isPrimaryAdmin && <Button variant="outline" size="icon" aria-label="View" className="h-9 w-9" onClick={() => setViewProfileUser(profile)} title="View Profile"><Eye className="h-4 w-4" /></Button>}
                        <Button variant="outline" size="icon" aria-label="Security" className="h-9 w-9" onClick={() => setSelectedUser(profile)} title="Manage Roles"><Shield className="h-4 w-4" /></Button>
                        {isAdmin && <Button variant="outline" size="icon" aria-label="Ban" className="h-9 w-9 text-orange-500 border-orange-500/50 hover:bg-orange-500/10" onClick={() => setIpBanDialogUser(profile)} title="IP Ban"><Ban className="h-4 w-4" /></Button>}
                        {canDeleteUser(profile) && <Button variant="outline" size="icon" aria-label="Delete" className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10" onClick={() => setDeleteConfirmUser(profile)} title="Delete Account"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <p className="text-sm text-muted-foreground hidden sm:block">Page {currentPage} of {totalPages}</p>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1"><ChevronLeft className="h-4 w-4" />Previous</Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>;
                    })}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gap-1">Next<ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <UserDialogs {...data} />
    </AdminLayout>
  );
}
