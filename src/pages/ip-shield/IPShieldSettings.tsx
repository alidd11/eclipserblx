import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IPShieldLayout } from '@/components/ip-shield/IPShieldLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Shield, CheckCircle, Crown, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function IPShieldSettings() {
  const { user } = useAuth();

  const { data: subscriptionStatus } = useQuery({
    queryKey: ['ip-shield-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-ip-shield-subscription');
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const { data: verificationStatus } = useQuery({
    queryKey: ['ip-shield-identity-verification', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-identity-verification');
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const tier = subscriptionStatus?.tier || 'unknown';
  const limits = subscriptionStatus?.limits;
  const isCustom = subscriptionStatus?.custom_plan;

  return (
    <IPShieldLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Subscription & Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your IP Shield subscription and verification.
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold capitalize">{isCustom ? 'Custom' : tier} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionStatus?.subscription_end && `Renews ${format(new Date(subscriptionStatus.subscription_end), 'MMM d, yyyy')}`}
                  </p>
                </div>
              </div>
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" /> Active
              </Badge>
            </div>

            {limits && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="text-sm">
                  <span className="text-muted-foreground">Takedowns/month:</span>{' '}
                  <span className="font-medium">{limits.takedowns_per_month === 999 ? 'Unlimited' : limits.takedowns_per_month}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Registry slots:</span>{' '}
                  <span className="font-medium">{limits.registry_limit === 999 ? 'Unlimited' : limits.registry_limit}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Priority handling:</span>{' '}
                  <span className="font-medium">{limits.priority ? '✓' : '✗'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Monitoring:</span>{' '}
                  <span className="font-medium">{limits.monitoring ? '✓' : '✗'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Dedicated agent:</span>{' '}
                  <span className="font-medium">{limits.dedicated_agent ? '✓' : '✗'}</span>
                </div>
              </div>
            )}

            {subscriptionStatus?.subscription_id && (
              <div className="pt-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:legal@eclipserblx.com?subject=IP Shield Subscription Change">
                    Change Plan
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Identity Verification */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Identity Verification</h3>
                  <p className="text-sm text-muted-foreground">Required for DMCA agent filing</p>
                </div>
              </div>
              <Badge variant={verificationStatus?.verified ? 'default' : 'secondary'} className="gap-1">
                {verificationStatus?.verified ? (
                  <><CheckCircle className="h-3 w-3" /> Verified</>
                ) : (
                  'Pending'
                )}
              </Badge>
            </div>
            {verificationStatus?.verifiedAt && (
              <p className="text-xs text-muted-foreground">
                Verified on {format(new Date(verificationStatus.verifiedAt), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </IPShieldLayout>
  );
}
