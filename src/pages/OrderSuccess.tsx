import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Download, Mail, ArrowRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  return (
    <MainLayout>
      <div className="container py-16 max-w-2xl text-center space-y-8">
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
                Download links have been sent to your email address
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Instant access</p>
              <p className="text-sm text-muted-foreground">
                You can also download your files from your account dashboard
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
            <Link to="/account">View My Orders</Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
