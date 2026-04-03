import { Store, Sparkles, Clock, XCircle, CheckCircle, ExternalLink, ArrowRight, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const applicationSteps = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'review', label: 'Under Review' },
  { key: 'decision', label: 'Decision' },
  { key: 'setup', label: 'Store Setup' },
];

function ApplicationTimeline({ application }: { application: any }) {
  const createdAt = application?.created_at ? new Date(application.created_at) : null;
  const daysSince = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  // If submitted < 2 days ago, show as "Under Review", otherwise still reviewing
  const currentStepIndex = 1; // Always at review stage for pending

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {applicationSteps.slice(0, 3).map((step, i) => (
          <div key={step.key} className="flex items-center gap-1.5">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium',
              i < currentStepIndex && 'bg-green-500/10 text-green-500',
              i === currentStepIndex && 'bg-primary/10 text-primary ring-2 ring-primary/30',
              i > currentStepIndex && 'bg-muted text-muted-foreground'
            )}>
              {i < currentStepIndex ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn(
              'text-[10px] font-medium',
              i === currentStepIndex ? 'text-primary' : 'text-muted-foreground'
            )}>
              {step.label}
            </span>
            {i < 2 && <div className="w-4 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>
          Submitted {createdAt?.toLocaleDateString()} · {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
          {daysSince < 2 && ' · Expected response within 24-48h'}
        </span>
      </div>
    </div>
  );
}

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

  // User has a pending application — with timeline
  if (hasPendingApplication && application) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-amber-500" />
            Seller Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium text-sm">{application.store_name}</p>
          </div>
          
          <ApplicationTimeline application={application} />
          
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Our team is reviewing your application. You'll receive a notification once a decision is made.
            </p>
          </div>
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
            <span className="text-sm">Keep 85% of every sale</span>
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
