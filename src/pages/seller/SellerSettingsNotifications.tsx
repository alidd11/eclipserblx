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
import { 
  Bell,
  Send,
  CheckCircle,
  ExternalLink,
  Save,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function SellerSettingsNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

  const [formData, setFormData] = useState({
    discord_webhook_url: '',
  });
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  useEffect(() => {
    if (store) {
      setFormData({
        discord_webhook_url: store.discord_webhook_url || '',
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

  const testDiscordWebhook = async () => {
    if (!formData.discord_webhook_url) {
      toast.error('Please enter a Discord webhook URL first');
      return;
    }

    if (!formData.discord_webhook_url.startsWith('https://discord.com/api/webhooks/') && 
        !formData.discord_webhook_url.startsWith('https://discordapp.com/api/webhooks/')) {
      toast.error('Please enter a valid Discord webhook URL');
      return;
    }

    setIsTestingWebhook(true);
    try {
      const response = await fetch(formData.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🎉 Test Notification',
            description: `This is a test notification from **${store?.name || 'your store'}** on Eclipse Store.`,
            color: 0x8b5cf6,
            fields: [
              { name: 'Store', value: store?.name || 'Your Store', inline: true },
              { name: 'Status', value: '✅ Webhook Connected', inline: true },
            ],
            footer: { text: 'Eclipse Store • Seller Notifications' },
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (response.ok) {
        toast.success('Test notification sent! Check your Discord channel.');
      } else {
        throw new Error('Webhook request failed');
      }
    } catch (error) {
      toast.error('Failed to send test notification. Please check your webhook URL.');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Configure how you receive order notifications
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Discord Notifications
              </CardTitle>
              <CardDescription>
                Receive order notifications directly in your Discord server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discord_webhook_url" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Discord Webhook URL
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
                    onClick={testDiscordWebhook}
                    disabled={isTestingWebhook || !formData.discord_webhook_url}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isTestingWebhook ? 'Sending...' : 'Test'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get notified when someone purchases from your store. 
                  <a 
                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    How to create a webhook
                    <ExternalLink className="h-3 w-3 inline ml-1" />
                  </a>
                </p>
              </div>

              {formData.discord_webhook_url && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Webhook Configured</p>
                    <p className="text-xs text-muted-foreground">
                      You'll receive notifications when orders are placed
                    </p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSubmit}
                disabled={updateStore.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateStore.isPending ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SellerLayout>
  );
}
