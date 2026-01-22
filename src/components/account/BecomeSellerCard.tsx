import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, Sparkles, Clock, XCircle, CheckCircle, ExternalLink, AlertCircle, Loader2, Shield, Users, Award, Mail, ShoppingBag, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useSellerVerification, VerificationResults } from '@/hooks/useSellerVerification';
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
  const [discordServerInvite, setDiscordServerInvite] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Verification hook
  const {
    verificationResults,
    settings,
    discordValidating,
    validateDiscordInvite,
    allRequirementsMet,
    userProfile,
  } = useSellerVerification();

  // Validate Discord invite on blur
  const handleDiscordBlur = () => {
    if (discordServerInvite.trim()) {
      validateDiscordInvite(discordServerInvite);
    }
  };

  // Check if user has linked accounts
  const { data: linkedAccountsData } = useQuery({
    queryKey: ['user-profile-linked-accounts', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('discord_id, discord_username, roblox_user_id, roblox_username')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const hasDiscordLinked = !!(linkedAccountsData?.discord_id && linkedAccountsData?.discord_username);
  const hasRobloxLinked = !!(linkedAccountsData?.roblox_user_id && linkedAccountsData?.roblox_username);
  const hasRequiredAccounts = hasDiscordLinked && hasRobloxLinked;

  const submitApplication = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!ageConfirmed) throw new Error('You must confirm your age');
      if (!termsAccepted) throw new Error('You must accept the seller terms');
      if (!discordServerInvite.trim()) throw new Error('Discord server invite is required');

      // Check if Discord invite is valid
      if (!verificationResults.discord_server?.valid) {
        throw new Error('Please provide a valid Discord server invite');
      }
      if (!verificationResults.discord_server?.is_permanent) {
        throw new Error('Discord invite must be permanent (no expiration)');
      }

      const { error } = await supabase.from('store_applications').insert({
        user_id: user.id,
        store_name: storeName.trim(),
        store_description: storeDescription.trim() || null,
        product_category: productCategory || null,
        discord_server_invite: discordServerInvite.trim(),
        age_confirmed: ageConfirmed,
        terms_accepted: termsAccepted,
        terms_accepted_at: new Date().toISOString(),
        verification_results: verificationResults as any,
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
    setDiscordServerInvite('');
    setAgeConfirmed(false);
    setTermsAccepted(false);
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
              discordServerInvite={discordServerInvite}
              setDiscordServerInvite={setDiscordServerInvite}
              ageConfirmed={ageConfirmed}
              setAgeConfirmed={setAgeConfirmed}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              onSubmit={() => submitApplication.mutate()}
              isSubmitting={submitApplication.isPending}
              onDiscordBlur={handleDiscordBlur}
              discordValidating={discordValidating}
              verificationResults={verificationResults}
              settings={settings}
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
        {/* Linked Accounts Requirement */}
        {!hasRequiredAccounts && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Account Linking Required</p>
              <p className="text-sm mb-3">
                To become a seller, you must link both your Discord and Roblox accounts. This helps us verify your identity and provide support.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {hasDiscordLinked ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">Discord {hasDiscordLinked ? `(${linkedAccountsData?.discord_username})` : '- Not linked'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasRobloxLinked ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">Roblox {hasRobloxLinked ? `(${linkedAccountsData?.roblox_username})` : '- Not linked'}</span>
                </div>
              </div>
              <p className="text-sm mt-3 text-muted-foreground">
                Link your accounts in the Profile Details section above.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Keep 85% of net sales</p>
              <p className="text-xs text-muted-foreground">After payment processing fees</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Transparent fee structure</p>
              <p className="text-xs text-muted-foreground">See exactly what you'll earn per sale</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Easy payouts via Stripe or PayPal</p>
              <p className="text-xs text-muted-foreground">Get paid directly to your account</p>
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
            <Button className="w-full" size="lg" disabled={!hasRequiredAccounts}>
              <Store className="h-4 w-4 mr-2" />
              {hasRequiredAccounts ? 'Apply to Become a Seller' : 'Link Accounts to Apply'}
            </Button>
          </DialogTrigger>
          <ApplicationFormDialog
            storeName={storeName}
            setStoreName={setStoreName}
            storeDescription={storeDescription}
            setStoreDescription={setStoreDescription}
            productCategory={productCategory}
            setProductCategory={setProductCategory}
            discordServerInvite={discordServerInvite}
            setDiscordServerInvite={setDiscordServerInvite}
            ageConfirmed={ageConfirmed}
            setAgeConfirmed={setAgeConfirmed}
            termsAccepted={termsAccepted}
            setTermsAccepted={setTermsAccepted}
            onSubmit={() => submitApplication.mutate()}
            isSubmitting={submitApplication.isPending}
            onDiscordBlur={handleDiscordBlur}
            discordValidating={discordValidating}
            verificationResults={verificationResults}
            settings={settings}
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
  discordServerInvite: string;
  setDiscordServerInvite: (value: string) => void;
  ageConfirmed: boolean;
  setAgeConfirmed: (value: boolean) => void;
  termsAccepted: boolean;
  setTermsAccepted: (value: boolean) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  onDiscordBlur: () => void;
  discordValidating: boolean;
  verificationResults: VerificationResults;
  settings: any;
}

function ApplicationFormDialog({
  storeName,
  setStoreName,
  storeDescription,
  setStoreDescription,
  productCategory,
  setProductCategory,
  discordServerInvite,
  setDiscordServerInvite,
  ageConfirmed,
  setAgeConfirmed,
  termsAccepted,
  setTermsAccepted,
  onSubmit,
  isSubmitting,
  onDiscordBlur,
  discordValidating,
  verificationResults,
  settings,
}: ApplicationFormDialogProps) {
  // Calculate verification progress
  const getVerificationStatus = () => {
    let passed = 0;
    let total = 0;

    // Account age
    total++;
    if (verificationResults.account_age?.meets_requirement) passed++;

    // Email verified
    total++;
    if (verificationResults.email_verified) passed++;

    // Purchase history (only if required)
    if (settings.seller_min_purchases_required > 0) {
      total++;
      if (verificationResults.purchase_history?.meets_requirement) passed++;
    }

    // Group membership (only if required)
    if (settings.seller_require_group_membership) {
      total++;
      if (verificationResults.roblox_group?.in_group) passed++;
    }

    // Badge ownership (only if required)
    if (settings.seller_require_badge_ownership) {
      total++;
      if (verificationResults.roblox_badges?.all_owned) passed++;
    }

    // Discord server
    total++;
    if (verificationResults.discord_server?.valid && verificationResults.discord_server?.is_permanent) passed++;

    return { passed, total, percentage: total > 0 ? Math.round((passed / total) * 100) : 0 };
  };

  const status = getVerificationStatus();

  const canSubmit = 
    storeName.trim() && 
    discordServerInvite.trim() && 
    ageConfirmed && 
    termsAccepted &&
    verificationResults.discord_server?.valid &&
    verificationResults.discord_server?.is_permanent &&
    verificationResults.account_age?.meets_requirement &&
    verificationResults.email_verified &&
    (!settings.seller_require_group_membership || verificationResults.roblox_group?.in_group) &&
    (!settings.seller_require_badge_ownership || verificationResults.roblox_badges?.all_owned) &&
    (settings.seller_min_purchases_required === 0 || verificationResults.purchase_history?.meets_requirement);

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
        {/* Verification Status Section */}
        <Card className="border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Progress value={status.percentage} className="flex-1" />
              <span className="text-sm font-medium">{status.passed}/{status.total}</span>
            </div>

            <div className="grid gap-2 text-sm">
              {/* Account Age */}
              <VerificationItem
                icon={Clock}
                label={`Account Age (${verificationResults.account_age?.days || 0} days)`}
                passed={verificationResults.account_age?.meets_requirement}
                required={true}
                detail={`Minimum ${settings.seller_min_account_age_days} days required`}
              />

              {/* Email Verified */}
              <VerificationItem
                icon={Mail}
                label="Email Verified"
                passed={verificationResults.email_verified}
                required={true}
              />

              {/* Purchase History */}
              {settings.seller_min_purchases_required > 0 && (
                <VerificationItem
                  icon={ShoppingBag}
                  label={`Purchase History (${verificationResults.purchase_history?.count || 0} orders)`}
                  passed={verificationResults.purchase_history?.meets_requirement}
                  required={true}
                  detail={`Minimum ${settings.seller_min_purchases_required} purchases required`}
                />
              )}

              {/* Group Membership */}
              {settings.seller_require_group_membership && (
                <VerificationItem
                  icon={Users}
                  label="Eclipse Group Member"
                  passed={verificationResults.roblox_group?.in_group}
                  required={true}
                  detail={verificationResults.roblox_group?.role ? `Role: ${verificationResults.roblox_group.role}` : undefined}
                />
              )}

              {/* Badge Ownership */}
              {settings.seller_require_badge_ownership && settings.roblox_required_badges?.length > 0 && (
                <VerificationItem
                  icon={Award}
                  label={`Required Badges (${verificationResults.roblox_badges?.owned.length || 0}/${settings.roblox_required_badges?.length || 0})`}
                  passed={verificationResults.roblox_badges?.all_owned}
                  required={true}
                />
              )}

              {/* Identity Consistency */}
              {verificationResults.identity_consistency && (
                <VerificationItem
                  icon={UserCheck}
                  label={`Identity Check (${verificationResults.identity_consistency.similarity_score}% match)`}
                  passed={verificationResults.identity_consistency.is_consistent}
                  required={false}
                  detail="Discord & Roblox username similarity"
                />
              )}
            </div>
          </CardContent>
        </Card>

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
          <Label htmlFor="discordServerInvite">Discord Server Invite Link *</Label>
          <div className="relative">
            <Input
              id="discordServerInvite"
              placeholder="https://discord.gg/your-server"
              value={discordServerInvite}
              onChange={(e) => setDiscordServerInvite(e.target.value)}
              onBlur={onDiscordBlur}
              required
              className={
                verificationResults.discord_server?.valid
                  ? 'border-green-500 pr-10'
                  : verificationResults.discord_server?.error
                  ? 'border-destructive pr-10'
                  : ''
              }
            />
            {discordValidating && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!discordValidating && verificationResults.discord_server?.valid && (
              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
            {!discordValidating && verificationResults.discord_server?.error && (
              <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
            )}
          </div>

          {/* Discord Server Preview */}
          {verificationResults.discord_server?.valid && verificationResults.discord_server?.guild_name && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">{verificationResults.discord_server.guild_name}</span>
              </div>
              {verificationResults.discord_server.member_count && (
                <p className="text-xs text-muted-foreground mt-1">
                  {verificationResults.discord_server.member_count.toLocaleString()} members
                </p>
              )}
              {verificationResults.discord_server.is_permanent && (
                <Badge variant="outline" className="mt-2 text-xs">Permanent Invite</Badge>
              )}
            </div>
          )}

          {/* Discord Error */}
          {verificationResults.discord_server?.error && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {verificationResults.discord_server.error}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Must be a permanent invite (no expiration or member limits).
          </p>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="ageConfirm"
              checked={ageConfirmed}
              onCheckedChange={(checked) => setAgeConfirmed(checked as boolean)}
            />
            <Label htmlFor="ageConfirm" className="text-sm leading-normal cursor-pointer">
              I confirm I am at least 13 years old. I understand that sellers must be 18+ to receive payouts.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="termsAccept"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <Label htmlFor="termsAccept" className="text-sm leading-normal cursor-pointer">
              I agree to the{' '}
              <Link to="/seller/terms" className="text-primary hover:underline" target="_blank">
                Seller Terms of Service
              </Link>{' '}
              and the 15% platform commission on net sales.
            </Label>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </Button>

        {!canSubmit && storeName.trim() && discordServerInvite.trim() && ageConfirmed && termsAccepted && (
          <p className="text-xs text-center text-muted-foreground">
            Complete all verification requirements above to submit
          </p>
        )}
      </form>
    </DialogContent>
  );
}

interface VerificationItemProps {
  icon: React.ElementType;
  label: string;
  passed?: boolean;
  required: boolean;
  detail?: string;
}

function VerificationItem({ icon: Icon, label, passed, required, detail }: VerificationItemProps) {
  return (
    <div className="flex items-center gap-2">
      {passed ? (
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
      ) : passed === false ? (
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
      )}
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <span className={passed ? 'text-green-600 dark:text-green-400' : passed === false ? 'text-destructive' : ''}>
          {label}
        </span>
        {!required && (
          <Badge variant="outline" className="ml-2 text-xs py-0">Optional</Badge>
        )}
        {detail && <p className="text-xs text-muted-foreground truncate">{detail}</p>}
      </div>
    </div>
  );
}
