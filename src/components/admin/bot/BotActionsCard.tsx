import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
 const [useEmbed, setUseEmbed] = useState(false);
 const [embedTitle, setEmbedTitle] = useState('');
 const [embedColor, setEmbedColor] = useState('#8b5cf6');

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
 const payload: Record<string, unknown> = {
 action: 'send-message',
 channel_id: selectedChannel,
 };

 if (useEmbed) {
 // Convert hex to Discord int color
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

 const { data, error } = await supabase.functions.invoke('bot-control', {
 body: payload,
 });
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
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <Zap className="h-5 w-5" />
 Bot Actions
 </h3>
 </div>
 <div className="p-4 space-y-4">
 {/* Send Announcement */}
 <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
 <div className="flex items-center justify-between">
 <h4 className="font-medium text-sm">Send Message</h4>
 <div className="flex items-center gap-2">
 <Label className="text-xs text-muted-foreground">Embed</Label>
 <Switch checked={useEmbed} onCheckedChange={setUseEmbed} />
 </div>
 </div>
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

 {useEmbed && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <Label className="text-xs">Embed Title</Label>
 <Input
 placeholder="Announcement title..."
 value={embedTitle}
 onChange={(e) => setEmbedTitle(e.target.value)}
 />
 </div>
 <div>
 <Label className="text-xs">Color</Label>
 <div className="flex gap-2">
 <Input
 type="color"
 value={embedColor}
 onChange={(e) => setEmbedColor(e.target.value)}
 className="w-12 h-9 p-1 cursor-pointer"
 />
 <Input
 value={embedColor}
 onChange={(e) => setEmbedColor(e.target.value)}
 className="font-mono text-xs"
 placeholder="#8b5cf6"
 />
 </div>
 </div>
 </div>
 )}

 <div>
 <Label className="text-xs">{useEmbed ? 'Description' : 'Message'}</Label>
 <Textarea
 placeholder={useEmbed ? 'Embed description...' : 'Type your message...'}
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
 </div>
 </div>
 );
}
