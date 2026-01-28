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
  onSelectRole
}: RoleSelectorProps) {
  const selectedRoleInfo = roles.find(r => r.name === selectedRole);
  const SelectedIcon = selectedRoleInfo ? ICON_MAP[selectedRoleInfo.icon] || Shield : Shield;

  return (
    <Select value={selectedRole} onValueChange={onSelectRole}>
      {/*
        SelectTrigger has a fixed h-10 AND default py-2 in the shared component,
        which can leave too little inner height and clip our icon container.
        Override py to prevent clipping.
      */}
      <SelectTrigger className="w-full h-10 py-1 bg-muted/30 border-border hover:bg-muted/50 transition-colors">
        <SelectValue>
          {selectedRoleInfo && (
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1 rounded-md flex-shrink-0",
                selectedRoleInfo.color,
                "text-white"
              )}>
                <SelectedIcon className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-sm">{selectedRoleInfo.display_name}</span>
              {selectedRoleInfo.name === 'admin' && (
                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border z-[100]">
        {roles.map(role => {
          const IconComponent = ICON_MAP[role.icon] || Shield;
          
          return (
            <SelectItem 
              key={role.id} 
              value={role.name}
              className="py-2"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1 rounded-md flex-shrink-0",
                  role.color,
                  "text-white"
                )}>
                  <IconComponent className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium text-sm">{role.display_name}</span>
                {role.name === 'admin' && (
                  <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
