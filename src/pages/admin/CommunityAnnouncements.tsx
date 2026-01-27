import { useState } from 'react';
import { Send, MessageCircle, Megaphone, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

const ANNOUNCEMENT_TYPES = [
  { value: 'custom', label: 'Custom Announcement', icon: MessageCircle },
  { value: 'update', label: 'Platform Update', icon: Megaphone },
  { value: 'maintenance', label: 'Maintenance Notice', icon: AlertCircle },
  { value: 'event', label: 'Community Event', icon: CheckCircle2 },
];

export default function CommunityAnnouncements() {
  const [announcementType, setAnnouncementType] = useState('custom');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch webhook URL to check if configured
  const { data: webhookUrl } = useQuery({
    queryKey: ['community-announcements-webhook'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'community_discord_webhook_url')
        .maybeSingle();
      
      if (error) throw error;
      if (!data?.value) return null;
      
      const val = typeof data.value === 'string' 
        ? data.value.replace(/^"|"$/g, '') 
        : String(data.value);
      return val || null;
    },
  });

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (message.length > 1000) {
      toast.error('Message must be 1000 characters or less');
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-community-announcement', {
        body: {
          type: announcementType,
          title: title.trim(),
          message: message.trim(),
          linkUrl: linkUrl.trim() || undefined,
        },
      });

      if (error) {
        toast.error(`Failed to send: ${error.message}`);
      } else if (data?.success) {
        toast.success('Announcement sent to Discord!');
        setTitle('');
        setMessage('');
        setLinkUrl('');
      } else {
        toast.error(data?.error || 'Failed to send announcement');
      }
    } catch (err: any) {
      console.error('Announcement error:', err);
      toast.error('Failed to send announcement');
    } finally {
      setIsSending(false);
    }
  };

  const selectedType = ANNOUNCEMENT_TYPES.find(t => t.value === announcementType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Community Announcements</h1>
        <p className="text-muted-foreground">Send announcements to your Discord community</p>
      </div>

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
        <CardContent className="space-y-6">
          {!webhookUrl && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-600 dark:text-amber-400">
                <Link to="/admin/discord-settings" className="underline hover:no-underline">
                  Configure your Discord webhook in Settings → Discord
                </Link>{' '}
                to enable announcements.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Announcement Type</Label>
            <Select value={announcementType} onValueChange={setAnnouncementType}>
              <SelectTrigger>
                <SelectValue>
                  {selectedType && (
                    <span className="flex items-center gap-2">
                      <selectedType.icon className="h-4 w-4" />
                      {selectedType.label}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ANNOUNCEMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Write your announcement message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              className="min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkUrl">Link URL (optional)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="linkUrl"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Button 
            onClick={handleSend} 
            disabled={isSending || !webhookUrl}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Now'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
