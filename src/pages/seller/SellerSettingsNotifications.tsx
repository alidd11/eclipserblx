import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell,
  Send,
  CheckCircle,
  ExternalLink,
  Save,
  MessageCircle,
  ShoppingCart,
  Star,
  Users,
  Shield,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function SellerSettingsNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

  const [formData, setFormData] = useState({
    discord_webhook_url: '',
    review_discord_webhook_url: '',
    discord_bot_token: '',
    discord_guild_id: '',
    discord_role_id: '',
  });
  const [isTestingOrderWebhook, setIsTestingOrderWebhook] = useState(false);
  const [isTestingReviewWebhook, setIsTestingReviewWebhook] = useState(false);

  useEffect(() => {
    if (store) {
      setFormData({
        discord_webhook_url: store.discord_webhook_url || '',
        review_discord_webhook_url: store.review_discord_webhook_url || '',
        discord_bot_token: store.discord_bot_token || '',
        discord_guild_id: store.discord_guild_id || '',
        discord_role_id: store.discord_role_id || '',
      });
    }
  }, [store]);

  const updateStore = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!store?.id) throw new Error('No store found');
      
      const { error } = await supabase
        .from('stores')
        .update({
          discord_webhook_url: data.discord_webhook_url || null,
          review_discord_webhook_url: data.review_discord_webhook_url || null,
          discord_bot_token: data.discord_bot_token || null,
          discord_guild_id: data.discord_guild_id || null,
          discord_role_id: data.discord_role_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notification settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });

  const handleSubmit = () => {
    updateStore.mutate(formData);
  };

  const testOrderWebhook = async () => {
    if (!formData.discord_webhook_url) {
      toast.error('Please enter a Discord webhook URL first');
      return;
    }

    if (!formData.discord_webhook_url.startsWith('https://discord.com/api/webhooks/') && 
        !formData.discord_webhook_url.startsWith('https://discordapp.com/api/webhooks/')) {
      toast.error('Please enter a valid Discord webhook URL');
      return;
    }

    setIsTestingOrderWebhook(true);
    try {
      const response = await fetch(formData.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🎉 New Sale!',
            description: `Someone just purchased **Test Product** from your store!`,
            color: 0x22c55e,
            fields: [
              { name: 'Product', value: 'Test Product', inline: true },
              { name: 'Your Earnings', value: '£8.50', inline: true },
            ],
            footer: { text: `${store?.name || 'Your Store'} • Eclipse Store` },
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (response.ok) {
        toast.success('Test order notification sent! Check your Discord channel.');
      } else {
        throw new Error('Webhook request failed');
      }
    } catch (error) {
      toast.error('Failed to send test notification. Please check your webhook URL.');
    } finally {
      setIsTestingOrderWebhook(false);
    }
  };

  const testReviewWebhook = async () => {
    if (!formData.review_discord_webhook_url) {
      toast.error('Please enter a review webhook URL first');
      return;
    }

    if (!formData.review_discord_webhook_url.startsWith('https://discord.com/api/webhooks/') && 
        !formData.review_discord_webhook_url.startsWith('https://discordapp.com/api/webhooks/')) {
      toast.error('Please enter a valid Discord webhook URL');
      return;
    }

    setIsTestingReviewWebhook(true);
    try {
      const response = await fetch(formData.review_discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '⭐ New Review',
            color: 0xf59e0b,
            fields: [
              { name: 'Rating', value: '★★★★★ (5/5)', inline: true },
              { name: 'Product', value: 'Test Product', inline: true },
              { name: 'Reviewer', value: 'TestUser', inline: true },
              { name: 'Review', value: '"This is an amazing product! Highly recommended for everyone."', inline: false },
            ],
            footer: { text: `${store?.name || 'Your Store'} • Eclipse Store` },
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (response.ok) {
        toast.success('Test review notification sent! Check your Discord channel.');
      } else {
        throw new Error('Webhook request failed');
      }
    } catch (error) {
      toast.error('Failed to send test notification. Please check your webhook URL.');
    } finally {
      setIsTestingReviewWebhook(false);
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Configure Discord notifications and role integration for your store
          </p>
        </div>

        <div className="space-y-6">
          {/* Order Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-500" />
                Order Notifications
              </CardTitle>
              <CardDescription>
                Receive notifications when someone purchases from your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discord_webhook_url" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Order Webhook URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="discord_webhook_url"
                    type="password"
                    value={formData.discord_webhook_url}
                    onChange={(e) => setFormData({ ...formData, discord_webhook_url: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testOrderWebhook}
                    disabled={isTestingOrderWebhook || !formData.discord_webhook_url}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isTestingOrderWebhook ? 'Sending...' : 'Test'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get notified when someone purchases from your store.
                </p>
              </div>

              {formData.discord_webhook_url && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Order Webhook Configured</p>
                    <p className="text-xs text-muted-foreground">
                      You'll receive notifications when orders are placed
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Review Notifications
              </CardTitle>
              <CardDescription>
                Receive notifications when customers leave reviews on your products
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review_discord_webhook_url" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Review Webhook URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="review_discord_webhook_url"
                    type="password"
                    value={formData.review_discord_webhook_url}
                    onChange={(e) => setFormData({ ...formData, review_discord_webhook_url: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testReviewWebhook}
                    disabled={isTestingReviewWebhook || !formData.review_discord_webhook_url}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isTestingReviewWebhook ? 'Sending...' : 'Test'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get notified when customers review your products.
                </p>
              </div>

              {formData.review_discord_webhook_url && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Review Webhook Configured</p>
                    <p className="text-xs text-muted-foreground">
                      You'll receive notifications when reviews are submitted
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discord Role Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#5865F2]" />
                Discord Role Integration
              </CardTitle>
              <CardDescription>
                Automatically assign roles to customers who purchase from your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Setup Required</p>
                  <p className="text-xs text-muted-foreground">
                    To use role integration, you'll need to create a Discord bot and invite it to your server with the "Manage Roles" permission.{' '}
                    <a 
                      href="https://discord.com/developers/applications" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Create a Discord Application
                      <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discord_bot_token" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Bot Token
                  </Label>
                  <Input
                    id="discord_bot_token"
                    type="password"
                    value={formData.discord_bot_token}
                    onChange={(e) => setFormData({ ...formData, discord_bot_token: e.target.value })}
                    placeholder="Your Discord bot token"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your Discord Developer Portal under "Bot" → "Token"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discord_guild_id">Server (Guild) ID</Label>
                    <Input
                      id="discord_guild_id"
                      value={formData.discord_guild_id}
                      onChange={(e) => setFormData({ ...formData, discord_guild_id: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enable Developer Mode, right-click your server → Copy ID
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discord_role_id">Customer Role ID</Label>
                    <Input
                      id="discord_role_id"
                      value={formData.discord_role_id}
                      onChange={(e) => setFormData({ ...formData, discord_role_id: e.target.value })}
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Right-click the role you want to assign → Copy ID
                    </p>
                  </div>
                </div>
              </div>

              {formData.discord_bot_token && formData.discord_guild_id && formData.discord_role_id && (
                <div className="flex items-center gap-3 p-3 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-[#5865F2]" />
                  <div>
                    <p className="text-sm font-medium">Role Integration Configured</p>
                    <p className="text-xs text-muted-foreground">
                      Customers with linked Discord accounts will receive roles on purchase
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How to Create Webhook */}
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5" />
                How to Create a Discord Webhook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Open your Discord server settings</li>
                <li>Go to <strong>Integrations</strong> → <strong>Webhooks</strong></li>
                <li>Click <strong>New Webhook</strong></li>
                <li>Choose the channel for notifications</li>
                <li>Click <strong>Copy Webhook URL</strong> and paste it above</li>
              </ol>
              <a 
                href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary hover:underline mt-3"
              >
                Learn more about Discord webhooks
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSubmit}
            disabled={updateStore.isPending}
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateStore.isPending ? 'Saving...' : 'Save All Notification Settings'}
          </Button>
        </div>
      </div>
    </SellerLayout>
  );
}
