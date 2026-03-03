import { forwardRef } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ICON_SIZE_SMALL } from './sidebarConstants';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/haptics';
import { useTranslation } from 'react-i18next';

interface SidebarFooterProps {
  isCollapsed: boolean;
  onSignOut: () => void;
}

export const SidebarFooter = forwardRef<HTMLDivElement, SidebarFooterProps>(
  function SidebarFooter({ isCollapsed, onSignOut }, ref) {
    const { t } = useTranslation();

    return (
      <div ref={ref} className="border-t border-border p-2 space-y-1">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground hover:text-destructive hover:bg-muted"
                onClick={() => {
                  hapticTap();
                  onSignOut();
                }}
              >
                <LogOut className={ICON_SIZE_SMALL} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('sidebar.signOut')}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg px-3 py-2.5"
            onClick={() => {
              hapticTap();
              onSignOut();
            }}
          >
            <LogOut className={cn(ICON_SIZE_SMALL, "shrink-0")} />
            <span className="ml-3">{t('sidebar.signOut')}</span>
          </Button>
        )}
      </div>
    );
  }
);
