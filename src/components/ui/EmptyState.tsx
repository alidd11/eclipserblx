import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  children?: ReactNode;
}

/**
 * Consistent illustrated empty state for lists, grids, and pages.
 * Uses design tokens and provides optional CTA.
 */
export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Illustrated icon with layered background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/5 scale-150" />
        <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-9 w-9 text-muted-foreground/60" />
        </div>
      </div>

      <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">{description}</p>

      {actionLabel && actionTo && (
        <Button asChild size="sm">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}

      {actionLabel && onAction && !actionTo && (
        <Button size="sm" onClick={onAction}>{actionLabel}</Button>
      )}

      {children}
    </div>
  );
}
