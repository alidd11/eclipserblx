import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Eye, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
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

export function FileReviewConsentBanner() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [consentProductId, setConsentProductId] = useState<string | null>(null);

  // Fetch products awaiting consent
  const { data: flaggedProducts } = useQuery({
    queryKey: ['seller-flagged-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, moderation_flags, file_review_requested_at, file_review_consented_at')
        .eq('store_id', store.id)
        .eq('moderation_status', 'pending')
        .not('moderation_flags', 'is', null)
        .is('file_review_consented_at', null)
        .not('file_review_requested_at', 'is', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const consentMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ file_review_consented_at: new Date().toISOString() })
        .eq('id', productId)
        .eq('store_id', store?.id);

      if (error) throw error;

      // Mark notification as acknowledged
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('seller_notifications')
          .update({ acknowledged_at: new Date().toISOString() })
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .eq('type', 'file_review');
      }
    },
    onSuccess: () => {
      toast.success('Consent granted — Eclipse staff can now review your file.');
      queryClient.invalidateQueries({ queryKey: ['seller-flagged-products'] });
      queryClient.invalidateQueries({ queryKey: ['seller-notifications'] });
      setConsentProductId(null);
    },
    onError: () => {
      toast.error('Failed to submit consent');
    },
  });

  if (!flaggedProducts?.length) return null;

  return (
    <>
      <div className="space-y-3">
        {flaggedProducts.map((product) => (
          <Card key={product.id} className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">
                      File Review Required
                    </p>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      {product.file_review_requested_at && 
                        formatDistanceToNow(new Date(product.file_review_requested_at), { addSuffix: true })
                      }
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your product <strong>"{product.name}"</strong> has been flagged by our automated security scan. 
                    To proceed with moderation, you must consent to Eclipse staff reviewing the uploaded file.
                  </p>
                  {product.moderation_flags && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(product.moderation_flags as any)?.nsfw_flags?.length > 0 && (
                        <Badge variant="destructive" className="text-xs">NSFW Flagged</Badge>
                      )}
                      {(product.moderation_flags as any)?.lua_risk_level && (
                        <Badge variant="secondary" className="text-xs">
                          Lua: {(product.moderation_flags as any).lua_risk_level} risk
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button 
                className="w-full sm:w-auto"
                onClick={() => setConsentProductId(product.id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Review & Consent
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!consentProductId} onOpenChange={() => setConsentProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Consent to File Review
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p>
                By consenting, you agree to allow Eclipse staff to view and review the downloadable 
                file attached to this product for security and compliance purposes.
              </p>
              <div className="p-3 rounded-lg bg-muted text-sm space-y-2">
                <p className="font-medium text-foreground">What this means:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Eclipse staff will be able to view/download your product file</li>
                  <li>This access is limited to the moderation review process</li>
                  <li>Your file remains private from all other users</li>
                  <li>This consent is recorded for your protection</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Without consent, your product will remain in "pending review" status 
                and will not be visible to customers.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => consentProductId && consentMutation.mutate(consentProductId)}
              disabled={consentMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {consentMutation.isPending ? 'Submitting...' : 'I Consent to File Review'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
