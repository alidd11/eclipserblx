import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Mail, Clock, Shield, Users, Sparkles } from 'lucide-react';
import { VerificationResults } from '@/hooks/useSellerVerification';
import type { SellerFormValues } from './StepDetails';

interface StepConfirmProps {
  formValues: SellerFormValues;
  setFormValues: (updates: Partial<SellerFormValues>) => void;
  verificationResults: VerificationResults;
  settings: any;
  linkedAccounts: Record<string, unknown>;
}

export function StepConfirm({ formValues, setFormValues, verificationResults, settings, linkedAccounts }: StepConfirmProps) {
  const checks = [
    { label: 'Email Verified', passed: verificationResults.email_verified, icon: Mail },
    ...(settings.seller_min_account_age_days > 0 ? [{
      label: `Account Age (${verificationResults.account_age?.days || 0} days)`,
      passed: verificationResults.account_age?.meets_requirement,
      icon: Clock,
    }] : []),
    { label: 'Discord Server Valid', passed: verificationResults.discord_server?.valid, icon: Shield },
  ];

  return (
    <div className="space-y-5">
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <h4 className="font-medium text-sm">Application Summary</h4>
        <div className="grid gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Store Name</span>
            <span className="font-medium">{formValues.storeName}</span>
          </div>
          {formValues.productCategory && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>{formValues.productCategory}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discord</span>
            <span>{linkedAccounts?.discord_username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Roblox</span>
            <span>{linkedAccounts?.roblox_username}</span>
          </div>
          {verificationResults.discord_server?.guild_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Server</span>
              <span>{verificationResults.discord_server.guild_name}</span>
            </div>
          )}
          {verificationResults.identity_consistency && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Identity Match</span>
              <Badge variant={verificationResults.identity_consistency.similarity_score >= 80 ? 'default' : 'secondary'} className="text-xs">
                {verificationResults.identity_consistency.similarity_score}%
              </Badge>
            </div>
          )}
        </div>
      </div>

      {verificationResults.identity_consistency && 
       verificationResults.identity_consistency.similarity_score >= 80 &&
       verificationResults.discord_server?.valid &&
       verificationResults.email_verified && (
        <Alert className="bg-green-500/10 border-green-500/30">
          <Sparkles className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-sm">
            <strong>Instant approval eligible!</strong> Your identity match qualifies you for automatic approval.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <h4 className="font-medium text-sm">Verification Status</h4>
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-sm">
            {check.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : check.passed === false ? (
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
            )}
            <check.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className={check.passed ? 'text-green-600 dark:text-green-400' : ''}>{check.label}</span>
          </div>
        ))}
      </div>

      {verificationResults.roblox_group && !verificationResults.roblox_group.in_group && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
          <Users className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <span><strong className="text-foreground">Tip:</strong> Joining our Roblox group can boost your store's visibility and credibility, but it's not required.</span>
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="ageConfirm"
            checked={formValues.ageConfirmed}
            onCheckedChange={(checked) => setFormValues({ ageConfirmed: checked as boolean })}
          />
          <Label htmlFor="ageConfirm" className="text-sm leading-normal cursor-pointer">
            I confirm I am at least 13 years old. I understand that sellers must be 18+ to receive payouts.
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="termsAccept"
            checked={formValues.termsAccepted}
            onCheckedChange={(checked) => setFormValues({ termsAccepted: checked as boolean })}
          />
          <Label htmlFor="termsAccept" className="text-sm leading-normal cursor-pointer">
            I agree to the{' '}
            <Link to="/seller/documents/terms" className="text-primary hover:underline" target="_blank">
              Seller Terms of Service
            </Link>{' '}
            and the 15% platform commission on net sales.
          </Label>
        </div>
      </div>
    </div>
  );
}
