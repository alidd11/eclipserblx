import { useState } from 'react';
import { Sparkles, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface GrantEclipsePlusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: {
    user_id: string;
    display_name: string | null;
    email: string;
    customer_id: string | null;
  } | null;
  onSuccess?: () => void;
}

const DURATION_OPTIONS = [
  { value: '1', label: '1 Day' },
  { value: '3', label: '3 Days' },
  { value: '7', label: '1 Week' },
  { value: '14', label: '2 Weeks' },
  { value: '21', label: '3 Weeks' },
  { value: '28', label: '4 Weeks (Maximum)' },
];

export function GrantEclipsePlusDialog({
  open,
  onOpenChange,
  targetUser,
  onSuccess,
}: GrantEclipsePlusDialogProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [durationDays, setDurationDays] = useState('7');
  const [reason, setReason] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const resetForm = () => {
    setPassword('');
    setShowPassword(false);
    setDurationDays('7');
    setReason('');
    setPasswordError('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleGrant = async () => {
    if (!user?.email || !password || !targetUser) return;

    setPasswordError('');
    setIsGranting(true);

    try {
      // Step 1: Verify admin's password (2FA)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        setPasswordError('Incorrect password. Please try again.');
        setIsGranting(false);
        return;
      }

      // Step 2: Calculate subscription dates
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + parseInt(durationDays));

      // Step 3: Check if user already has an active subscription
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', targetUser.user_id)
        .single();

      if (existingSub && existingSub.status === 'active') {
        // Check if it's a paid subscription (has Stripe ID)
        if (existingSub.stripe_subscription_id) {
          toast.error('User already has an active paid subscription');
          setIsGranting(false);
          return;
        }
        
        // Update existing granted subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: endDate.toISOString(),
            granted_by: user.id,
            granted_at: now.toISOString(),
            grant_reason: reason || null,
            updated_at: now.toISOString(),
          })
          .eq('user_id', targetUser.user_id);

        if (updateError) throw updateError;
      } else {
        // Create new subscription or upsert
        const { error: insertError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: targetUser.user_id,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: endDate.toISOString(),
            granted_by: user.id,
            granted_at: now.toISOString(),
            grant_reason: reason || null,
            updated_at: now.toISOString(),
          }, { onConflict: 'user_id' });

        if (insertError) throw insertError;
      }

      // Step 4: Log the action to audit_logs
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'eclipse_plus_granted',
        resource: 'subscriptions',
        details: {
          target_user_id: targetUser.user_id,
          target_email: targetUser.email,
          target_customer_id: targetUser.customer_id,
          duration_days: parseInt(durationDays),
          end_date: endDate.toISOString(),
          reason: reason || null,
        },
      });

      // Step 5: Create in-app notification for the user
      await supabase.from('notifications').insert({
        user_id: targetUser.user_id,
        type: 'subscription',
        title: 'Eclipse+ Membership Activated! ✨',
        message: `You've been granted Eclipse+ membership for ${durationDays} day${parseInt(durationDays) > 1 ? 's' : ''}. Enjoy up to 35% off products and 1 free item monthly!`,
        link: '/eclipse-plus',
      });

      // Step 6: Send push notification
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: targetUser.user_id,
            title: 'Eclipse+ Activated! ✨',
            body: `You've been granted Eclipse+ for ${durationDays} day${parseInt(durationDays) > 1 ? 's' : ''}. Enjoy member discounts!`,
            url: '/eclipse-plus',
            tag: `eclipse-plus-granted-${targetUser.user_id}-${Date.now()}`,
          },
        });
      } catch (pushError) {
        console.log('Push notification not sent (user may not have subscribed):', pushError);
      }

      // Step 7: Send Discord webhook if user has Discord linked
      try {
        await supabase.functions.invoke('send-discord-webhook', {
          body: {
            user_id: targetUser.user_id,
            event: 'subscription_activated',
            subscription_end: endDate.toISOString(),
            granted_by_admin: true,
          },
        });
        console.log('Discord webhook sent for Eclipse+ grant');
      } catch (discordError) {
        console.log('Discord webhook not sent (user may not have Discord linked):', discordError);
      }

      toast.success(
        `Eclipse+ granted to ${targetUser.display_name || targetUser.email} for ${durationDays} day${parseInt(durationDays) > 1 ? 's' : ''}`
      );

      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error granting Eclipse+:', error);
      toast.error('Failed to grant Eclipse+ subscription');
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Grant Eclipse+ Subscription
          </DialogTitle>
          <DialogDescription>
            Grant a temporary Eclipse+ subscription to{' '}
            <span className="font-medium text-foreground">
              {targetUser?.display_name || targetUser?.email}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Security Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">
              This action requires password verification and will be logged for security purposes.
            </p>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label htmlFor="duration">Subscription Duration</Label>
            <Select value={durationDays} onValueChange={setDurationDays}>
              <SelectTrigger id="duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Compensation for service issue, promotional gift..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Password Verification */}
          <div className="space-y-2">
            <Label htmlFor="password">Confirm Your Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                className={passwordError ? 'border-destructive' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isGranting}>
            Cancel
          </Button>
          <Button
            onClick={handleGrant}
            disabled={!password || isGranting}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black"
          >
            {isGranting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Granting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Grant Eclipse+
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
