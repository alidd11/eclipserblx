import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  /** Page title (rendered as h1) */
  title: string;
  /** Supporting description below the title */
  description?: string;
  /** Optional actions (buttons, filters) rendered on the right */
  actions?: ReactNode;
  /** Additional className on the wrapper */
  className?: string;
}

/**
 * Standardized admin page header.
 * Ensures consistent typography and spacing across all admin pages.
 *
 * Usage:
 * ```tsx
 * <AdminPageHeader
 *   title="Orders"
 *   description="Manage and track all customer orders."
 *   actions={<Button>Export</Button>}
 * />
 * ```
 */
export function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-display font-bold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
