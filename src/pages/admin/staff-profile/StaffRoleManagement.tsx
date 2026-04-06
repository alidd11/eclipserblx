import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { IdCard, Plus, X, Loader2 } from 'lucide-react';
import { format } from '@/lib/dateUtils';
import type { UseMutationResult } from '@tanstack/react-query';

interface RoleInfo {
  displayName: string;
  color: string;
  icon: string;
}

interface AvailableRole {
  name: string;
  display_name: string;
}

interface StaffRoleManagementProps {
  userId: string;
  profileDisplayName: string;
  roles: { role: string; created_at: string }[];
  newRole: string;
  setNewRole: (v: string) => void;
  roleToRemove: { role: string; displayName: string } | null;
  setRoleToRemove: (v: { role: string; displayName: string } | null) => void;
  availableRoles: () => AvailableRole[];
  getRoleInfo: (name: string) => RoleInfo;
  canRemoveRole: (role: string) => boolean;
  addRoleMutation: UseMutationResult<{ targetUserId: string }, Error, { role: string; targetUserId: string }>;
  removeRoleMutation: UseMutationResult<{ targetUserId: string }, Error, { role: string; targetUserId: string }>;
}

export function StaffRoleManagement({
  userId,
  profileDisplayName,
  roles,
  newRole,
  setNewRole,
  roleToRemove,
  setRoleToRemove,
  availableRoles,
  getRoleInfo,
  canRemoveRole,
  addRoleMutation,
  removeRoleMutation,
}: StaffRoleManagementProps) {
  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
            <IdCard className="h-5 w-5" />
            Role Management
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {availableRoles().length > 0 && (
            <div className="flex gap-2">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="flex-1 bg-muted/30">
                  <SelectValue placeholder="Select role to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles().map((r) => (
                    <SelectItem key={r.name} value={r.name}>{r.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" disabled={!newRole || addRoleMutation.isPending} onClick={() => newRole && addRoleMutation.mutate({ role: newRole, targetUserId: userId })}>
                {addRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No roles assigned</p>
          ) : (
            <div className="space-y-2">
              {roles.map(({ role, created_at }, index) => {
                const roleInfo = getRoleInfo(role);
                return (
                  <div key={`${role}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`${roleInfo.color} text-foreground border-transparent`}>{roleInfo.displayName}</Badge>
                      <span className="text-xs text-muted-foreground">Assigned {format(new Date(created_at), 'MMM d, yyyy')}</span>
                    </div>
                    {canRemoveRole(role) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setRoleToRemove({ role, displayName: roleInfo.displayName })}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!roleToRemove} onOpenChange={(open) => !open && setRoleToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the <strong>{roleToRemove?.displayName}</strong> role from {profileDisplayName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (roleToRemove) removeRoleMutation.mutate({ role: roleToRemove.role, targetUserId: userId }); }} disabled={removeRoleMutation.isPending}>
              {removeRoleMutation.isPending ? 'Removing...' : 'Remove Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
