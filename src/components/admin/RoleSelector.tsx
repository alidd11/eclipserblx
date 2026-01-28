import { Lock, Shield, Package, MessageCircle, BarChart3, FileText, Users, Crown, Zap, Eye, Settings, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomRole {
  id: string;
  name: string;
  display_name: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  is_system: boolean;
}

interface RoleSelectorProps {
  roles: CustomRole[];
  selectedRole: string;
  onSelectRole: (role: string) => void;
  getPermissionCount: (role: string) => number;
  totalPermissions: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'shield': Shield,
  'users': Users,
  'package': Package,
  'message-circle': MessageCircle,
  'bar-chart-3': BarChart3,
  'file-text': FileText,
  'star': Star,
  'crown': Crown,
  'zap': Zap,
  'eye': Eye,
  'settings': Settings,
};

export function RoleSelector({ 
  roles, 
  selectedRole, 
  onSelectRole, 
  getPermissionCount,
  totalPermissions 
}: RoleSelectorProps) {
  const selectedRoleInfo = roles.find(r => r.name === selectedRole);
  const SelectedIcon = selectedRoleInfo ? ICON_MAP[selectedRoleInfo.icon] || Shield : Shield;
  const permCount = getPermissionCount(selectedRole);

  return (
    <Select value={selectedRole} onValueChange={onSelectRole}>
      <SelectTrigger className="w-full h-auto py-3 bg-muted/30 border-border hover:bg-muted/50 transition-colors">
        <SelectValue>
          {selectedRoleInfo && (
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                selectedRoleInfo.color,
                "text-white"
              )}>
                <SelectedIcon className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="font-medium truncate">{selectedRoleInfo.display_name}</span>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  {selectedRoleInfo.name === 'admin' && (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {permCount} / {totalPermissions}
                  </span>
                </div>
              </div>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border z-[100]">
        {roles.map(role => {
          const IconComponent = ICON_MAP[role.icon] || Shield;
          const rolePermCount = getPermissionCount(role.name);
          
          return (
            <SelectItem 
              key={role.id} 
              value={role.name}
              className="py-3"
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  role.color,
                  "text-white"
                )}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="font-medium truncate">{role.display_name}</span>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {role.name === 'admin' && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {rolePermCount} / {totalPermissions}
                    </span>
                  </div>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
