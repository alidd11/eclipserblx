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
import { Send, Megaphone, Loader2, Bot, Webhook, Sparkles, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { DiscordEmbedPreview } from './DiscordEmbedPreview';
import { cn } from '@/lib/utils';

interface AnnouncementFormData {
  title: string;
  description: string;
  announcementType: 'product_release' | 'promotion' | 'update' | 'custom' | 'flash_sale' | 'restock' | 'giveaway';
  linkUrl: string;
  channelId: string;
  pingRoles: boolean;
}

const TYPE_CONFIG = {
  product_release: { emoji: '🎉', color: '#9333EA', colorInt: 0x9333EA, label: 'New Product Release', title: 'New Product Release!' },
  promotion: { emoji: '🔥', color: '#EF4444', colorInt: 0xEF4444, label: 'Promotion / Sale', title: 'Special Promotion!' },
  flash_sale: { emoji: '⚡', color: '#F59E0B', colorInt: 0xF59E0B, label: 'Flash Sale', title: 'Flash Sale — Limited Time!' },
  restock: { emoji: '📦', color: '#10B981', colorInt: 0x10B981, label: 'Restock Alert', title: 'Back in Stock!' },
  giveaway: { emoji: '🎁', color: '#EC4899', colorInt: 0xEC4899, label: 'Giveaway', title: 'Giveaway Time!' },
  update: { emoji: '📢', color: '#3B82F6', colorInt: 0x3B82F6, label: 'Store Update', title: 'Store Update' },
  custom: { emoji: '💬', color: '#6B7280', colorInt: 0x6B7280, label: 'Custom', title: 'Announcement' },
};

const TEMPLATES: { type: AnnouncementFormData['announcementType']; title: string; description: string; }[] = [
  {
    type: 'product_release',
    title: 'New Product Release!',
    description: "We just dropped something new! 🎉\n\nCheck out our latest product — available now on the marketplace.\n\nBe one of the first to grab it!",
  },
  {
    type: 'flash_sale',
    title: 'Flash Sale — Limited Time!',
    description: "⚡ FLASH SALE ⚡\n\nFor the next 24 hours, enjoy huge discounts across our store.\n\nDon't miss out — once it's gone, it's gone!",
  },
  {
    type: 'restock',
    title: 'Back in Stock!',
    description: "Great news! 📦\n\nA fan-favourite product is back in stock and ready to go.\n\nGrab it before it sells out again!",
  },
  {
    type: 'giveaway',
    title: 'Giveaway Time!',
    description: "🎁 GIVEAWAY 🎁\n\nWe're giving away a free product to one lucky winner!\n\nHow to enter:\n• React to this message\n• Be a member of the server\n\nWinner announced in 48 hours. Good luck!",
  },
  {
    type: 'promotion',
    title: 'Special Promotion!',
    description: "🔥 Limited-time offer!\n\nUse code **SAVE20** at checkout for 20% off your next purchase.\n\nHurry — offer ends soon!",
  },
];

export function ScheduledAnnouncementCard() {
  const { store } = useSellerStatus();
  const hasBotConnected = !!store?.credentials?.discord_guild_id;
  const hasWebhook = !!store?.credentials?.discord_webhook_url;
  const [showPreview, setShowPreview] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    description: '',
    announcementType: 'custom',
    linkUrl: '',
    channelId: '',
    pingRoles: false,
  });

  const config = TYPE_CONFIG[formData.announcementType];

  const getEmbed = () => {
    const fields: any[] = [];
    if (formData.linkUrl) {
      fields.push({ name: '🔗 Link', value: `[Click here](${formData.linkUrl})`, inline: false });
    }
    return {
      title: `${config.emoji} ${formData.announcementType === 'custom' ? formData.title : config.title}`,
      description: formData.description,
      color: config.colorInt,
      fields: fields.length > 0 ? fields : undefined,
      footer: { text: `${store?.name || 'Store'} • Announcement` },
      timestamp: new Date().toISOString(),
    };
  };

  const sendAnnouncement = useMutation({
    mutationFn: async () => {
      const embed = getEmbed();
      if (hasBotConnected && formData.channelId.trim()) {
        const rolePings: string[] = [];
        if (formData.pingRoles) {
          if (store?.credentials?.product_drops_role_id) rolePings.push(store.credentials.product_drops_role_id);
          if (store?.credentials?.early_product_drops_role_id) rolePings.push(store.credentials.early_product_drops_role_id);
        }
        const content = rolePings.length > 0 ? rolePings.map(id => `<@&${id}>`).join(' ') : undefined;
        const { data, error } = await supabase.functions.invoke('send-product-drop-embed', {
          body: { channel_id: formData.channelId.trim(), embed, content },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else if (hasWebhook) {
        const response = await fetch(store!.credentials!.discord_webhook_url!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: store?.name || 'Store Announcement', embeds: [embed] }),
        });
        if (!response.ok) throw new Error('Failed to send announcement via webhook');
      } else {
        throw new Error('No sending method configured. Add the Eclipse Portal Bot or configure a webhook.');
      }
    },
    onSuccess: () => {
      toast.success('Announcement sent!');
      setFormData({ title: '', description: '', announcementType: 'custom', linkUrl: '', channelId: formData.channelId, pingRoles: false });
    },
    onError: (error) => toast.error(error.message),
  });

  const canSend = formData.title.trim() && formData.description.trim() && (
    (hasBotConnected && formData.channelId.trim()) || hasWebhook
  );

  const sendingMethod = hasBotConnected && formData.channelId.trim() ? 'bot' : hasWebhook ? 'webhook' : null;

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      announcementType: template.type,
      title: template.title,
      description: template.description,
    }));
    setShowTemplates(false);
  };

  const pingText = formData.pingRoles && (store?.credentials?.product_drops_role_id || store?.credentials?.early_product_drops_role_id)
    ? '@Product Drops'
    : undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Discord Announcements
            </CardTitle>
            <CardDescription>
              Send announcements to your Discord community
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Templates
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              Preview
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasBotConnected && !hasWebhook && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
            Add the Eclipse Portal Bot above or configure a Discord webhook in Settings → Notifications to enable announcements.
          </div>
        )}

        {/* Templates */}
        {showTemplates && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="col-span-full text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Quick Templates</p>
            {TEMPLATES.map((template) => {
              const tConfig = TYPE_CONFIG[template.type];
              return (
                <button
                  key={template.type}
                  onClick={() => applyTemplate(template)}
                  className="flex items-center gap-2 p-2.5 rounded-md border border-border/50 bg-card hover:bg-muted/60 transition-colors text-left"
                >
                  <span className="text-base">{tConfig.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tConfig.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{template.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className={cn("grid gap-4", showPreview ? "lg:grid-cols-2" : "grid-cols-1")}>
          {/* Form */}
          <div className="space-y-3">
            {/* Bot Channel ID */}
            {hasBotConnected && (
              <div className="space-y-1.5">
                <Label htmlFor="channelId" className="flex items-center gap-2 text-xs">
                  <Bot className="h-3.5 w-3.5" />
                  Channel ID
                </Label>
                <Input
                  id="channelId"
                  value={formData.channelId}
                  onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                  placeholder="Right-click channel → Copy Channel ID"
                  className="font-mono text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={formData.announcementType}
                onValueChange={(value: any) => setFormData({ ...formData, announcementType: value })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.emoji} {val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ann-title" className="text-xs">Title</Label>
              <Input
                id="ann-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title..."
                maxLength={100}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ann-desc" className="text-xs">Message</Label>
              <Textarea
                id="ann-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write your announcement message..."
                rows={5}
                maxLength={1000}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground text-right">{formData.description.length}/1000</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ann-link" className="text-xs">Link URL (optional)</Label>
              <Input
                id="ann-link"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://..."
                type="url"
                className="text-xs"
              />
            </div>

            {/* Role Ping Toggle */}
            {hasBotConnected && formData.channelId.trim() && (store?.credentials?.product_drops_role_id || store?.credentials?.early_product_drops_role_id) && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="pingRoles" className="text-xs font-medium">Ping Roles</Label>
                  <p className="text-[11px] text-muted-foreground">Mention product drop roles</p>
                </div>
                <Switch
                  id="pingRoles"
                  checked={formData.pingRoles}
                  onCheckedChange={(checked) => setFormData({ ...formData, pingRoles: checked })}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
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
                <Badge variant="outline" className="self-center text-[11px]">
                  {sendingMethod === 'bot' ? (
                    <><Bot className="h-3 w-3 mr-1" /> Via Portal Bot</>
                  ) : (
                    <><Webhook className="h-3 w-3 mr-1" /> Via Webhook</>
                  )}
                </Badge>
              )}
            </div>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</p>
              <DiscordEmbedPreview
                title={`${config.emoji} ${formData.announcementType === 'custom' ? (formData.title || 'Announcement') : config.title}`}
                description={formData.description}
                color={config.color}
                linkUrl={formData.linkUrl || undefined}
                footerText={`${store?.name || 'Store'} • Announcement`}
                pingText={pingText}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
