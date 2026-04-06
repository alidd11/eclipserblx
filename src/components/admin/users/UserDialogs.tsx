import { Shield, Plus, X, Ban, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CustomerProfileDialog } from '@/components/admin/CustomerProfileDialog';

interface AdminUser {
  user_id: string;
  display_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  customer_id?: string | null;
  ip_address?: string | null;
  created_at?: string;
}

interface CustomRole {
  name: string;
  display_name?: string;
  color: string | null;
  description?: string | null;
}

interface UserRole {
  role: string;
  user_id?: string;
}

interface MutationObj {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate: (args: any) => void;
  isPending: boolean;
}

interface UserDialogsProps {
  selectedUser: AdminUser | null;
  setSelectedUser: (u: AdminUser | null) => void;
  newRole: string;
  setNewRole: (r: string) => void;
  customRoles: CustomRole[];
  getUserRoles: (id: string) => UserRole[];
  availableRoles: (id: string) => CustomRole[];
  canRemoveRole: (role: string) => boolean;
  addRoleMutation: MutationObj;
  removeRoleMutation: MutationObj;
  // IP Ban
  ipBanDialogUser: AdminUser | null;
  setIpBanDialogUser: (u: AdminUser | null) => void;
  ipAddress: string;
  setIpAddress: (v: string) => void;
  banReason: string;
  setBanReason: (v: string) => void;
  currentAdminIp: string | null;
  isSelfBan: boolean;
  IP_REGEX: RegExp;
  ipBanMutation: MutationObj;
  handleBanClick: () => void;
  // Self-ban
  selfBanConfirmOpen: boolean;
  setSelfBanConfirmOpen: (v: boolean) => void;
  selfBanCooldown: number;
  handleConfirmSelfBan: () => void;
  // Delete
  deleteConfirmUser: AdminUser | null;
  setDeleteConfirmUser: (u: AdminUser | null) => void;
  deleteAccountMutation: MutationObj;
  // Profile
  viewProfileUser: AdminUser | null;
  setViewProfileUser: (u: AdminUser | null) => void;
}

