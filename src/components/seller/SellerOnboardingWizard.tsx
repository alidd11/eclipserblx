import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerOnboarding } from '@/hooks/useSellerOnboarding';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { safeStorage } from '@/lib/safeStorage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Rocket, PartyPopper, ChevronRight, ArrowRight } from 'lucide-react';

const ONBOARDING_DISMISSED_KEY = 'seller-onboarding-dismissed';

export function SellerOnboardingWizard() {
  const { store } = useSellerStatus();
  const { isOnboardingNeeded, progress, allComplete, completedCount, totalSteps } = useSellerOnboarding();
  const [dismissed, setDismissed] = useState(false);

  const storeId = store?.id;
  const isDismissedInStorage = storeId
    ? safeStorage.getItem(`${ONBOARDING_DISMISSED_KEY}-${storeId}`) === 'true'
    : false;

  const handleDismiss = () => {
    if (store?.id) {
      safeStorage.setItem(`${ONBOARDING_DISMISSED_KEY}-${store.id}`, 'true');
    }
    setDismissed(true);
  };

  if (dismissed || isDismissedInStorage || !isOnboardingNeeded || allComplete) return null;

  return (
    <Dialog open={!dismissed && !isDismissedInStorage} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Welcome to your store!</DialogTitle>
              <DialogDescription>
                Complete the setup steps to get your store ready for customers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Setup progress</span>
            <span className="font-medium">{completedCount}/{totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Skip for now
          </Button>
          <Button size="sm" asChild>
            <Link to="/seller/setup" onClick={handleDismiss}>
              Start Setup
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
