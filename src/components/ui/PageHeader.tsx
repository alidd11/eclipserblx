import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  centered?: boolean;
  className?: string;
}

/**
 * Unified page header with consistent typography and animation.
 * Uses CSS animation instead of framer-motion to stay off the critical path.
 */
export function PageHeader({ title, description, badge, actions, centered = false, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-4 sm:mb-6 animate-in fade-in slide-in-from-top-2 duration-300',
        centered ? 'text-center' : 'flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3',
        className,
      )}
    >
      <div className={cn(centered && 'mx-auto max-w-2xl')}>
        {badge && <div className="mb-2">{badge}</div>}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className={cn(
            'text-muted-foreground mt-1 sm:mt-1.5 leading-relaxed',
            centered ? 'text-sm sm:text-base' : 'text-xs sm:text-sm max-w-lg',
          )}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
