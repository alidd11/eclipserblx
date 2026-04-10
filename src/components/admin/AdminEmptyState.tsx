import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminEmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

/**
 * Standardized empty state for admin data views.
 * Replaces inconsistent "No X found" plain text across admin pages.
 */
export function AdminEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  children,
}: AdminEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="p-3 rounded-xl bg-muted/50 border border-border mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4 h-12">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
