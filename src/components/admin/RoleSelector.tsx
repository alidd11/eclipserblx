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

  return (
    <Select value={selectedRole} onValueChange={onSelectRole}>
      <SelectTrigger className="w-full bg-card">
        <SelectValue>
          {selectedRoleInfo && (
            <div className="flex items-center gap-3">
              <div className={cn("p-1.5 rounded-md", selectedRoleInfo.color, "text-white")}>
                <SelectedIcon className="h-4 w-4" />
              </div>
              <span className="font-medium">{selectedRoleInfo.display_name}</span>
              {selectedRoleInfo.name === 'admin' && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {getPermissionCount(selectedRoleInfo.name)} / {totalPermissions}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border z-[100]">
        {roles.map(role => {
          const IconComponent = ICON_MAP[role.icon] || Shield;
          const permCount = getPermissionCount(role.name);
          
          return (
            <SelectItem key={role.id} value={role.name}>
              <div className="flex items-center gap-3 w-full">
                <div className={cn("p-1.5 rounded-md", role.color, "text-white")}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <span className="font-medium">{role.display_name}</span>
                {role.name === 'admin' && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground ml-2">
                  {permCount} / {totalPermissions}
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
