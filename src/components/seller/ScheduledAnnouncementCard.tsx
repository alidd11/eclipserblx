import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Send, Clock, Megaphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AnnouncementFormData {
  title: string;
  description: string;
  scheduledDate: Date | undefined;
  scheduledTime: string;
  announcementType: 'product_release' | 'promotion' | 'update' | 'custom';
  linkUrl: string;
}

export function ScheduledAnnouncementCard() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    description: '',
    scheduledDate: undefined,
    scheduledTime: '12:00',
    announcementType: 'custom',
    linkUrl: '',
  });

  const sendAnnouncement = useMutation({
    mutationFn: async (immediate: boolean) => {
      if (!store?.credentials?.discord_webhook_url) {
        throw new Error('Please configure your Discord webhook URL in Settings → Notifications');
      }

      const embed = getEmbed();
      
      const response = await fetch(store.credentials.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: store?.name || 'Store Announcement',
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send announcement');
      }

      return { immediate };
    },
    onSuccess: ({ immediate }) => {
      toast.success(immediate ? 'Announcement sent!' : 'Announcement scheduled!');
      setFormData({
        title: '',
        description: '',
        scheduledDate: undefined,
        scheduledTime: '12:00',
        announcementType: 'custom',
        linkUrl: '',
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
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
      footer: {
        text: `${store?.name || 'Store'} • Announcement`,
      },
      timestamp: new Date().toISOString(),
    };
  };

  const canSend = formData.title.trim() && formData.description.trim() && store?.credentials?.discord_webhook_url;

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
        {!store?.credentials?.discord_webhook_url && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
            Configure your Discord webhook in Settings → Notifications to enable announcements.
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

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={() => sendAnnouncement.mutate(true)}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
