import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
  className?: string;
}

export function BulkActionBar({ selectedCount, actions, onClearSelection, className }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-bottom-2',
      className
    )}>
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {actions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? 'outline'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        <Button variant="ghost" size="icon" onClick={onClearSelection} aria-label="Clear selection">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
