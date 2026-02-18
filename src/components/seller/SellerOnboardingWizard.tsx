import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Scale,
  Palette,
  LayoutGrid,
  Package,
  LinkIcon,
  ChevronRight,
  Rocket,
  CheckCircle2,
  PartyPopper,
  Gamepad2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CURRENT_TOS_VERSION = '1.0';
const ONBOARDING_DISMISSED_KEY = 'seller-onboarding-dismissed';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  completed: boolean;
}

export function SellerOnboardingWizard() {
  const { store } = useSellerStatus();
  const [dismissed, setDismissed] = useState(() => {
    if (!store?.id) return true;
    return localStorage.getItem(`${ONBOARDING_DISMISSED_KEY}-${store.id}`) === 'true';
  });

  const { data: setupData, isLoading } = useQuery({
    queryKey: ['seller-onboarding-wizard', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;

      const { data: tosData } = await supabase
        .from('seller_agreements')
        .select('id')
        .eq('store_id', store.id)
        .eq('agreement_version', CURRENT_TOS_VERSION)
        .maybeSingle();

      const { count: categoryCount } = await supabase
        .from('store_categories')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('is_enabled', true);

      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id);

      const hasAppearance = !!(store.logo_url || store.banner_url);
      const hasSocials = !!(
        store.discord_url ||
        store.twitter_url ||
        store.youtube_url ||
        store.website_url ||
        store.roblox_url
      );

      return {
        tosSigned: !!tosData,
        categoriesEnabled: (categoryCount || 0) > 0,
        hasProducts: (productCount || 0) > 0,
        hasAppearance,
        hasSocials,
      };
    },
    enabled: !!store?.id && !dismissed,
  });

  const handleDismiss = () => {
    if (store?.id) {
      localStorage.setItem(`${ONBOARDING_DISMISSED_KEY}-${store.id}`, 'true');
    }
    setDismissed(true);
  };

  if (dismissed || isLoading || !setupData || !store) return null;

  const steps: Step[] = [
    {
      id: 'tos',
      title: 'Sign Terms of Service',
      description: 'Review and accept the seller agreement to activate your store on the marketplace.',
      icon: Scale,
      href: '/seller/documents/terms',
      completed: setupData.tosSigned,
    },
    {
      id: 'appearance',
      title: 'Customize Your Store',
      description: 'Upload a logo and banner to make your store stand out to customers.',
      icon: Palette,
      href: '/seller/settings/appearance',
      completed: setupData.hasAppearance,
    },
    {
      id: 'categories',
      title: 'Enable Categories',
      description: 'Choose which product categories your store will sell in.',
      icon: LayoutGrid,
      href: '/seller/categories',
      completed: setupData.categoriesEnabled,
    },
    {
      id: 'roblox',
      title: 'Add Roblox Marketplace Link',
      description: 'Link your Roblox creator store so customers can find your marketplace.',
      icon: Gamepad2,
      href: '/seller/settings/profile',
      completed: !!store.roblox_url,
    },
    {
      id: 'socials',
      title: 'Add Social Links',
      description: 'Connect your Discord, website, or social accounts so customers can find you.',
      icon: LinkIcon,
      href: '/seller/settings/profile',
      completed: setupData.hasSocials,
    },
    {
      id: 'products',
      title: 'List Your First Product',
      description: 'Create your first product listing and start selling.',
      icon: Package,
      href: '/seller/products/new',
      completed: setupData.hasProducts,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allComplete = completedCount === steps.length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // Find next incomplete step
  const nextStep = steps.find((s) => !s.completed);

  return (
    <Dialog open={!dismissed} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              {allComplete ? (
                <PartyPopper className="h-6 w-6 text-primary" />
              ) : (
                <Rocket className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg">
                {allComplete ? 'You\'re all set!' : 'Welcome to your store!'}
              </DialogTitle>
              <DialogDescription>
                {allComplete
                  ? 'Your store is fully set up and ready for customers.'
                  : 'Complete these steps to get your store ready for customers.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Setup progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-2 mt-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                step.completed
                  ? 'bg-muted/30 border-border opacity-70'
                  : step.id === nextStep?.id
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-card border-border'
              )}
            >
              <div className="mt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold',
                      step.id === nextStep?.id
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground/40 text-muted-foreground/40'
                    )}
                  >
                    {index + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.completed && 'line-through text-muted-foreground'
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
              {!step.completed && (
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" asChild>
                  <Link to={step.href} onClick={handleDismiss}>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            {allComplete ? 'Close' : 'Skip for now'}
          </Button>
          {nextStep && (
            <Button size="sm" asChild>
              <Link to={nextStep.href} onClick={handleDismiss}>
                {nextStep.title}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
