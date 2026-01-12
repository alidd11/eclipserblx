import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuotedMessageProps {
  message: string;
  senderName: string;
  onClear?: () => void;
  isCompact?: boolean;
  className?: string;
}

export function QuotedMessage({
  message,
  senderName,
  onClear,
  isCompact = false,
  className,
}: QuotedMessageProps) {
  // Truncate long messages for display
  const displayMessage = message.length > 100 ? message.slice(0, 100) + '...' : message;

  return (
    <div
      className={cn(
        'flex items-start gap-2 bg-muted/50 border-l-2 border-primary rounded-r-md',
        isCompact ? 'px-2 py-1' : 'px-3 py-2',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <span className={cn('font-medium text-primary', isCompact ? 'text-xs' : 'text-xs')}>
          {senderName}
        </span>
        <p className={cn('text-muted-foreground truncate', isCompact ? 'text-xs' : 'text-sm')}>
          {displayMessage}
        </p>
      </div>
      {onClear && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 flex-shrink-0"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
