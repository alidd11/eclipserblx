import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSellerOnboarding } from '@/hooks/useSellerOnboarding';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function StoreHealthScore() {
  const { healthScore, steps, data, isLoading } = useSellerOnboarding();

  if (isLoading || !data) return null;
  if (healthScore === 100) return null; // Don't show if perfect

  const color =
    healthScore >= 80
      ? 'text-emerald-500'
      : healthScore >= 50
      ? 'text-amber-500'
      : 'text-red-500';

  const bgColor =
    healthScore >= 80
      ? 'from-emerald-500/10 to-emerald-500/5'
      : healthScore >= 50
      ? 'from-amber-500/10 to-amber-500/5'
      : 'from-red-500/10 to-red-500/5';

  const incompleteSteps = steps.filter((s) => !s.completed);

  return (
    <div className={cn('rounded-xl border border-border bg-gradient-to-br p-5 space-y-4', bgColor)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Store Health</h3>
        <div className="flex items-center gap-2">
          <motion.span
            key={healthScore}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn('text-2xl font-bold', color)}
          >
            {healthScore}%
          </motion.span>
        </div>
      </div>

      {/* Progress ring */}
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle
              className="text-muted"
              strokeWidth="3"
              stroke="currentColor"
              fill="transparent"
              r="16"
              cx="18"
              cy="18"
            />
            <motion.circle
              className={color}
              strokeWidth="3"
              stroke="currentColor"
              fill="transparent"
              r="16"
              cx="18"
              cy="18"
              strokeDasharray={`${healthScore} ${100 - healthScore}`}
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 100' }}
              animate={{ strokeDasharray: `${healthScore} ${100 - healthScore}` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
        </div>

        <div className="flex-1 space-y-1.5">
          {incompleteSteps.slice(0, 3).map((step) => (
            <Link
              key={step.id}
              to={step.href}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="flex-1">{step.title}</span>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>

      {incompleteSteps.length > 0 && (
        <Button size="sm" variant="outline" className="w-full" asChild>
          <Link to="/seller/setup">
            Complete Setup
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
