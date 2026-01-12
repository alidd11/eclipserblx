import { Users, AtSign, UserCheck, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface ChatQuickActionsProps {
  variant: 'staff' | 'admin';
  onMentionInsert: (mention: string) => void;
  onAttach?: () => void;
  onlineCount?: number;
}

export function ChatQuickActions({ 
  variant, 
  onMentionInsert, 
  onAttach,
  onlineCount = 0 
}: ChatQuickActionsProps) {
  const handleAction = (action: () => void) => {
    triggerHaptic('light');
    action();
  };

  const staffActions: QuickAction[] = [
    {
      id: 'everyone',
      icon: <Users className="h-4 w-4" />,
      label: '@everyone',
      onClick: () => onMentionInsert('everyone'),
    },
    {
      id: 'here',
      icon: <UserCheck className="h-4 w-4" />,
      label: '@here',
      onClick: () => onMentionInsert('here'),
    },
  ];

  const adminActions: QuickAction[] = [
    {
      id: 'everyone',
      icon: <Users className="h-4 w-4" />,
      label: '@everyone',
      onClick: () => onMentionInsert('everyone'),
    },
    {
      id: 'here',
      icon: <UserCheck className="h-4 w-4" />,
      label: '@here',
      onClick: () => onMentionInsert('here'),
    },
    ...(onAttach ? [{
      id: 'attach',
      icon: <Paperclip className="h-4 w-4" />,
      label: 'Attach',
      onClick: onAttach,
    }] : []),
  ];

  const actions = variant === 'staff' ? staffActions : adminActions;

  return (
    <div className="border-t border-border/30 bg-card pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="flex items-center justify-around px-2 py-1">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.onClick)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg",
              "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              "transition-all duration-150 active:scale-[0.97] touch-manipulation",
              "min-w-[60px]"
            )}
          >
            {action.icon}
            <span className="text-[10px] font-medium">{action.label}</span>
          </button>
        ))}
        
        {/* Online indicator */}
        <div className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 min-w-[60px]">
          <div className="relative">
            <AtSign className="h-4 w-4 text-muted-foreground" />
            {onlineCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center bg-success text-success-foreground text-[8px] font-bold rounded-full">
                {onlineCount > 9 ? '9+' : onlineCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            {onlineCount} online
          </span>
        </div>
      </div>
    </div>
  );
}
