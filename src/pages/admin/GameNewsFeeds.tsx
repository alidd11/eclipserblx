import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Rss, Plus, Trash2, Loader2, RefreshCw, Clock, ExternalLink, Gamepad2, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GameNewsFeed {
  id: string;
  name: string;
  feed_url: string;
  feed_type: string;
  discord_channel_id: string;
  ping_role_id: string | null;
  enabled: boolean;
  check_interval_minutes: number;
  last_checked_at: string | null;
  created_at: string;
}

const DEFAULT_CHANNEL_ID = '1482392729563693292';

// Popular game presets with verified working RSS/JSON feed URLs
const POPULAR_GAMES = [
  {
    name: 'CS2',
    emoji: '💣',
    feed_url: 'https://blog.counter-strike.net/index.php/feed/',
    feed_type: 'rss',
    description: 'Counter-Strike 2 blog and updates',
    icon_url: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/global/logo_cs_sm.png',
    embed_color: 0xFFCC00,
  },
  {
    name: 'GTA / Rockstar Games',
    emoji: '🚗',
    feed_url: 'https://rockstarintel.com/feed/',
    feed_type: 'rss',
    description: 'GTA, RDR2 and Rockstar news via RockstarINTEL',
    icon_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Rockstar_Games_Logo.svg/1200px-Rockstar_Games_Logo.svg.png',
    embed_color: 0xFFFF00,
  },
  {
    name: 'Fortnite',
    emoji: '🔫',
    feed_url: 'https://fortnite-api.com/v2/news?language=en',
    feed_type: 'json',
    description: 'Fortnite official in-game news and updates',
    icon_url: 'https://fortnite-api.com/assets/branding/icon.png',
    embed_color: 0x2B7FFF,
  },
  {
    name: 'Roblox (Dev Updates)',
    emoji: '🟩',
    feed_url: 'https://devforum.roblox.com/c/updates/announcements.rss',
    feed_type: 'rss',
    description: 'Roblox DevForum — Studio betas, API updates, engine changelogs',
    icon_url: 'https://devforum-uploads.s3.dualstack.us-east-2.amazonaws.com/uploads/optimized/4X/3/4/e/34e3a04d95f8ed0e8f94a95f0e62c5be8a5c4c2c_2_180x180.png',
    embed_color: 0x00BB00,
  },
  {
    name: 'EA Games (All)',
    emoji: '🎮',
    feed_url: 'https://news.ea.com/rss/pressrelease.aspx',
    feed_type: 'rss',
    description: 'EA press releases — Apex, FIFA, Battlefield and more',
    icon_url: 'https://media.contentapi.ea.com/content/dam/ea/ea-global-assets/ea-com-logos/ea_logo_2020_white.png',
    embed_color: 0x0000FF,
  },
  {
    name: 'GitHub Blog',
    emoji: '🐙',
    feed_url: 'https://github.blog/feed/',
    feed_type: 'rss',
    description: 'Developer tools, Copilot, and GitHub platform updates',
    icon_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    embed_color: 0x1A1E2A,
  },
  {
    name: 'Unity Blog',
    emoji: '🎯',
    feed_url: 'https://blog.unity.com/feed',
    feed_type: 'rss',
    description: 'Unity engine updates, tutorials and game dev news',
    icon_url: 'https://unity.com/favicon.ico',
    embed_color: 0x222222,
  },
];

