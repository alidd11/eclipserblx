import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Store, Lock, PowerOff, Trash2, ExternalLink, ChevronDown, CheckCircle2, XCircle, BadgeCheck } from 'lucide-react';

interface StoreControlsCardProps {
  store: any;
  paymentDetails: any;
  isAdminManaged: boolean;
  userEmail: string;
  onToggleActive: (active: boolean) => void;
  onDeleteStore: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}

export function StoreControlsCard({ store, paymentDetails, isAdminManaged, userEmail, onToggleActive, onDeleteStore, isToggling, isDeleting }: StoreControlsCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [actionPassword, setActionPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handlePasswordAction = async (action: () => void) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: actionPassword,
    });
    if (!error) {
      action();
      setActionPassword('');
      setShowDeleteDialog(false);
      setShowDeactivateDialog(false);
    } else {
      setPasswordError(true);
    }
  };

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Controls
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Active Status</p>
              <p className="text-sm text-muted-foreground">Enable or disable the store</p>
            </div>
            <Switch
              checked={store.is_active}
              onCheckedChange={(checked) => onToggleActive(checked)}
              disabled={isToggling}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Verified Seller</p>
                <p className="text-sm text-muted-foreground">
                  Automatically granted when Stripe Connect onboarding is completed
                </p>
              </div>
            </div>
            <Badge
              variant={store.is_verified ? "default" : "secondary"}
              className={store.is_verified ? "bg-green-600 text-foreground border-0" : ""}
            >
              {store.is_verified ? "Verified" : "Not Verified"}
            </Badge>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
              Stripe Connect Details
              {paymentDetails?.stripe_account_id && (
                <a
                  href={`https://dashboard.stripe.com/connect/accounts/${paymentDetails.stripe_account_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs hover:text-foreground flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Stripe
                </a>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              {!paymentDetails?.stripe_account_id ? (
                <div className="rounded-md border border-dashed p-4 text-center text-sm space-y-3">
                  <p className="text-muted-foreground">No Stripe Connect account linked yet</p>
                  <p className="text-xs text-muted-foreground">
                    The seller needs to complete Stripe Connect onboarding from their{' '}
                    <span className="font-medium text-foreground">Seller Dashboard → Settings → Payments</span>{' '}
                    page to get verified.
                  </p>
                  <div className="space-y-1.5 text-left">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Required Steps</p>
                    {['Create Stripe Connect Account', 'Submit Identity / KYC Details', 'Enable Payouts'].map(step => (
                      <div key={step} className="flex items-center gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border p-3 text-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Account ID</span>
                    <span className="font-mono text-xs">{paymentDetails.stripe_account_id}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Onboarding Steps</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span>Account Created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {paymentDetails.details_submitted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span>Details Submitted (KYC / Identity)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {paymentDetails.payouts_enabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span>Payouts Enabled</span>
                    </div>
                  </div>
                  {(!paymentDetails.details_submitted || !paymentDetails.payouts_enabled) && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Seller needs to complete remaining steps from their{' '}
                        <span className="font-medium text-foreground">Seller Dashboard → Settings → Payments</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {!isAdminManaged && store.is_active && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={() => {
                  setActionPassword('');
                  setPasswordError(false);
                  setShowDeactivateDialog(true);
                }}
              >
                <PowerOff className="h-4 w-4" />
                Deactivate Store
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Temporarily disable the store. Products will be hidden but data preserved.
              </p>
            </div>
          )}

          {!isAdminManaged && (
            <>
              <Separator />
              <div className="pt-2">
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => {
                    setActionPassword('');
                    setPasswordError(false);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Store
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will deactivate all products and remove the store. Order history will be preserved.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Deactivate Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Deactivate Store?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will temporarily disable "{store.name}". The store can be reactivated later.
              Enter your account password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="Enter your account password"
              value={actionPassword}
              onChange={(e) => { setActionPassword(e.target.value); setPasswordError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordAction(() => onToggleActive(false))}
              className={passwordError ? 'border-destructive' : ''}
            />
            {passwordError && <p className="text-sm text-destructive">Incorrect password. Please try again.</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActionPassword('')}>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              onClick={() => handlePasswordAction(() => onToggleActive(false))}
            >
              Deactivate Store
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Delete Store?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{store.name}" and deactivate all its products.
              Order history will be preserved. This action cannot be undone.
              Enter your account password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="Enter your account password"
              value={actionPassword}
              onChange={(e) => { setActionPassword(e.target.value); setPasswordError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordAction(onDeleteStore)}
              className={passwordError ? 'border-destructive' : ''}
            />
            {passwordError && <p className="text-sm text-destructive">Incorrect password. Please try again.</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActionPassword('')}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => handlePasswordAction(onDeleteStore)}>
              Delete Store
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
