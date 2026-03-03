import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface CardEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Compact empty state designed for use inside Card/CardContent containers.
 * Simpler than the full EmptyState — no CTA buttons, just icon + text.
 * For standalone page-level empty states, use EmptyState instead.
 */
export function CardEmptyState({ icon: Icon, title, description, children }: CardEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-10 px-4 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      )}
      {children}
    </motion.div>
  );
}