export default function GameNewsFeeds() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<typeof POPULAR_GAMES[0] | null>(null);
  const [channelId, setChannelId] = useState('');
  const [pingRoleId, setPingRoleId] = useState('');
  const [feedPingInputs, setFeedPingInputs] = useState<Record<string, string>>({});
  const [newFeed, setNewFeed] = useState({
    name: '',
    feed_url: '',
    feed_type: 'rss',
    discord_channel_id: '',
    ping_role_id: '',
    check_interval_minutes: 10,
  });

  const { data: feeds, isLoading } = useQuery({
    queryKey: ['game-news-feeds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_news_feeds')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GameNewsFeed[];
    },
  });

  // Initialize per-feed ping role inputs from DB
  useEffect(() => {
    if (feeds) {
      const inputs: Record<string, string> = {};
      feeds.forEach(f => { inputs[f.id] = f.ping_role_id || ''; });
      setFeedPingInputs(prev => {
        // Only set if not already user-modified
        const merged = { ...inputs };
        Object.keys(prev).forEach(k => { if (prev[k] !== undefined) merged[k] = prev[k]; });
        return merged;
      });
    }
  }, [feeds]);

  // Check which presets are already added (by feed_url or name match)
  const addedFeedUrls = new Set((feeds || []).map(f => f.feed_url));
  const getFeedForPreset = (preset: typeof POPULAR_GAMES[0]) =>
    (feeds || []).find(f => f.feed_url === preset.feed_url || f.name === preset.name);

  const addMutation = useMutation({
    mutationFn: async (feed: {
      name: string;
      feed_url: string;
      feed_type: string;
      discord_channel_id: string;
      ping_role_id: string;
      check_interval_minutes: number;
      icon_url?: string | null;
      embed_color?: number | null;
    }) => {
      const { error } = await supabase.from('game_news_feeds').insert({
        name: feed.name,
        feed_url: feed.feed_url,
        feed_type: feed.feed_type,
        discord_channel_id: feed.discord_channel_id,
        ping_role_id: feed.ping_role_id || null,
        check_interval_minutes: feed.check_interval_minutes,
        icon_url: feed.icon_url || null,
        embed_color: feed.embed_color || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-news-feeds'] });
      toast.success('Feed added');
      setDialogOpen(false);
      setChannelDialogOpen(false);
      setSelectedPreset(null);
      setChannelId('');
      setPingRoleId('');
      setNewFeed({ name: '', feed_url: '', feed_type: 'rss', discord_channel_id: '', ping_role_id: '', check_interval_minutes: 10 });
    },
    onError: (err: any) => {
      console.error('[GameNewsFeeds] Add feed error:', err);
      toast.error(err?.message || err?.details || 'Failed to add feed');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('game_news_feeds')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-news-feeds'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('game_news_feeds').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-news-feeds'] });
      toast.success('Feed removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pollMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('poll-game-news');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-news-feeds'] });
      toast.success(`Poll complete — ${data?.posted ?? 0} new articles posted`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateGlobalPingRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('game_news_feeds')
        .update({ ping_role_id: roleId || null, updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-news-feeds'] });
      setGlobalPingRoleId(globalPingRoleInput);
      toast.success(globalPingRoleInput ? 'Ping role saved for all feeds' : 'Ping role removed from all feeds');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePresetToggle = (preset: typeof POPULAR_GAMES[0], currentlyAdded: boolean) => {
    if (currentlyAdded) {
      const feed = getFeedForPreset(preset);
      if (feed) {
        deleteMutation.mutate(feed.id);
      }
    } else {
      addMutation.mutate({
        name: preset.name,
        feed_url: preset.feed_url,
        feed_type: preset.feed_type,
        discord_channel_id: DEFAULT_CHANNEL_ID,
        ping_role_id: globalPingRoleId,
        check_interval_minutes: 10,
      });
    }
  };

  const handlePresetConfirm = () => {
    if (!selectedPreset || !channelId) return;
    addMutation.mutate({
      name: selectedPreset.name,
      feed_url: selectedPreset.feed_url,
      feed_type: selectedPreset.feed_type,
      discord_channel_id: channelId,
      ping_role_id: pingRoleId,
      check_interval_minutes: 10,
      icon_url: (selectedPreset as any).icon_url || null,
      embed_color: (selectedPreset as any).embed_color || null,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              Game News Feeds
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Toggle popular games on/off to auto-post updates to Discord.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pollMutation.mutate()}
              disabled={pollMutation.isPending}
            >
              {pollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Poll Now
            </Button>
          </div>
        </div>

        {/* Global Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </CardTitle>
            <CardDescription>
              Configure the ping role for all game news updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Ping Role ID (optional)</Label>
                <Input
                  placeholder="Role ID to mention on new articles"
                  value={globalPingRoleInput}
                  onChange={(e) => setGlobalPingRoleInput(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                size="sm"
                className="self-end h-9"
                onClick={() => updateGlobalPingRoleMutation.mutate(globalPingRoleInput)}
                disabled={updateGlobalPingRoleMutation.isPending || globalPingRoleInput === globalPingRoleId}
              >
                {updateGlobalPingRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
            {globalPingRoleId && (
              <p className="text-xs text-muted-foreground mt-2">
                Currently pinging: <code className="bg-muted px-1 rounded text-[11px]">&lt;@&amp;{globalPingRoleId}&gt;</code>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Popular Games Grid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Game & Dev Feeds</CardTitle>
            <CardDescription>
              Toggle feeds on/off to auto-post updates to your Discord channel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {POPULAR_GAMES.map((preset) => {
                const isAdded = addedFeedUrls.has(preset.feed_url) || !!getFeedForPreset(preset);
                const existingFeed = getFeedForPreset(preset);
                const isEnabled = existingFeed?.enabled ?? false;

                return (
                  <div
                    key={preset.feed_url}
                    className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
                      isAdded && isEnabled
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">{preset.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{preset.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                        {isAdded && existingFeed && existingFeed.last_checked_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Checked {formatDistanceToNow(new Date(existingFeed.last_checked_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {isAdded && existingFeed && (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(enabled) =>
                            toggleMutation.mutate({ id: existingFeed.id, enabled })
                          }
                        />
                      )}
                      {!isAdded && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => handlePresetToggle(preset, false)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Enable
                        </Button>
                      )}
                      {isAdded && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remove ${preset.name} feed?`)) {
                              handlePresetToggle(preset, true);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Channel Setup Dialog for Presets */}
        <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedPreset?.emoji} Enable {selectedPreset?.name}
              </DialogTitle>
              <DialogDescription>
                Choose which Discord channel to post {selectedPreset?.name} updates to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Discord Channel ID</Label>
                <Input
                  placeholder="Paste the channel ID"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Right-click a channel in Discord → Copy Channel ID
                </p>
              </div>
              <div>
                <Label>Ping Role ID (optional)</Label>
                <Input
                  placeholder="Role ID to mention on new articles"
                  value={pingRoleId}
                  onChange={(e) => setPingRoleId(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChannelDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handlePresetConfirm}
                disabled={!channelId || addMutation.isPending}
              >
                {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Enable Feed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Feeds Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Custom Feeds</CardTitle>
                <CardDescription>Add your own RSS or JSON news feeds.</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Custom
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Feed</DialogTitle>
                    <DialogDescription>
                      Add any RSS/Atom or JSON feed URL.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Feed Name</Label>
                      <Input
                        placeholder="e.g. My Game News"
                        value={newFeed.name}
                        onChange={(e) => setNewFeed(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Feed URL</Label>
                      <Input
                        placeholder="https://..."
                        value={newFeed.feed_url}
                        onChange={(e) => setNewFeed(p => ({ ...p, feed_url: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Feed Type</Label>
                      <Select value={newFeed.feed_type} onValueChange={(v) => setNewFeed(p => ({ ...p, feed_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rss">RSS / Atom</SelectItem>
                          <SelectItem value="json">JSON API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Discord Channel ID</Label>
                      <Input
                        placeholder="Channel ID to post to"
                        value={newFeed.discord_channel_id}
                        onChange={(e) => setNewFeed(p => ({ ...p, discord_channel_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Ping Role ID (optional)</Label>
                      <Input
                        placeholder="Role ID to ping"
                        value={newFeed.ping_role_id}
                        onChange={(e) => setNewFeed(p => ({ ...p, ping_role_id: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => addMutation.mutate(newFeed)}
                      disabled={!newFeed.name || !newFeed.feed_url || !newFeed.discord_channel_id || addMutation.isPending}
                    >
                      {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Add Feed
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const customFeeds = (feeds || []).filter(
                f => !POPULAR_GAMES.some(p => p.feed_url === f.feed_url || p.name === f.name)
              );
              if (!customFeeds.length) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No custom feeds yet. Use the presets above or add your own.
                  </p>
                );
              }
              return (
                <div className="grid gap-3">
                  {customFeeds.map((feed) => (
                    <div
                      key={feed.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                        feed.enabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Rss className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <p className="font-medium text-sm">{feed.name}</p>
                          <Badge variant="outline" className="text-[10px] uppercase">{feed.feed_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate pl-5">{feed.feed_url}</p>
                        <p className="text-xs text-muted-foreground pl-5">
                          Channel: {feed.discord_channel_id}
                          {feed.last_checked_at && (
                            <> · Checked {formatDistanceToNow(new Date(feed.last_checked_at), { addSuffix: true })}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={feed.enabled}
                          onCheckedChange={(enabled) => toggleMutation.mutate({ id: feed.id, enabled })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete "${feed.name}"?`)) {
                              deleteMutation.mutate(feed.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
