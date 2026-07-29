import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Mail, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useBadges } from '@/hooks/useBadges';
import { useCurrency } from '@/hooks/useCurrency';
import { ConfettiCelebration } from '@/components/ui/ConfettiCelebration';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from 'react-i18next';

export default function OrderSuccess() {
  usePageTracking({ pagePath: '/order-success' });
  usePageMeta({ title: 'Order Confirmed', description: 'Thank you for your purchase on Eclipse — your order is being processed and downloads will be available shortly.' });
  const { t } = useTranslation();
  const { checkBadges } = useBadges();
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  const sessionId = searchParams.get('session_id');
  const paymentIntentId = searchParams.get('payment_intent');
  const orderId = searchParams.get('order_id') || searchParams.get('id');
  
  const [verifiedOrderId, setVerifiedOrderId] = useState<string | null>(orderId);
  const [isVerifying, setIsVerifying] = useState(!!(sessionId || paymentIntentId) && !orderId);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const hasVerified = useRef(false);
  const hasCleared = useRef(false);

  const stableClearCart = useCallback(() => {
    if (!hasCleared.current) {
      hasCleared.current = true;
      clearCart();
    }
  }, [clearCart]);

  useEffect(() => {
    const verifyPayment = async () => {
      if (hasVerified.current || orderId || (!sessionId && !paymentIntentId)) {
        setIsVerifying(false);
        return;
      }
      
      hasVerified.current = true;
      setIsVerifying(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { 
            sessionId: sessionId || undefined,
            paymentIntentId: paymentIntentId || undefined,
          },
        });
        
        if (error) throw error;
        
        if (data?.success && data?.orderId) {
          setVerifiedOrderId(data.orderId);
          setVerificationFailed(false);
          stableClearCart();
          checkBadges();
          setShowConfetti(true);
        } else if (!data?.success) {
          console.error('Payment not completed:', data?.message);
          setVerificationFailed(true);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationFailed(true);
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyPayment();
  }, [sessionId, paymentIntentId, orderId, stableClearCart, checkBadges]);

  const { data: order, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', verifiedOrderId],
    queryFn: async () => {
      if (!verifiedOrderId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', verifiedOrderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!verifiedOrderId,
  });

  // Silent health check: if order exists but isn't linked, try to claim it
  useEffect(() => {
    const healthCheck = async () => {
      if (!verifiedOrderId || !paymentIntentId) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('id', verifiedOrderId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        // If we can't see the order via RLS, it might be orphaned — try claiming
        if (!existingOrder && paymentIntentId) {
          await supabase.functions.invoke('claim-order', {
            body: { paymentIntentId },
          });
        }
      } catch {
        // Silent — don't disrupt the success page
      }
    };
    healthCheck();
  }, [verifiedOrderId, paymentIntentId]);

  useEffect(() => {
    if (!sessionId && !paymentIntentId && !orderId) {
      navigate('/');
    }
  }, [sessionId, paymentIntentId, orderId, navigate]);

  const isLoading = isVerifying || isLoadingOrder;

  return (
    <MainLayout>
      <ConfettiCelebration isActive={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div className="container py-16 max-w-2xl text-center space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('orderSuccess.verifying')}</p>
          </div>
        ) : verificationFailed && !verifiedOrderId ? (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 text-destructive">
              <XCircle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold">{t('orderSuccess.failedTitle')}</h1>
              <p className="text-muted-foreground">
                {t('orderSuccess.failedDesc')}
              </p>
            </div>

            <div className="border border-border rounded-xl bg-card p-5 text-left space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('orderSuccess.failedHelp')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="gradient-button border-0">
                <Link to="/cart">{t('orderSuccess.returnToCart')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/support">{t('orderSuccess.contactSupport')}</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 text-success">
              <CheckCircle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold">{t('orderSuccess.title')}</h1>
              <p className="text-muted-foreground">
                {t('orderSuccess.subtitle')}
              </p>
            </div>

            {order && (
              <div className="border border-border rounded-xl bg-card p-5 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('orderSuccess.orderId')}</span>
                  <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('orderSuccess.date')}</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {order.payment_method === 'credits' ? t('orderSuccess.creditsUsed') : t('orderSuccess.total')}
                  </span>
                  <span className="font-bold">
                    {order.payment_method === 'credits' 
                      ? t('orderSuccess.creditsAmount', { amount: Number(order.total).toFixed(2) })
                      : formatPrice(Number(order.total))
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('orderSuccess.status')}</span>
                  <span className="text-success font-medium">{t('orderSuccess.paid')}</span>
                </div>
              </div>
            )}

            <div className="border border-border rounded-xl bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">{t('orderSuccess.checkEmail')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('orderSuccess.checkEmailDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">{t('orderSuccess.instantAccess')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('orderSuccess.instantAccessDesc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="gradient-button border-0">
                <Link to="/downloads">{t('orderSuccess.viewDownloads')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/products">
                  {t('orderSuccess.continueShopping')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
