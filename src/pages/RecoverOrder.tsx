import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Package, ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function RecoverOrder() {
  usePageMeta({ title: 'Recover Order', description: 'Recover a missing order by verifying your payment.', canonicalPath: '/recover-order' });
  const { user } = useAuth();
  const [paymentRef, setPaymentRef] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    const trimmed = paymentRef.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setResult(null);

    try {
      const body: Record<string, string> = {};
      if (trimmed.startsWith('pi_')) {
        body.paymentIntentId = trimmed;
      } else if (trimmed.startsWith('cs_')) {
        body.sessionId = trimmed;
      } else {
        // Treat as payment intent ID anyway
        body.paymentIntentId = trimmed;
      }

      const { data, error } = await supabase.functions.invoke('claim-order', { body });

      if (error) throw error;

      if (data?.success) {
        setResult({
          success: true,
          message: data.alreadyLinked
            ? 'This order is already linked to your account.'
            : 'Order successfully recovered and linked to your account!',
          orderId: data.orderId,
        });
      } else {
        setResult({ success: false, message: data?.error || 'Could not recover this order.' });
      }
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong. Please contact support.';
      setResult({ success: false, message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg text-center space-y-4">
          <Package className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold">Recover an Order</h1>
          <p className="text-muted-foreground">Please sign in to recover a missing order.</p>
          <Button asChild className="gradient-button border-0">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-12 max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/support"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Support</Link>
        </Button>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Recover a Missing Order
            </CardTitle>
            <CardDescription>
              If you completed a payment but can't see your order, enter your payment reference below to link it to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecover} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentRef">Payment Reference</Label>
                <Input
                  id="paymentRef"
                  placeholder="e.g. pi_3Abc123..."
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  You can find this in your payment confirmation email from Stripe.
                </p>
              </div>

              <Button type="submit" disabled={isLoading || !paymentRef.trim()} className="w-full gradient-button border-0">
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : 'Recover Order'}
              </Button>
            </form>

            {result && (
              <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
                {result.success && <CheckCircle className="h-5 w-5 text-green-500 mb-2" />}
                <p className={`text-sm ${result.success ? 'text-green-500' : 'text-destructive'}`}>{result.message}</p>
                {result.success && result.orderId && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/account?tab=downloads">View My Downloads</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Still having trouble? <Link to="/support" className="text-primary hover:underline">Contact support</Link> and we'll help you out.
        </p>
      </div>
    </MainLayout>
  );
}
