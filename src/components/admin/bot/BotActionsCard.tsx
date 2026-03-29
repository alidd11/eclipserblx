import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Channel {
  id: string;
  name: string;
  position: number;
}

export function BotActionsCard() {
  const [selectedGuild, setSelectedGuild] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');

  // Get guilds for the dropdown
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

  // Get channels when guild selected
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
      const { data, error } = await supabase.functions.invoke('bot-control', {
        body: {
          action: 'send-message',
          channel_id: selectedChannel,
          content: message,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Message sent!');
      setMessage('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Bot Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Send Announcement */}
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium text-sm">Send Message</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Server</Label>
              <Select value={selectedGuild} onValueChange={(v) => { setSelectedGuild(v); setSelectedChannel(''); }}>
                <SelectTrigger>
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
              <Label className="text-xs">Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel} disabled={!selectedGuild || loadingChannels}>
                <SelectTrigger>
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
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            size="sm"
            onClick={() => sendMessage.mutate()}
            disabled={!selectedChannel || !message.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Send
          </Button>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/discord-settings">Discord Settings</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/portal-bot-setup">Bot Files</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
