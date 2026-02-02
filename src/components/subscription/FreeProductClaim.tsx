import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Loader2, Check, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FreeProductClaimProps {
  productId: string;
  productName: string;
  categoryId?: string | null;
  isResellable?: boolean;
  eclipseFreeEligible?: boolean;
  onClaimed?: () => void;
}

export function FreeProductClaim({ 
  productId, 
  productName, 
  categoryId,
  isResellable,
  eclipseFreeEligible,
  onClaimed 
}: FreeProductClaimProps) {
  const navigate = useNavigate();
  const { 
    isSubscribed, 
    canClaimFree, 
    claimedProductId,
    isLoading,
    claimFreeProduct,
    isEligibleForFreeClaim,
  } = useSubscription();
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Don't show anything if not subscribed or still loading
  if (isLoading || !isSubscribed) {
    return null;
  }

  // Check if this product is eligible for free claim (not resellable, seller allows it)
  const isEligible = isEligibleForFreeClaim(categoryId, isResellable, eclipseFreeEligible);
  
  // Don't show if product is not eligible (e.g., bot products or resellable)
  if (!isEligible) {
    return null;
  }

  // Check if this specific product was already claimed
  const isThisProductClaimed = claimedProductId === productId;

  // Don't show claim button if user already claimed a different product this month
  if (!canClaimFree && !isThisProductClaimed) {
    return null;
  }

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await claimFreeProduct(productId);
      toast({
        title: 'Product Claimed!',
        description: `"${productName}" has been added to your downloads for free.`,
      });
      onClaimed?.();
      setShowConfirm(false);
      // Redirect to downloads page after successful claim
      navigate('/downloads');
    } catch (error) {
      toast({
        title: 'Claim Failed',
        description: error instanceof Error ? error.message : 'Failed to claim product',
        variant: 'destructive',
      });
      setIsClaiming(false);
      setShowConfirm(false);
    }
  };

  if (isThisProductClaimed) {
    return (
      <Button variant="secondary" disabled className="w-full">
        <Check className="h-4 w-4 mr-2" />
        Claimed This Month
      </Button>
    );
  }

  return (
    <>
      <Button 
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
        onClick={() => setShowConfirm(true)}
        disabled={isClaiming}
      >
        {isClaiming ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Claiming...
          </>
        ) : (
          <>
            <Gift className="h-4 w-4 mr-2" />
            Claim Free (Eclipse+)
          </>
        )}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Claim Your Free Product
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You're about to claim <strong>"{productName}"</strong> as your free Eclipse+ product this month.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                ⚠️ This is your only free product claim for this month. Make sure this is the product you want!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClaiming}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClaim}
              disabled={isClaiming}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Confirm Claim
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
