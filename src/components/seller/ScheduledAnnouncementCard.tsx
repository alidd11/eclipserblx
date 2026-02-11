import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Send, Megaphone, Loader2, Bot, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface AnnouncementFormData {
  title: string;
  description: string;
  announcementType: 'product_release' | 'promotion' | 'update' | 'custom';
  linkUrl: string;
  channelId: string;
  pingRoles: boolean;
}

export function ScheduledAnnouncementCard() {
  const { store } = useSellerStatus();
  const hasBotConnected = !!store?.credentials?.discord_guild_id;
  const hasWebhook = !!store?.credentials?.discord_webhook_url;

  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    description: '',
    announcementType: 'custom',
    linkUrl: '',
    channelId: '',
    pingRoles: false,
  });

  const getEmbed = () => {
    const typeConfig = {
      product_release: { emoji: '🎉', color: 0x9333EA, title: 'New Product Release!' },
      promotion: { emoji: '🔥', color: 0xEF4444, title: 'Special Promotion!' },
      update: { emoji: '📢', color: 0x3B82F6, title: 'Store Update' },
      custom: { emoji: '💬', color: 0x6B7280, title: formData.title || 'Announcement' },
    };

    const config = typeConfig[formData.announcementType];
    const fields: any[] = [];
    if (formData.linkUrl) {
      fields.push({
        name: '🔗 Link',
        value: `[Click here](${formData.linkUrl})`,
        inline: false,
      });
    }

    return {
      title: `${config.emoji} ${formData.announcementType === 'custom' ? formData.title : config.title}`,
      description: formData.description,
      color: config.color,
      fields: fields.length > 0 ? fields : undefined,
      footer: { text: `${store?.name || 'Store'} • Announcement` },
      timestamp: new Date().toISOString(),
    };
  };

  const sendAnnouncement = useMutation({
    mutationFn: async () => {
      const embed = getEmbed();

      if (hasBotConnected && formData.channelId.trim()) {
        // Bot-powered sending via edge function
        const rolePings: string[] = [];
        if (formData.pingRoles) {
          if (store?.credentials?.product_drops_role_id) {
            rolePings.push(store.credentials.product_drops_role_id);
          }
          if (store?.credentials?.early_product_drops_role_id) {
            rolePings.push(store.credentials.early_product_drops_role_id);
          }
        }

        const content = rolePings.length > 0
          ? rolePings.map(id => `<@&${id}>`).join(' ')
          : undefined;

        const { data, error } = await supabase.functions.invoke('send-product-drop-embed', {
          body: {
            channel_id: formData.channelId.trim(),
            embed,
            content,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else if (hasWebhook) {
        // Webhook fallback
        const response = await fetch(store!.credentials!.discord_webhook_url!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: store?.name || 'Store Announcement',
            embeds: [embed],
          }),
        });

        if (!response.ok) throw new Error('Failed to send announcement via webhook');
      } else {
        throw new Error('No sending method configured. Add the Eclipse Portal Bot or configure a webhook.');
      }
    },
    onSuccess: () => {
      toast.success('Announcement sent!');
      setFormData({
        title: '',
        description: '',
        announcementType: 'custom',
        linkUrl: '',
        channelId: formData.channelId, // Keep channel ID for convenience
        pingRoles: false,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const canSend = formData.title.trim() && formData.description.trim() && (
    (hasBotConnected && formData.channelId.trim()) || hasWebhook
  );

  const sendingMethod = hasBotConnected && formData.channelId.trim() ? 'bot' : hasWebhook ? 'webhook' : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Discord Announcements
        </CardTitle>
        <CardDescription>
          Send announcements to your Discord community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasBotConnected && !hasWebhook && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
            Add the Eclipse Portal Bot above or configure a Discord webhook in Settings → Notifications to enable announcements.
          </div>
        )}

        {/* Bot Channel ID */}
        {hasBotConnected && (
          <div className="space-y-2">
            <Label htmlFor="channelId" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Channel ID
            </Label>
            <Input
              id="channelId"
              value={formData.channelId}
              onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
              placeholder="Right-click channel → Copy Channel ID"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The channel in your server where the announcement will be posted via the Eclipse Portal Bot.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Announcement Type</Label>
            <Select
              value={formData.announcementType}
              onValueChange={(value: any) => setFormData({ ...formData, announcementType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product_release">🎉 New Product Release</SelectItem>
                <SelectItem value="promotion">🔥 Promotion / Sale</SelectItem>
                <SelectItem value="update">📢 Store Update</SelectItem>
                <SelectItem value="custom">💬 Custom Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Announcement title..."
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Message</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Write your announcement message..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.description.length}/1000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkUrl">Link URL (optional)</Label>
            <Input
              id="linkUrl"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Role Ping Toggle - only when using bot */}
          {hasBotConnected && formData.channelId.trim() && (store?.credentials?.product_drops_role_id || store?.credentials?.early_product_drops_role_id) && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="pingRoles" className="text-sm font-medium">Ping Roles</Label>
                <p className="text-xs text-muted-foreground">
                  Mention your configured product drop roles
                </p>
              </div>
              <Switch
                id="pingRoles"
                checked={formData.pingRoles}
                onCheckedChange={(checked) => setFormData({ ...formData, pingRoles: checked })}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={() => sendAnnouncement.mutate()}
              disabled={!canSend || sendAnnouncement.isPending}
              className="flex-1"
            >
              {sendAnnouncement.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Now
            </Button>
            {sendingMethod && (
              <Badge variant="outline" className="self-center text-xs">
                {sendingMethod === 'bot' ? (
                  <><Bot className="h-3 w-3 mr-1" /> Via Portal Bot</>
                ) : (
                  <><Webhook className="h-3 w-3 mr-1" /> Via Webhook</>
                )}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
