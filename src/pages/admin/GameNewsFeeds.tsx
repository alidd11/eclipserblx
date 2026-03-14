import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Rss, Plus, Trash2, Loader2, RefreshCw, Clock, ExternalLink } from 'lucide-react';
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

export default function GameNewsFeeds() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const addMutation = useMutation({
    mutationFn: async (feed: typeof newFeed) => {
      const { error } = await supabase.from('game_news_feeds').insert({
        name: feed.name,
        feed_url: feed.feed_url,
        feed_type: feed.feed_type,
        discord_channel_id: feed.discord_channel_id,
        ping_role_id: feed.ping_role_id || null,
        check_interval_minutes: feed.check_interval_minutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-news-feeds'] });
      toast.success('Feed added');
      setDialogOpen(false);
      setNewFeed({ name: '', feed_url: '', feed_type: 'rss', discord_channel_id: '', ping_role_id: '', check_interval_minutes: 10 });
    },
    onError: (err: Error) => toast.error(err.message),
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rss className="h-6 w-6 text-primary" />
              Game News Feeds
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Automatically post game news from RSS feeds to Discord channels.
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Feed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add News Feed</DialogTitle>
                  <DialogDescription>
                    Add an RSS/Atom or JSON feed to automatically post game news to Discord.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Feed Name</Label>
                    <Input
                      placeholder="e.g. GTA News"
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                      placeholder="Role ID to ping on new articles"
                      value={newFeed.ping_role_id}
                      onChange={(e) => setNewFeed(p => ({ ...p, ping_role_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Check Interval (minutes)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={60}
                      value={newFeed.check_interval_minutes}
                      onChange={(e) => setNewFeed(p => ({ ...p, check_interval_minutes: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => addMutation.mutate(newFeed)}
                    disabled={!newFeed.name || !newFeed.feed_url || !newFeed.discord_channel_id || addMutation.isPending}
                  >
                    {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Add Feed
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !feeds?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Rss className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No feeds configured yet. Add an RSS feed to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {feeds.map((feed) => (
              <Card key={feed.id} className={!feed.enabled ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{feed.name}</h3>
                        <Badge variant={feed.enabled ? 'default' : 'secondary'} className="text-xs">
                          {feed.enabled ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="outline" className="text-xs uppercase">
                          {feed.feed_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {feed.feed_url}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Channel: {feed.discord_channel_id}</span>
                        {feed.ping_role_id && <span>Ping: {feed.ping_role_id}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Every {feed.check_interval_minutes}m
                        </span>
                        {feed.last_checked_at && (
                          <span>Checked {formatDistanceToNow(new Date(feed.last_checked_at), { addSuffix: true })}</span>
                        )}
                      </div>
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
                          if (confirm(`Delete feed "${feed.name}"?`)) {
                            deleteMutation.mutate(feed.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
