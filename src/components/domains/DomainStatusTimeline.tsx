import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DomainStatusTimelineProps {
  status: string;
  sslStatus?: string | null;
}

const STEPS = [
  { key: 'added', label: 'Added' },
  { key: 'dns', label: 'DNS Configured' },
  { key: 'verified', label: 'Verified' },
  { key: 'ssl', label: 'SSL Active' },
];

function getActiveStep(status: string, sslStatus?: string | null): number {
  if (status === 'active' && sslStatus === 'active') return 4;
  if (status === 'active') return 3;
  if (status === 'verifying') return 1;
  if (status === 'failed') return 1;
  if (status === 'pending') return 0;
  return 0;
}

export function DomainStatusTimeline({ status, sslStatus }: DomainStatusTimelineProps) {
  const activeStep = getActiveStep(status, sslStatus);
  const isFailed = status === 'failed';

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const completed = i < activeStep;
        const current = i === activeStep;
        const isFailedStep = isFailed && i === 1;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1">
              {completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : current ? (
                isFailedStep ? (
                  <Circle className="h-5 w-5 text-destructive" />
                ) : (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                )
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/30" />
              )}
              <span className={cn(
                'text-[10px] font-medium whitespace-nowrap',
                completed ? 'text-emerald-600 dark:text-emerald-400' :
                current ? (isFailedStep ? 'text-destructive' : 'text-primary') :
                'text-muted-foreground/50'
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-px flex-1 mx-1.5 mt-[-14px]',
                completed ? 'bg-emerald-500' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
