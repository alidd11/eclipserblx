import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  // Support session_id (from Stripe Checkout), payment_intent (from Apple/Google Pay), and id (legacy)
  const sessionId = searchParams.get('session_id');
  const paymentIntentId = searchParams.get('payment_intent');
  const orderId = searchParams.get('id');
  
  const [verifiedOrderId, setVerifiedOrderId] = useState<string | null>(orderId);
  const [isVerifying, setIsVerifying] = useState(!!(sessionId || paymentIntentId) && !orderId);
  
  // Use refs to prevent multiple verification calls
  const hasVerified = useRef(false);
  const hasCleared = useRef(false);

  // Memoize clearCart to prevent dependency issues
  const stableClearCart = useCallback(() => {
    if (!hasCleared.current) {
      hasCleared.current = true;
      clearCart();
    }
  }, [clearCart]);

  // Verify payment and create order - only run once
  useEffect(() => {
    const verifyPayment = async () => {
      // Skip if already verified, have order ID, or no payment reference
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
          // Clear the cart after successful payment
          stableClearCart();
        } else if (!data?.success) {
          console.error('Payment not completed:', data?.message);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyPayment();
  }, [sessionId, paymentIntentId, orderId, stableClearCart]);

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

  // If no payment reference, redirect to home
  useEffect(() => {
    if (!sessionId && !paymentIntentId && !orderId) {
      navigate('/');
    }
  }, [sessionId, paymentIntentId, orderId, navigate]);

  const isLoading = isVerifying || isLoadingOrder;

  return (
    <MainLayout>
      <div className="container py-16 max-w-2xl text-center space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying your payment...</p>
          </div>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 text-green-500">
              <CheckCircle className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold">Order Complete!</h1>
              <p className="text-muted-foreground">
                Thank you for your purchase. Your order has been confirmed.
              </p>
            </div>

            {order && (
              <div className="gaming-card p-6 text-left space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span>{order.customer_email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">£{order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-green-500 font-medium">Paid</span>
                </div>
              </div>
            )}

            <div className="gaming-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Check your email</p>
                  <p className="text-sm text-muted-foreground">
                    A confirmation email with your receipt has been sent
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Instant access</p>
                  <p className="text-sm text-muted-foreground">
                    Download your files now from your account
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link to="/products">
                  Continue Shopping
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="gradient-button border-0">
                <Link to="/account?tab=downloads">View My Downloads</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
