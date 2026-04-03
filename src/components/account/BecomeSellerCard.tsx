import { Store, Sparkles, Clock, XCircle, CheckCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Link } from 'react-router-dom';

export function BecomeSellerCard() {
  const { user } = useAuth();
  const { store, application, hasPendingApplication, applicationRejected, isSeller, loading } = useSellerStatus();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // User is an approved seller
  if (isSeller && store) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Your Store
          </CardTitle>
          <CardDescription>
            Manage your seller account and products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{store.name}</p>
              <p className="text-sm text-muted-foreground">Store ID: {store.store_id}</p>
            </div>
            <Badge variant={store.is_active ? 'default' : 'secondary'}>
              {store.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{store.product_count}</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{store.total_sales}</p>
              <p className="text-xs text-muted-foreground">Sales</p>
            </div>
            <div>
              <p className="text-2xl font-bold">£{store.total_revenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </div>

          <Button asChild className="w-full">
            <Link to="/seller">
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Seller Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // User has a pending application
  if (hasPendingApplication && application) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Application Pending
          </CardTitle>
          <CardDescription>
            Your seller application is being reviewed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-medium">{application.store_name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted on {new Date(application.created_at).toLocaleDateString()}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            We typically review applications within 24-48 hours.
          </p>
        </CardContent>
      </Card>
    );
  }

  // User's application was rejected
  if (applicationRejected && application) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Application Declined
          </CardTitle>
          <CardDescription>
            Your previous application was not approved
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {application.rejection_reason && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Reason:</p>
              <p className="text-sm text-muted-foreground mt-1">{application.rejection_reason}</p>
            </div>
          )}
          <Button asChild className="w-full">
            <Link to="/become-seller">Apply Again</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default: CTA to apply
  return (
    <Card className="border-border bg-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Start Selling on Eclipse
        </CardTitle>
        <CardDescription>
          Create your own store and sell your digital products
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">Keep 85% of net sales</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">Easy payouts via Stripe or PayPal</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">Built-in audience of buyers</span>
          </div>
        </div>

        <Button asChild className="w-full" size="lg">
          <Link to="/become-seller">
            <Store className="h-4 w-4 mr-2" />
            Apply to Become a Seller
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
