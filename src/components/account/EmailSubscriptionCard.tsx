import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Bell, Tag, Newspaper, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function EmailSubscriptionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [updates, setUpdates] = useState(true);
  const [discounts, setDiscounts] = useState(true);
  const [newsletters, setNewsletters] = useState(true);

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
      setUpdates(subscription.subscribed_to_updates);
      setDiscounts(subscription.subscribed_to_discounts);
      setNewsletters(subscription.subscribed_to_newsletters);
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
        // Update existing subscription
        const { error } = await supabase
          .from('email_subscriptions')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Create new subscription
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
        title: 'Preferences Updated',
        description: 'Your email subscription preferences have been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
      console.error('Subscription update error:', error);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      subscribed_to_updates: updates,
      subscribed_to_discounts: discounts,
      subscribed_to_newsletters: newsletters,
    });
  };

  const handleUnsubscribeAll = () => {
    setUpdates(false);
    setDiscounts(false);
    setNewsletters(false);
    updateMutation.mutate({
      subscribed_to_updates: false,
      subscribed_to_discounts: false,
      subscribed_to_newsletters: false,
    });
  };

  const hasChanges = subscription 
    ? (updates !== subscription.subscribed_to_updates ||
       discounts !== subscription.subscribed_to_discounts ||
       newsletters !== subscription.subscribed_to_newsletters)
    : true;

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Subscriptions
        </CardTitle>
        <CardDescription>
          Manage what emails you receive from us
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="updates" className="font-medium cursor-pointer">Product Updates</Label>
                <p className="text-sm text-muted-foreground">Get notified about new products and updates</p>
              </div>
            </div>
            <Switch
              id="updates"
              checked={updates}
              onCheckedChange={setUpdates}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="discounts" className="font-medium cursor-pointer">Discounts & Vouchers</Label>
                <p className="text-sm text-muted-foreground">Receive exclusive discount codes and special offers</p>
              </div>
            </div>
            <Switch
              id="discounts"
              checked={discounts}
              onCheckedChange={setDiscounts}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Newspaper className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="newsletters" className="font-medium cursor-pointer">Newsletter</Label>
                <p className="text-sm text-muted-foreground">Monthly updates and community news</p>
              </div>
            </div>
            <Switch
              id="newsletters"
              checked={newsletters}
              onCheckedChange={setNewsletters}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="gradient-button border-0"
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
          <Button
            variant="outline"
            onClick={handleUnsubscribeAll}
            disabled={updateMutation.isPending || (!updates && !discounts && !newsletters)}
          >
            Unsubscribe from All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
