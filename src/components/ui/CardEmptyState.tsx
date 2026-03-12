import { LucideIcon } from 'lucide-react';

interface CardEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Compact empty state designed for use inside Card/CardContent containers.
 * Uses CSS animations instead of framer-motion.
 */
export function CardEmptyState({ icon: Icon, title, description, children }: CardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-in fade-in slide-in-from-bottom-1.5 duration-300">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      )}
      {children}
    </div>
  );
}
