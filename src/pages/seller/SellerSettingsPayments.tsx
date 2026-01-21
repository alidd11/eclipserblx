import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  BarChart3,
  Wallet,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { EarningsCalculator } from '@/components/seller/EarningsCalculator';

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'EG', name: 'Egypt' },
  { code: 'OTHER', name: 'Other' },
];

export default function SellerSettingsPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

  // Payout method state
  const [payoutMethod, setPayoutMethod] = useState<'stripe' | 'paypal' | 'bank_transfer'>(
    store?.payout_method === 'paypal' ? 'paypal' : 
    store?.payout_method === 'bank_transfer' ? 'bank_transfer' : 'stripe'
  );
  const [paypalEmail, setPaypalEmail] = useState(store?.paypal_email || '');
  
  // Bank transfer fields
  const [bankName, setBankName] = useState(store?.bank_name || '');
  const [bankAccountHolder, setBankAccountHolder] = useState(store?.bank_account_holder || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(store?.bank_account_number || '');
  const [bankRoutingNumber, setBankRoutingNumber] = useState(store?.bank_routing_number || '');
  const [bankSwiftBic, setBankSwiftBic] = useState(store?.bank_swift_bic || '');
  const [bankCountry, setBankCountry] = useState(store?.bank_country || '');

  const stripeOnboardingComplete = searchParams.get('stripe_onboarding') === 'complete';

  // Sync state when store loads
  useEffect(() => {
    if (store) {
      setPayoutMethod(
        store.payout_method === 'paypal' ? 'paypal' : 
        store.payout_method === 'bank_transfer' ? 'bank_transfer' : 'stripe'
      );
      setPaypalEmail(store.paypal_email || '');
      setBankName(store.bank_name || '');
      setBankAccountHolder(store.bank_account_holder || '');
      setBankAccountNumber(store.bank_account_number || '');
      setBankRoutingNumber(store.bank_routing_number || '');
      setBankSwiftBic(store.bank_swift_bic || '');
      setBankCountry(store.bank_country || '');
    }
  }, [store]);

  const { data: connectStatus, refetch: refetchConnectStatus, isLoading: connectStatusLoading } = useQuery({
    queryKey: ['connect-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (error) throw error;
      return data as {
        hasAccount: boolean;
        isOnboarded: boolean;
        canReceivePayments: boolean;
        chargesEnabled: boolean;
        accountId: string | null;
      };
    },
    enabled: !!user && isSeller,
    staleTime: 0,
  });

  useEffect(() => {
    if (stripeOnboardingComplete) {
      setSearchParams({});
      refetchConnectStatus();
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    }
  }, [stripeOnboardingComplete, refetchConnectStatus, queryClient, setSearchParams]);

  const setupStripeConnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: { store_id: store?.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error('Failed to setup Stripe Connect: ' + error.message);
    },
  });

  const updatePayoutMethod = useMutation({
    mutationFn: async ({ 
      method, 
      email,
      bankDetails 
    }: { 
      method: 'stripe' | 'paypal' | 'bank_transfer'; 
      email?: string;
      bankDetails?: {
        bank_name: string;
        bank_account_holder: string;
        bank_account_number: string;
        bank_routing_number: string;
        bank_swift_bic: string;
        bank_country: string;
      };
    }) => {
      if (!store?.id) throw new Error('Store not found');
      
      if (method === 'paypal' && !email?.trim()) {
        throw new Error('PayPal email is required');
      }

      if (method === 'bank_transfer') {
        if (!bankDetails?.bank_name?.trim()) throw new Error('Bank name is required');
        if (!bankDetails?.bank_account_holder?.trim()) throw new Error('Account holder name is required');
        if (!bankDetails?.bank_account_number?.trim()) throw new Error('Account number is required');
        if (!bankDetails?.bank_country?.trim()) throw new Error('Country is required');
      }

      const updateData: Record<string, unknown> = {
        payout_method: method,
        paypal_email: method === 'paypal' ? email?.trim() : null,
        bank_name: method === 'bank_transfer' ? bankDetails?.bank_name?.trim() : null,
        bank_account_holder: method === 'bank_transfer' ? bankDetails?.bank_account_holder?.trim() : null,
        bank_account_number: method === 'bank_transfer' ? bankDetails?.bank_account_number?.trim() : null,
        bank_routing_number: method === 'bank_transfer' ? bankDetails?.bank_routing_number?.trim() || null : null,
        bank_swift_bic: method === 'bank_transfer' ? bankDetails?.bank_swift_bic?.trim() || null : null,
        bank_country: method === 'bank_transfer' ? bankDetails?.bank_country : null,
      };

      const { error } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
      toast.success('Payout method updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update payout method');
    },
  });

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Payments & Earnings</h1>
          <p className="text-muted-foreground">
            Manage your payment setup and view earnings
          </p>
        </div>

        <div className="space-y-6">
          {/* Stripe Connect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Connect
              </CardTitle>
              <CardDescription>
                Connect your Stripe account to receive automatic payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectStatusLoading ? (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <div className="flex-1">
                    <p className="font-medium">Checking payment status...</p>
                  </div>
                </div>
              ) : connectStatus?.canReceivePayments || store?.payouts_enabled ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">Stripe Connect Active</p>
                    <p className="text-sm text-muted-foreground">
                      Your account is set up to receive payouts
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                      Dashboard
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </div>
              ) : connectStatus?.hasAccount || store?.stripe_account_id ? (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium">Setup Incomplete</p>
                    <p className="text-sm text-muted-foreground">
                      Please complete your Stripe Connect onboarding
                    </p>
                  </div>
                  <Button 
                    variant="default"
                    onClick={() => setupStripeConnect.mutate()}
                    disabled={setupStripeConnect.isPending}
                  >
                    {setupStripeConnect.isPending ? 'Loading...' : 'Complete Setup'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Connect Stripe</p>
                    <p className="text-sm text-muted-foreground">
                      Set up Stripe Connect to receive payouts for your sales
                    </p>
                  </div>
                  <Button 
                    variant="default"
                    onClick={() => setupStripeConnect.mutate()}
                    disabled={setupStripeConnect.isPending}
                  >
                    {setupStripeConnect.isPending ? 'Loading...' : 'Connect Stripe'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alternative Payout Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Payout Method
              </CardTitle>
              <CardDescription>
                Choose how you'd like to receive your earnings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={payoutMethod}
                onValueChange={(value) => setPayoutMethod(value as 'stripe' | 'paypal' | 'bank_transfer')}
                className="space-y-3"
              >
                <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
                  <label htmlFor="stripe" className="flex-1 cursor-pointer">
                    <p className="font-medium">Stripe Connect (Recommended)</p>
                    <p className="text-sm text-muted-foreground">
                      Automatic payouts directly to your bank. Fastest and most reliable.
                    </p>
                  </label>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="paypal" id="paypal" className="mt-1" />
                  <label htmlFor="paypal" className="flex-1 cursor-pointer">
                    <p className="font-medium">PayPal</p>
                    <p className="text-sm text-muted-foreground">
                      Manual payouts via PayPal. Good for regions where Stripe isn't available.
                    </p>
                  </label>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" className="mt-1" />
                  <label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">International Bank Transfer</p>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Manual bank transfers for overseas accounts. Ideal for sellers outside Stripe-supported regions.
                    </p>
                  </label>
                </div>
              </RadioGroup>

              {payoutMethod === 'paypal' && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="paypalEmail">PayPal Email</Label>
                  <Input
                    id="paypalEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Payouts will be sent to this PayPal email address.
                  </p>
                </div>
              )}

              {payoutMethod === 'bank_transfer' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-1">Bank Account Details</p>
                    <p className="text-xs text-muted-foreground">
                      Enter your international bank details for manual payouts.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bankCountry">Country *</Label>
                      <Select value={bankCountry} onValueChange={setBankCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name *</Label>
                      <Input
                        id="bankName"
                        placeholder="e.g. HSBC, Bank of America"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="bankAccountHolder">Account Holder Name *</Label>
                      <Input
                        id="bankAccountHolder"
                        placeholder="Full name as shown on account"
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankAccountNumber">Account Number / IBAN *</Label>
                      <Input
                        id="bankAccountNumber"
                        placeholder="Account number or IBAN"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankRoutingNumber">Routing Number / Sort Code</Label>
                      <Input
                        id="bankRoutingNumber"
                        placeholder="Routing number or sort code"
                        value={bankRoutingNumber}
                        onChange={(e) => setBankRoutingNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="bankSwiftBic">SWIFT / BIC Code</Label>
                      <Input
                        id="bankSwiftBic"
                        placeholder="e.g. HSBCGB2L"
                        value={bankSwiftBic}
                        onChange={(e) => setBankSwiftBic(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Required for international transfers. Usually 8-11 characters.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => updatePayoutMethod.mutate({ 
                  method: payoutMethod, 
                  email: paypalEmail,
                  bankDetails: payoutMethod === 'bank_transfer' ? {
                    bank_name: bankName,
                    bank_account_holder: bankAccountHolder,
                    bank_account_number: bankAccountNumber,
                    bank_routing_number: bankRoutingNumber,
                    bank_swift_bic: bankSwiftBic,
                    bank_country: bankCountry,
                  } : undefined
                })}
                disabled={
                  updatePayoutMethod.isPending || 
                  (payoutMethod === 'paypal' && !paypalEmail.trim()) ||
                  (payoutMethod === 'bank_transfer' && (!bankName.trim() || !bankAccountHolder.trim() || !bankAccountNumber.trim() || !bankCountry))
                }
                className="w-full"
              >
                {updatePayoutMethod.isPending ? 'Saving...' : 'Save Payout Method'}
              </Button>

              {store?.payout_method && (
                <p className="text-sm text-muted-foreground text-center">
                  Current method: <span className="font-medium capitalize">{store.payout_method?.replace('_', ' ')}</span>
                  {store.payout_method === 'paypal' && store.paypal_email && (
                    <span> ({store.paypal_email})</span>
                  )}
                  {store.payout_method === 'bank_transfer' && store.bank_name && (
                    <span> ({store.bank_name})</span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Earnings Calculator */}
          <EarningsCalculator commissionRate={store?.commission_rate || 15} />

          {/* Store Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Store Statistics
              </CardTitle>
              <CardDescription>
                Your store's performance overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{store?.total_sales || 0}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    £{((store?.total_revenue || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{store?.product_count || 0}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">
                    {store?.average_rating ? store.average_rating.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Commission Rate</span>
                <span className="font-medium">{store?.commission_rate || 15}%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium">
                  {store?.created_at ? new Date(store.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SellerLayout>
  );
}
