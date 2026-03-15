import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useSellerOnboarding, type OnboardingStep } from '@/hooks/useSellerOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Scale,
  Palette,
  LayoutGrid,
  CreditCard,
  Gamepad2,
  LinkIcon,
  Package,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Rocket,
  PartyPopper,
  ArrowRight,
  Loader2,
  Sparkles,
  Store,
} from 'lucide-react';

const stepIcons: Record<string, React.ElementType> = {
  tos: Scale,
  appearance: Palette,
  categories: LayoutGrid,
  payments: CreditCard,
  roblox: Gamepad2,
  socials: LinkIcon,
  products: Package,
};

const stepColors: Record<string, string> = {
  tos: 'from-amber-500 to-orange-500',
  appearance: 'from-pink-500 to-rose-500',
  categories: 'from-blue-500 to-indigo-500',
  payments: 'from-emerald-500 to-green-500',
  roblox: 'from-red-500 to-pink-500',
  socials: 'from-violet-500 to-purple-500',
  products: 'from-cyan-500 to-blue-500',
};

export default function SellerSetup() {
  const { user, loading: authLoading } = useAuth();
  const { store } = useSellerStatus();
  const { steps, isLoading, progress, allComplete, completedCount, totalSteps, nextStep } = useSellerOnboarding();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<string | null>(null);

  // Auto-select next incomplete step
  useEffect(() => {
    if (!activeStep && nextStep) {
      setActiveStep(nextStep.id);
    }
  }, [nextStep, activeStep]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background safe-area-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const currentStepIndex = steps.findIndex((s) => s.id === activeStep);
  const currentStep = steps[currentStepIndex];

  return (
    <div className="min-h-screen bg-background safe-area-page">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{store?.name || 'Store Setup'}</h1>
              <p className="text-xs text-muted-foreground">
                {completedCount}/{totalSteps} steps complete
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/seller')}>
            {allComplete ? 'Go to Dashboard' : 'Skip for now'}
          </Button>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <AnimatePresence mode="wait">
          {allComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/10"
              >
                <PartyPopper className="h-12 w-12 text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your store is fully configured and ready to accept customers.
              </p>
              <Button onClick={() => navigate('/seller')} className="mt-4">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-3"
            >
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Let's set up your store</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                Complete these steps to get your store ready for customers. Required steps are marked with a star.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}% complete</span>
            <span>{completedCount} of {totalSteps} steps</span>
          </div>
        </div>

        {/* Steps grid */}
        <div className="grid gap-3">
          {steps.map((step, index) => {
            const Icon = stepIcons[step.id] || Package;
            const isActive = step.id === activeStep;
            const colorClass = stepColors[step.id] || 'from-primary to-accent';

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <button
                  onClick={() => setActiveStep(isActive ? null : step.id)}
                  className={cn(
                    'w-full text-left rounded-xl border transition-all duration-200',
                    step.completed
                      ? 'bg-muted/30 border-border'
                      : isActive
                      ? 'bg-card border-primary/40 shadow-lg shadow-primary/5'
                      : 'bg-card border-border hover:border-primary/20 hover:shadow-md'
                  )}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Step indicator */}
                    <div className="relative shrink-0">
                      {step.completed ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center"
                        >
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </motion.div>
                      ) : (
                        <div className={cn(
                          'h-11 w-11 rounded-xl flex items-center justify-center bg-gradient-to-br',
                          isActive ? colorClass : 'from-muted to-muted'
                        )}>
                          <Icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-muted-foreground')} />
                        </div>
                      )}
                      {step.required && !step.completed && (
                        <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-semibold',
                          step.completed && 'line-through text-muted-foreground'
                        )}>
                          {step.title}
                        </span>
                        {step.required && !step.completed && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>

                    {/* Action */}
                    <ChevronRight className={cn(
                      'h-5 w-5 text-muted-foreground shrink-0 transition-transform',
                      isActive && 'rotate-90'
                    )} />
                  </div>

                  {/* Expanded action area */}
                  <AnimatePresence>
                    {isActive && !step.completed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0">
                          <div className="border-t border-border pt-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              {getStepActionText(step)}
                            </p>
                            <Button size="sm" asChild>
                              <Link to={step.href}>
                                {getStepButtonText(step)}
                                <ArrowRight className="h-4 w-4 ml-1.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Navigation */}
        {!allComplete && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={currentStepIndex <= 0}
              onClick={() => {
                const prev = steps[currentStepIndex - 1];
                if (prev) setActiveStep(prev.id);
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            {nextStep && (
              <Button size="sm" asChild>
                <Link to={nextStep.href}>
                  {nextStep.title}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getStepActionText(step: OnboardingStep): string {
  switch (step.id) {
    case 'tos': return 'Review and sign the seller agreement to activate your store.';
    case 'appearance': return 'Upload a logo and banner to make your store recognizable.';
    case 'categories': return 'Select which product categories you want to sell in.';
    case 'payments': return 'Choose your preferred payout method — Stripe, PayPal, or bank transfer.';
    case 'roblox': return 'Link your Roblox creator store so buyers can find you.';
    case 'socials': return 'Add your Discord, Twitter, or website so customers can connect.';
    case 'products': return 'Create your first product listing and start selling.';
    default: return 'Complete this step to continue.';
  }
}

function getStepButtonText(step: OnboardingStep): string {
  switch (step.id) {
    case 'tos': return 'Sign Agreement';
    case 'appearance': return 'Customize Store';
    case 'categories': return 'Choose Categories';
    case 'payments': return 'Set Up Payouts';
    case 'roblox': return 'Add Roblox Link';
    case 'socials': return 'Add Social Links';
    case 'products': return 'Create Product';
    default: return 'Continue';
  }
}
