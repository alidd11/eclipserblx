import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, DollarSign, Building2, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import type { PayoutSettings } from './useAffiliateData';
import type { UseMutationResult } from '@tanstack/react-query';

interface PayoutSettingsSectionProps {
  payoutSettings: PayoutSettings;
  setPayoutSettings: React.Dispatch<React.SetStateAction<PayoutSettings>>;
  paypalEmailError: string | null;
  setPaypalEmailError: (v: string | null) => void;
  validateEmail: (email: string) => boolean;
  connectStatusLoading: boolean;
  canUseStripe: boolean;
  isConnectingStripe: boolean;
  handleConnectStripe: () => void;
  connectStripeMutation: UseMutationResult<{ url: string; accountId: string }, Error, void>;
  updatePayoutSettingsMutation: UseMutationResult<void, Error, PayoutSettings>;
}

export function PayoutSettingsSection({
  payoutSettings, setPayoutSettings,
  paypalEmailError, setPaypalEmailError, validateEmail,
  connectStatusLoading, canUseStripe, isConnectingStripe,
  handleConnectStripe, connectStripeMutation, updatePayoutSettingsMutation,
}: PayoutSettingsSectionProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
      <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
        <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Payout Settings
        </h3>
        <p className="text-sm text-muted-foreground">Choose how you want to receive your earnings</p>
      </div>
      <div className="p-4 space-y-6">
        <RadioGroup
          value={payoutSettings.preferred_method}
          onValueChange={(value: 'stripe' | 'paypal' | 'bank_transfer') =>
            setPayoutSettings(prev => ({ ...prev, preferred_method: value }))
          }
          className="space-y-4"
        >
          {/* Stripe */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
            <RadioGroupItem value="stripe" id="payout-stripe" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="payout-stripe" className="font-medium cursor-pointer flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />Stripe Connect (Instant)
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </Label>
              <p className="text-sm text-muted-foreground">Automatic payouts directly to your bank account</p>
              {connectStatusLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking status...</div>
              ) : canUseStripe ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={handleConnectStripe} disabled={isConnectingStripe || connectStripeMutation.isPending}>
                  {isConnectingStripe || connectStripeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Connect Stripe Account
                </Button>
              )}
            </div>
          </div>

          {/* PayPal */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
            <RadioGroupItem value="paypal" id="payout-paypal" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="payout-paypal" className="font-medium cursor-pointer flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />PayPal (Same Day)
              </Label>
              <p className="text-sm text-muted-foreground">Same-day payouts processed by our team</p>
              {payoutSettings.preferred_method === 'paypal' && (
                <div className="max-w-sm">
                  <Label htmlFor="paypal-email" className="text-sm text-muted-foreground">PayPal Email</Label>
                  <Input id="paypal-email" type="email" placeholder="your@email.com" value={payoutSettings.paypal_email}
                    onChange={(e) => {
                      const email = e.target.value;
                      setPayoutSettings(prev => ({ ...prev, paypal_email: email }));
                      setPaypalEmailError(email && !validateEmail(email) ? 'Please enter a valid email address' : null);
                    }}
                    className={`mt-1 ${paypalEmailError ? 'border-destructive' : ''}`}
                  />
                  {paypalEmailError && <p className="text-xs text-destructive mt-1">{paypalEmailError}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Bank Transfer */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
            <RadioGroupItem value="bank_transfer" id="payout-bank" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="payout-bank" className="font-medium cursor-pointer flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500" />Bank Transfer
              </Label>
              <p className="text-sm text-muted-foreground">Direct bank transfer processed by our team</p>
              {payoutSettings.preferred_method === 'bank_transfer' && (
                <div className="grid gap-3 max-w-md pt-2">
                  <div><Label className="text-sm text-muted-foreground">Account Holder Name</Label>
                    <Input placeholder="John Doe" value={payoutSettings.bank_account_holder} onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_account_holder: e.target.value }))} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-sm text-muted-foreground">Account Number</Label>
                      <Input placeholder="12345678" value={payoutSettings.bank_account_number} onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_account_number: e.target.value }))} className="mt-1" /></div>
                    <div><Label className="text-sm text-muted-foreground">Sort Code / Routing</Label>
                      <Input placeholder="12-34-56" value={payoutSettings.bank_routing_number} onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_routing_number: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-sm text-muted-foreground">Bank Name</Label>
                      <Input placeholder="Barclays" value={payoutSettings.bank_name} onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_name: e.target.value }))} className="mt-1" /></div>
                    <div><Label className="text-sm text-muted-foreground">SWIFT/BIC</Label>
                      <Input placeholder="BARCGB22" value={payoutSettings.bank_swift_bic} onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_swift_bic: e.target.value }))} className="mt-1" /></div>
                  </div>
                  <div><Label className="text-sm text-muted-foreground">Country</Label>
                    <Input placeholder="United Kingdom" value={payoutSettings.bank_country} onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_country: e.target.value }))} className="mt-1" /></div>
                </div>
              )}
            </div>
          </div>
        </RadioGroup>

        <Separator />

        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (payoutSettings.paypal_email && !validateEmail(payoutSettings.paypal_email)) {
                setPaypalEmailError('Please enter a valid email address');
                return;
              }
              updatePayoutSettingsMutation.mutate(payoutSettings);
            }}
            disabled={
              updatePayoutSettingsMutation.isPending ||
              (payoutSettings.preferred_method === 'paypal' && !payoutSettings.paypal_email) ||
              (payoutSettings.preferred_method === 'bank_transfer' && !payoutSettings.bank_account_holder) ||
              !!paypalEmailError
            }
          >
            {updatePayoutSettingsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