export function UserDialogs(props: UserDialogsProps) {
  const {
    selectedUser, setSelectedUser, newRole, setNewRole, customRoles,
    getUserRoles, availableRoles, canRemoveRole, addRoleMutation, removeRoleMutation,
    ipBanDialogUser, setIpBanDialogUser, ipAddress, setIpAddress, banReason, setBanReason,
    currentAdminIp, isSelfBan, IP_REGEX, ipBanMutation, handleBanClick,
    selfBanConfirmOpen, setSelfBanConfirmOpen, selfBanCooldown, handleConfirmSelfBan,
    deleteConfirmUser, setDeleteConfirmUser, deleteAccountMutation,
    viewProfileUser, setViewProfileUser,
  } = props;

  const getRoleBadge = (role: string) => {
    const config = customRoles.find((r) => r.name === role);
    return (
      <Badge key={role} variant="outline" className={`${config?.color || 'bg-gray-500'} text-foreground border-transparent`}>
        {config?.display_name || role}
      </Badge>
    );
  };

  return (
    <>
      {/* Manage Roles Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Manage Roles</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{selectedUser.display_name || 'No username'}</p>
                {selectedUser.customer_id && (
                  <p className="text-xs font-mono text-primary mt-1">Customer ID: {selectedUser.customer_id}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Current Roles</p>
                <div className="flex flex-wrap gap-2">
                  {getUserRoles(selectedUser.user_id).length === 0 ? (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  ) : (
                    getUserRoles(selectedUser.user_id).map((r) => {
                      const roleInfo = customRoles.find((cr) => cr.name === r.role);
                      return (
                        <Badge key={`${r.user_id}-${r.role}`} variant="outline" className={`gap-1 py-1.5 px-2 ${roleInfo?.color || ''} text-foreground border-transparent`}>
                          {roleInfo?.display_name || r.role}
                          {canRemoveRole(r.role) && (
                            <button onClick={() => removeRoleMutation.mutate({ userId: selectedUser.user_id, role: r.role, targetEmail: selectedUser.email })} className="ml-1 hover:text-destructive touch-manipulation">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>
              {availableRoles(selectedUser.user_id).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Add Role</p>
                  <div className="flex gap-2">
                    <Select value={newRole} onValueChange={(v) => setNewRole(v)}>
                      <SelectTrigger className="flex-1 h-10">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles(selectedUser.user_id).map((role) => (
                          <SelectItem key={role.name} value={role.name} className="py-2.5">
                            {role.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button disabled={!newRole || addRoleMutation.isPending} onClick={() => newRole && addRoleMutation.mutate({ userId: selectedUser.user_id, role: newRole, targetEmail: selectedUser.email, displayName: selectedUser.display_name })} className="h-10 px-4">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* IP Ban Dialog */}
      <Dialog open={!!ipBanDialogUser} onOpenChange={() => { setIpBanDialogUser(null); setIpAddress(''); setBanReason(''); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-500" />
              IP Ban User
            </DialogTitle>
            <DialogDescription>Ban an IP address to prevent access from that address.</DialogDescription>
          </DialogHeader>
          {ipBanDialogUser && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{ipBanDialogUser.display_name || 'No username'}</p>
                {ipBanDialogUser.customer_id && (
                  <p className="text-xs font-mono text-primary mt-1">Customer ID: {ipBanDialogUser.customer_id}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address *</label>
                <Input placeholder="e.g., 192.168.1.100" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} maxLength={45} />
                {ipAddress.trim() && !IP_REGEX.test(ipAddress.trim()) && (
                  <p className="text-xs text-destructive">Invalid IP address format</p>
                )}
                <p className="text-xs text-muted-foreground">Enter the IP address to ban</p>
                {currentAdminIp && (
                  <p className="text-xs text-muted-foreground">Your current IP: <span className="font-mono text-primary">{currentAdminIp}</span></p>
                )}
              </div>
              {isSelfBan && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Warning: Self-Ban Detected</p>
                    <p className="text-xs text-muted-foreground mt-1">This is your current IP address. Banning it will lock you out.</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea placeholder="Why is this IP being banned?" value={banReason} onChange={(e) => { if (e.target.value.length <= 500) setBanReason(e.target.value); }} rows={2} maxLength={500} />
                <p className="text-xs text-muted-foreground text-right">{banReason.length}/500</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIpBanDialogUser(null); setIpAddress(''); setBanReason(''); }}>Cancel</Button>
                <Button variant="destructive" disabled={!ipAddress.trim() || !IP_REGEX.test(ipAddress.trim()) || ipBanMutation.isPending} onClick={handleBanClick} className="bg-orange-500 hover:bg-orange-600">
                  {ipBanMutation.isPending ? 'Banning...' : 'Ban IP'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Self-Ban Confirmation */}
      <AlertDialog open={selfBanConfirmOpen} onOpenChange={setSelfBanConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              You Are About to Ban Your Own IP
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p><strong className="text-destructive">This will immediately lock you out</strong> of the entire site.</p>
              <p>You will need to use a VPN or different network to access the site and remove the ban.</p>
              <div className="p-3 rounded-lg bg-muted/50 font-mono text-sm">IP to be banned: <span className="text-destructive">{ipAddress}</span></div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelfBanConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSelfBan} className="bg-destructive hover:bg-destructive/90" disabled={selfBanCooldown > 0 || ipBanMutation.isPending}>
              {selfBanCooldown > 0 ? `Wait ${selfBanCooldown}s...` : 'I Understand, Ban Myself'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Account Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to permanently delete the account for <strong>{deleteConfirmUser?.display_name || 'this user'}</strong>.</p>
              <p className="text-destructive font-medium">This action cannot be undone. All user data, orders, and activity will be removed.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmUser && deleteAccountMutation.mutate(deleteConfirmUser.user_id)} className="bg-destructive hover:bg-destructive/90" disabled={deleteAccountMutation.isPending}>
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer Profile Dialog */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CustomerProfileDialog open={!!viewProfileUser} onOpenChange={() => setViewProfileUser(null)} profile={viewProfileUser as any} />
    </>
  );
}
