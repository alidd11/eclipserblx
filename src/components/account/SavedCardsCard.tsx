import { useState } from 'react';
import { CreditCard, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useSavedPaymentMethods, SavedPaymentMethod } from '@/hooks/useSavedPaymentMethods';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';

// Card brand icons
function CardBrandIcon({ brand }: { brand: string }) {
  const brandLower = brand.toLowerCase();
  
  if (brandLower === 'visa') {
    return (
      <div className="w-10 h-6 bg-[#1A1F71] rounded flex items-center justify-center">
        <span className="text-[10px] font-bold text-white italic">VISA</span>
      </div>
    );
  }
  
  if (brandLower === 'mastercard') {
    return (
      <div className="w-10 h-6 flex items-center justify-center">
        <div className="relative w-6 h-6">
          <div className="absolute left-0 w-4 h-4 rounded-full bg-[#EB001B]" />
          <div className="absolute right-0 w-4 h-4 rounded-full bg-[#F79E1B]" />
        </div>
      </div>
    );
  }
  
  if (brandLower === 'amex' || brandLower === 'american_express') {
    return (
      <div className="w-10 h-6 bg-[#006FCF] rounded flex items-center justify-center">
        <span className="text-[8px] font-bold text-white">AMEX</span>
      </div>
    );
  }
  
  return (
    <div className="w-10 h-6 bg-muted rounded flex items-center justify-center">
      <CreditCard className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export function SavedCardsCard() {
  const { session } = useAuth();
  const { paymentMethods, isLoading, refetch } = useSavedPaymentMethods();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<SavedPaymentMethod | null>(null);

  const handleDeleteCard = async () => {
    if (!cardToDelete || !session?.access_token) return;
    
    setDeletingId(cardToDelete.id);
    setCardToDelete(null);

    try {
      const { error } = await supabase.functions.invoke('delete-payment-method', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { paymentMethodId: cardToDelete.id },
      });

      if (error) throw error;

      showSuccessNotification('Card Removed', `Card ending in ${cardToDelete.last4} has been removed`);
      refetch();
    } catch (err: any) {
      console.error('Error deleting payment method:', err);
      showErrorNotification('Error', err.message || 'Failed to remove card');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Saved Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No saved payment methods</p>
              <p className="text-sm mt-1">Cards will be saved when you make a purchase</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CardBrandIcon brand={method.brand} />
                    <div>
                      <p className="font-medium">
                        {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear.toString().slice(-2)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setCardToDelete(method)}
                    disabled={deletingId === method.id}
                  >
                    {deletingId === method.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the card ending in {cardToDelete?.last4}? 
              You can add it again during your next purchase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
