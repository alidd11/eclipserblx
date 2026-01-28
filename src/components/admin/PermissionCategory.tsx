import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface PermissionCategoryProps {
  categoryKey: string;
  label: string;
  icon: React.ReactNode;
  permissions: Permission[];
  enabledPermissions: Set<string>;
  onToggle: (permissionId: string, enabled: boolean) => void;
  isAdmin: boolean;
  isLoading: boolean;
  defaultOpen?: boolean;
}

export function PermissionCategory({
  categoryKey,
  label,
  icon,
  permissions,
  enabledPermissions,
  onToggle,
  isAdmin,
  isLoading,
  defaultOpen = true,
}: PermissionCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // Sync with parent's expand/collapse all state
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);
  
  const enabledCount = permissions.filter(p => enabledPermissions.has(p.id)).length;
  const totalCount = permissions.length;
  const allEnabled = enabledCount === totalCount;
  const noneEnabled = enabledCount === 0;

  const handleSelectAll = () => {
    if (isAdmin) return;
    permissions.forEach(p => {
      if (!enabledPermissions.has(p.id)) {
        onToggle(p.id, true);
      }
    });
  };

  const handleDeselectAll = () => {
    if (isAdmin) return;
    permissions.forEach(p => {
      if (enabledPermissions.has(p.id)) {
        onToggle(p.id, false);
      }
    });
  };

  const formatPermissionName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-xl overflow-hidden">
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          "flex items-center justify-between p-4 transition-colors",
          "hover:bg-muted/50",
          isOpen && "border-b bg-muted/30"
        )}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div className="text-left">
              <h3 className="font-semibold">{label}</h3>
              <p className="text-xs text-muted-foreground">
                {totalCount} permission{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge 
              variant={allEnabled ? "default" : noneEnabled ? "secondary" : "outline"}
              className={cn(
                allEnabled && "bg-green-500",
                noneEnabled && "bg-muted"
              )}
            >
              {enabledCount} / {totalCount}
            </Badge>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 space-y-4">
          {/* Quick actions */}
          {!isAdmin && (
            <div className="flex items-center gap-2 pb-3 border-b">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAll();
                      }}
                      disabled={allEnabled || isLoading}
                      className="h-8"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Select All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enable all {label} permissions</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeselectAll();
                      }}
                      disabled={noneEnabled || isLoading}
                      className="h-8"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Deselect All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Disable all {label} permissions</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          
          {/* Permission list */}
          <div className="space-y-2">
            {permissions.map(permission => {
              const isEnabled = enabledPermissions.has(permission.id);
              
              return (
                <div
                  key={permission.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-all",
                    isEnabled
                      ? "bg-primary/5 border border-primary/20"
                      : "bg-muted/30 border border-transparent hover:bg-muted/50",
                    isAdmin && "opacity-75"
                  )}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className={cn(
                      "font-medium text-sm",
                      isEnabled && "text-primary"
                    )}>
                      {formatPermissionName(permission.name)}
                    </p>
                    {permission.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {permission.description}
                      </p>
                    )}
                  </div>
                  
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => onToggle(permission.id, checked)}
                    disabled={isAdmin || isLoading}
                    aria-label={`Toggle ${formatPermissionName(permission.name)}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
