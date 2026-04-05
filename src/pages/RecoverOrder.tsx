import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GuestSupportForm } from '@/components/support/GuestSupportForm';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Package, ArrowLeft, Mail, Copy, ClipboardPaste, AlertCircle } from 'lucide-react';
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

  const steps = [
    { icon: Mail, label: 'Check your email receipt' },
    { icon: Copy, label: 'Copy the reference starting with pi_ or cs_' },
    { icon: ClipboardPaste, label: 'Paste it below' },
  ];

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-12 max-w-lg space-y-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/support"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Support</Link>
          </Button>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/30 px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold">Recover a Missing Order</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Sign in to recover your order, or submit a support ticket below.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">You need to be signed in to automatically recover an order.</p>
                <Button asChild>
                  <Link to="/auth">Sign In to Recover</Link>
                </Button>
              </div>
              <div className="border-t border-border pt-6">
                <p className="text-sm font-medium mb-3">Can't sign in? Submit a ticket instead</p>
                <GuestSupportForm />
              </div>
            </div>
          </div>
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

        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/30 px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Recover a Missing Order</h1>
                <p className="text-sm text-muted-foreground mt-0.5">If you completed a payment but can't see your order, enter your payment reference to link it.</p>
              </div>
            </div>
          </div>

          {/* Step guide */}
          <div className="px-6 py-4 border-b border-border bg-muted/10">
            <div className="flex items-center gap-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{step.label}</span>
                  {i < steps.length - 1 && <span className="text-muted-foreground/40 flex-shrink-0">→</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
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
                  You can find this in your payment confirmation email.
                </p>
              </div>

              <Button type="submit" disabled={isLoading || !paymentRef.trim()} className="w-full">
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : 'Recover Order'}
              </Button>
            </form>

            {result && (
              <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'border-green-500/20 bg-green-500/5' : 'border-destructive/20 bg-destructive/5'}`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-2">
                    <p className={`text-sm font-medium ${result.success ? 'text-green-500' : 'text-destructive'}`}>{result.message}</p>
                    {result.success && result.orderId && (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/account?tab=downloads">View My Downloads</Link>
                      </Button>
                    )}
                    {!result.success && (
                      <p className="text-xs text-muted-foreground">
                        Double-check the reference, or <Link to="/support" className="text-primary hover:underline">contact support</Link> for help.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Still having trouble? <Link to="/support" className="text-primary hover:underline">Contact support</Link> and we'll help you out.
        </p>
      </div>
    </MainLayout>
  );
}
