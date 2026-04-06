import { CheckCircle, Clock, CreditCard, Package, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from '@/lib/dateUtils';

interface OrderTimelineProps {
  status: string;
  createdAt: string;
  paymentMethod?: string | null;
}

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: CreditCard },
  { key: 'paid', label: 'Payment Confirmed', icon: CheckCircle },
  { key: 'delivered', label: 'Delivered', icon: Package },
] as const;

function getActiveStep(status: string): number {
  switch (status) {
    case 'pending': return 0;
    case 'paid':
    case 'completed': return 2; // Digital products = instant delivery
    case 'refunded':
    case 'partially_refunded': return 2;
    case 'failed': return 0;
    default: return 0;
  }
}

export function OrderTimeline({ status, createdAt, paymentMethod }: OrderTimelineProps) {
  const activeStep = getActiveStep(status);
  const isRefunded = status === 'refunded' || status === 'partially_refunded';
  const isFailed = status === 'failed';

  return (
    <div className="flex items-center gap-0 w-full py-3">
      {STEPS.map((step, idx) => {
        const isCompleted = idx <= activeStep && !isFailed;
        const isCurrent = idx === activeStep && !isFailed;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCompleted
                    ? isRefunded
                      ? "bg-destructive/10 border-destructive text-destructive"
                      : "bg-primary/10 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium text-center leading-tight",
                  isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {idx === 0 && (
                <span className="text-[9px] text-muted-foreground">
                  {format(new Date(createdAt), 'MMM d, HH:mm')}
                </span>
              )}
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 rounded-full transition-colors",
                  idx < activeStep && !isFailed
                    ? isRefunded ? "bg-destructive/40" : "bg-primary/40"
                    : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
