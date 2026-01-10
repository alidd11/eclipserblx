import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Tag, Package, MessageCircle, ArrowLeft, Loader2, BellOff, Save } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundPush } from '@/hooks/useBackgroundPush';

export default function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSubscribed, subscribe, unsubscribe, isLoading: pushLoading, isSupported: pushSupported } = useBackgroundPush();

  // Local state for preferences
  const [productAlerts, setProductAlerts] = useState(true);
  const [discountAlerts, setDiscountAlerts] = useState(true);
  const [forumAlerts, setForumAlerts] = useState(true);

  // Fetch existing subscription
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['email-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('email_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (subscription) {
      setProductAlerts(subscription.subscribed_to_updates);
      setDiscountAlerts(subscription.subscribed_to_discounts);
      setForumAlerts(subscription.subscribed_to_newsletters);
    }
  }, [subscription]);

  const updateMutation = useMutation({
    mutationFn: async (preferences: {
      subscribed_to_updates: boolean;
      subscribed_to_discounts: boolean;
      subscribed_to_newsletters: boolean;
    }) => {
      if (!user?.id || !user?.email) throw new Error('Not authenticated');

      if (subscription) {
        const { error } = await supabase
          .from('email_subscriptions')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_subscriptions')
          .insert({
            user_id: user.id,
            email: user.email,
            ...preferences,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-subscription', user?.id] });
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      subscribed_to_updates: productAlerts,
      subscribed_to_discounts: discountAlerts,
      subscribed_to_newsletters: forumAlerts,
    });
  };

  const handleTogglePush = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({ title: 'Push Disabled', description: 'You will no longer receive push notifications.' });
      }
    } else {
      const result = await subscribe();
      if (result.success) {
        toast({ title: 'Push Enabled', description: 'You will now receive push notifications.' });
      } else if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    }
  };

  const handleDisableAll = () => {
    setProductAlerts(false);
    setDiscountAlerts(false);
    setForumAlerts(false);
    updateMutation.mutate({
      subscribed_to_updates: false,
      subscribed_to_discounts: false,
      subscribed_to_newsletters: false,
    });
  };

  const hasChanges = subscription
    ? (productAlerts !== subscription.subscribed_to_updates ||
       discountAlerts !== subscription.subscribed_to_discounts ||
       forumAlerts !== subscription.subscribed_to_newsletters)
    : true;

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be signed in to manage notification preferences.</p>
          <Button asChild className="gradient-button border-0">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/account">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Notification Preferences</h1>
            <p className="text-muted-foreground text-sm">Choose what notifications you want to receive</p>
          </div>
        </div>

        {isLoading ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Push Notifications Card */}
            {pushSupported && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="h-5 w-5 text-primary" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>
                    Receive instant notifications on your device
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <Label className="font-medium">Enable Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Get notified even when the app is closed</p>
                    </div>
                    <Switch
                      checked={isSubscribed}
                      onCheckedChange={handleTogglePush}
                      disabled={pushLoading}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alert Preferences Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-primary" />
                  Alert Preferences
                </CardTitle>
                <CardDescription>
                  Control which types of alerts you receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Alerts */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="product-alerts" className="font-medium cursor-pointer">Product Alerts</Label>
                      <p className="text-sm text-muted-foreground">New products and updates</p>
                    </div>
                  </div>
                  <Switch
                    id="product-alerts"
                    checked={productAlerts}
                    onCheckedChange={setProductAlerts}
                  />
                </div>

                {/* Discount Alerts */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="discount-alerts" className="font-medium cursor-pointer">Discount Alerts</Label>
                      <p className="text-sm text-muted-foreground">Exclusive deals and promo codes</p>
                    </div>
                  </div>
                  <Switch
                    id="discount-alerts"
                    checked={discountAlerts}
                    onCheckedChange={setDiscountAlerts}
                  />
                </div>

                {/* Forum Alerts */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="forum-alerts" className="font-medium cursor-pointer">Forum & Newsletter</Label>
                      <p className="text-sm text-muted-foreground">Community updates and newsletters</p>
                    </div>
                  </div>
                  <Switch
                    id="forum-alerts"
                    checked={forumAlerts}
                    onCheckedChange={setForumAlerts}
                  />
                </div>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || updateMutation.isPending}
                    className="gradient-button border-0"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Preferences
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisableAll}
                    disabled={updateMutation.isPending || (!productAlerts && !discountAlerts && !forumAlerts)}
                  >
                    <BellOff className="mr-2 h-4 w-4" />
                    Disable All Alerts
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-muted/30 border-border">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  These preferences control both email and in-app notifications. Push notifications require browser permission.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
