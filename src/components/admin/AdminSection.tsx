import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  padded?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * Unified section shell for the admin surface.
 * Header bar (bg-muted/30) + rounded body. Standardizes look
 * across dashboard widgets and sub-pages.
 */
export function AdminSection({
  title,
  description,
  actions,
  icon,
  padded = true,
  className,
  bodyClassName,
  children,
}: AdminSectionProps) {
  const showHeader = title || description || actions || icon;
  return (
    <section
      className={cn(
        'border border-border rounded-xl overflow-hidden bg-card/40',
        className,
      )}
    >
      {showHeader && (
        <header className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <div className="min-w-0 flex-1">
            {title && <h3 className="font-semibold text-sm leading-tight truncate">{title}</h3>}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cn(padded ? 'p-4' : '', bodyClassName)}>{children}</div>
    </section>
  );
}
