import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional badge/label above the title */
  badge?: React.ReactNode;
  /** Right-side actions (buttons, filters) */
  actions?: React.ReactNode;
  /** Center-align for hero-style headers */
  centered?: boolean;
  className?: string;
}

/**
 * Unified page header with consistent typography and animation.
 * Use on all public-facing pages for a cohesive, professional feel.
 */
export function PageHeader({ title, description, badge, actions, centered = false, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'mb-4 sm:mb-6',
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
    </motion.div>
  );
}
