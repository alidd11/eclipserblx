import { Lock, Shield, Package, MessageCircle, BarChart3, FileText, Users, Crown, Zap, Eye, Settings, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-3 pb-4">
        {roles.map(role => {
          const IconComponent = ICON_MAP[role.icon] || Shield;
          const isSelected = selectedRole === role.name;
          const permCount = getPermissionCount(role.name);
          
          return (
            <button
              key={role.id}
              onClick={() => onSelectRole(role.name)}
              className={cn(
                "flex-shrink-0 min-w-[140px] p-4 rounded-xl border-2 transition-all duration-200",
                "hover:shadow-md active:scale-[0.98] touch-manipulation",
                isSelected
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                {/* Icon with role color */}
                <div className={cn(
                  "p-3 rounded-xl transition-all",
                  role.color,
                  "text-white shadow-sm"
                )}>
                  <IconComponent className="h-5 w-5" />
                </div>
                
                {/* Role name with lock icon for admin */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{role.display_name}</span>
                  {role.name === 'admin' && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                
                {/* Permission count badge */}
                <div className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  isSelected 
                    ? "bg-primary/20 text-primary font-medium" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {permCount} / {totalPermissions}
                </div>
                
                {/* Hierarchy level indicator */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        i < Math.ceil(role.hierarchy_level / 20)
                          ? role.color
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
