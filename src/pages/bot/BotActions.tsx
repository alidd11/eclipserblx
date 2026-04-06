import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Zap, Send, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Channel {
  id: string;
  name: string;
  position: number;
}

export default function BotActions() {
  const [selectedGuild, setSelectedGuild] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');
  const [useEmbed, setUseEmbed] = useState(false);
  const [embedTitle, setEmbedTitle] = useState('');
  const [embedColor, setEmbedColor] = useState('#8b5cf6');

  const { data: guilds = [] } = useQuery({
    queryKey: ['bot-guilds'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bot-control', {
        body: { action: 'list-guilds' },
      });
      if (error) throw error;
      return data?.guilds || [];
    },
  });

  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ['bot-guild-channels', selectedGuild],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bot-control', {
        body: { action: 'guild-channels', guild_id: selectedGuild },
      });
      if (error) throw error;
      return ((data?.channels || []) as Channel[]).sort((a, b) => a.position - b.position);
    },
    enabled: !!selectedGuild,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        action: 'send-message',
        channel_id: selectedChannel,
      };
      if (useEmbed) {
        const colorInt = parseInt(embedColor.replace('#', ''), 16);
        payload.embed = {
          title: embedTitle || undefined,
          description: message,
          color: colorInt,
          timestamp: new Date().toISOString(),
        };
      } else {
        payload.content = message;
      }
      const { data, error } = await supabase.functions.invoke('bot-control', { body: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Message sent!');
      setMessage('');
      setEmbedTitle('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BotDashboardLayout>
      <div className="space-y-5 max-w-4xl mx-auto">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-[hsl(258,90%,66%)]" />
            Bot Actions
          </h2>
          <p className="text-xs sm:text-sm text-foreground/50 mt-1">Send messages and embeds to Discord channels</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
          {/* Message Builder */}
          <div className="rounded-xl bg-background/5 border border-white/10 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Message Builder</h3>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-foreground/50">Embed</Label>
                <Switch checked={useEmbed} onCheckedChange={setUseEmbed} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-foreground/60 mb-1.5 block">Server</Label>
                <Select value={selectedGuild} onValueChange={(v) => { setSelectedGuild(v); setSelectedChannel(''); }}>
                  <SelectTrigger className="bg-background/5 border-white/10 text-foreground">
                    <SelectValue placeholder="Select server" />
                  </SelectTrigger>
                  <SelectContent>
                    {guilds.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-foreground/60 mb-1.5 block">Channel</Label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel} disabled={!selectedGuild || loadingChannels}>
                  <SelectTrigger className="bg-background/5 border-white/10 text-foreground">
                    <SelectValue placeholder={loadingChannels ? 'Loading...' : 'Select channel'} />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => (
                      <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {useEmbed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-foreground/60 mb-1.5 block">Embed Title</Label>
                  <Input
                    placeholder="Announcement title..."
                    value={embedTitle}
                    onChange={(e) => setEmbedTitle(e.target.value)}
                    className="bg-background/5 border-white/10 text-foreground placeholder:text-foreground/30"
                  />
                </div>
                <div>
                  <Label className="text-xs text-foreground/60 mb-1.5 block">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer bg-background/5 border-white/10 shrink-0"
                    />
                    <Input
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="font-mono text-xs bg-background/5 border-white/10 text-foreground"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-foreground/60 mb-1.5 block">{useEmbed ? 'Description' : 'Message'}</Label>
              <Textarea
                placeholder={useEmbed ? 'Embed description...' : 'Type your message...'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="bg-background/5 border-white/10 text-foreground placeholder:text-foreground/30 resize-none"
              />
            </div>

            <Button
              className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-foreground w-full sm:w-auto"
              onClick={() => sendMessage.mutate()}
              disabled={!selectedChannel || !message.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              Send Message
            </Button>
          </div>

          {/* Live Preview */}
          {useEmbed && (
            <div className="rounded-xl bg-background/5 border border-white/10 p-4 sm:p-5 lg:sticky lg:top-4 self-start">
              <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-foreground/40" />
                Embed Preview
              </h3>
              <div
                className="rounded-md p-3 sm:p-4 border-l-4"
                style={{ borderColor: embedColor, backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                {embedTitle && <p className="font-bold text-foreground text-sm mb-1">{embedTitle}</p>}
                <p className="text-sm text-foreground/70 whitespace-pre-wrap break-words">{message || 'Your description here...'}</p>
                <p className="text-[10px] text-foreground/30 mt-3">{new Date().toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </BotDashboardLayout>
  );
}
