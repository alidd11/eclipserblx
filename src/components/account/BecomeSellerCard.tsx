import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Sparkles, Clock, XCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const PRODUCT_CATEGORIES = [
  'Scripts & Code',
  'UI Kits & Assets',
  'Game Templates',
  'Plugins & Tools',
  'Graphics & Models',
  'Audio & Music',
  'Other',
];

export function BecomeSellerCard() {
  const { user } = useAuth();
  const { store, application, hasPendingApplication, applicationRejected, isSeller, loading } = useSellerStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [expectedProducts, setExpectedProducts] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [experience, setExperience] = useState('');

  const submitApplication = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.from('store_applications').insert({
        user_id: user.id,
        store_name: storeName.trim(),
        store_description: storeDescription.trim() || null,
        product_category: productCategory || null,
        expected_products: expectedProducts.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        experience: experience.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted!',
        description: 'We\'ll review your application and get back to you soon.',
      });
      queryClient.invalidateQueries({ queryKey: ['seller-application'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setStoreName('');
    setStoreDescription('');
    setProductCategory('');
    setExpectedProducts('');
    setPortfolioUrl('');
    setExperience('');
  };

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
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
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
            We typically review applications within 24-48 hours. You'll receive a notification once your application has been reviewed.
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
          <p className="text-sm text-muted-foreground">
            You can submit a new application after addressing the feedback above.
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">Apply Again</Button>
            </DialogTrigger>
            <ApplicationFormDialog
              storeName={storeName}
              setStoreName={setStoreName}
              storeDescription={storeDescription}
              setStoreDescription={setStoreDescription}
              productCategory={productCategory}
              setProductCategory={setProductCategory}
              expectedProducts={expectedProducts}
              setExpectedProducts={setExpectedProducts}
              portfolioUrl={portfolioUrl}
              setPortfolioUrl={setPortfolioUrl}
              experience={experience}
              setExperience={setExperience}
              onSubmit={() => submitApplication.mutate()}
              isSubmitting={submitApplication.isPending}
            />
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Default: Show "Become a Seller" CTA
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
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
        <div className="grid gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Keep 85% of your sales</p>
              <p className="text-xs text-muted-foreground">Only 15% platform fee</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Easy payouts via Stripe</p>
              <p className="text-xs text-muted-foreground">Get paid directly to your bank</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Built-in audience</p>
              <p className="text-xs text-muted-foreground">Access to our existing customer base</p>
            </div>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Store className="h-4 w-4 mr-2" />
              Apply to Become a Seller
            </Button>
          </DialogTrigger>
          <ApplicationFormDialog
            storeName={storeName}
            setStoreName={setStoreName}
            storeDescription={storeDescription}
            setStoreDescription={setStoreDescription}
            productCategory={productCategory}
            setProductCategory={setProductCategory}
            expectedProducts={expectedProducts}
            setExpectedProducts={setExpectedProducts}
            portfolioUrl={portfolioUrl}
            setPortfolioUrl={setPortfolioUrl}
            experience={experience}
            setExperience={setExperience}
            onSubmit={() => submitApplication.mutate()}
            isSubmitting={submitApplication.isPending}
          />
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface ApplicationFormDialogProps {
  storeName: string;
  setStoreName: (value: string) => void;
  storeDescription: string;
  setStoreDescription: (value: string) => void;
  productCategory: string;
  setProductCategory: (value: string) => void;
  expectedProducts: string;
  setExpectedProducts: (value: string) => void;
  portfolioUrl: string;
  setPortfolioUrl: (value: string) => void;
  experience: string;
  setExperience: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function ApplicationFormDialog({
  storeName,
  setStoreName,
  storeDescription,
  setStoreDescription,
  productCategory,
  setProductCategory,
  expectedProducts,
  setExpectedProducts,
  portfolioUrl,
  setPortfolioUrl,
  experience,
  setExperience,
  onSubmit,
  isSubmitting,
}: ApplicationFormDialogProps) {
  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Seller Application</DialogTitle>
        <DialogDescription>
          Tell us about yourself and what you'd like to sell
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="storeName">Store Name *</Label>
          <Input
            id="storeName"
            placeholder="My Awesome Store"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="storeDescription">Store Description</Label>
          <Textarea
            id="storeDescription"
            placeholder="Describe your store and what you'll offer..."
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productCategory">Primary Category</Label>
          <Select value={productCategory} onValueChange={setProductCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedProducts">What products will you sell?</Label>
          <Textarea
            id="expectedProducts"
            placeholder="Describe the types of products you plan to sell..."
            value={expectedProducts}
            onChange={(e) => setExpectedProducts(e.target.value)}
            rows={2}
            maxLength={300}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolioUrl">Portfolio / Examples (optional)</Label>
          <Input
            id="portfolioUrl"
            type="url"
            placeholder="https://..."
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience">Previous Experience (optional)</Label>
          <Textarea
            id="experience"
            placeholder="Tell us about any previous selling experience..."
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            rows={2}
            maxLength={300}
          />
        </div>

        <Button type="submit" className="w-full" disabled={!storeName.trim() || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </form>
    </DialogContent>
  );
}
