import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
 ShoppingCart,
 RefreshCw,
 AlertTriangle,
 DollarSign,
 Save,
 Loader2,
 Info,
 CheckCircle,
 XCircle,
 Bot,
 Hash,
 Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface ChannelConfig {
 key: string;
 label: string;
 description: string;
 icon: React.ReactNode;
 placeholder: string;
}

const CHANNELS: ChannelConfig[] = [
 {
 key: 'product_feed_channel_id',
 label: 'Product Feed',
 description: 'Auto-post new product listings when they go live on the marketplace',
 icon: <Package className="h-4 w-4 text-cyan-500" />,
 placeholder: 'Channel ID for product feed auto-posts',
 },
 {
 key: 'orders_channel_id',
 label: 'New Orders',
 description: 'Get notified when a customer purchases from your store',
 icon: <ShoppingCart className="h-4 w-4 text-green-500" />,
 placeholder: 'Channel ID for order notifications',
 },
 {
 key: 'sales_channel_id',
 label: 'Sales Log',
 description: 'Detailed sales log with revenue breakdowns',
 icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
 placeholder: 'Channel ID for sales log',
 },
 {
 key: 'refunds_channel_id',
 label: 'Refunds',
 description: 'Get notified when a refund is processed on your products',
 icon: <RefreshCw className="h-4 w-4 text-amber-500" />,
 placeholder: 'Channel ID for refund notifications',
 },
 {
 key: 'disputes_channel_id',
 label: 'Disputes',
 description: 'Get notified when a customer files a dispute',
 icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
 placeholder: 'Channel ID for dispute notifications',
 },
];

export function DiscordNotificationsTab() {
 const { store } = useSellerStatus();
 const queryClient = useQueryClient();
 const hasBotConnected = !!store?.credentials?.discord_guild_id;

 const [channelIds, setChannelIds] = useState<Record<string, string>>({});

 useEffect(() => {
 if (store?.credentials) {
 const creds = store.credentials as Record<string, unknown>;
 const initial: Record<string, string> = {};
 CHANNELS.forEach((ch) => {
 initial[ch.key] = (creds[ch.key] as string) || '';
 });
 setChannelIds(initial);
 }
 }, [store?.credentials]);

 const hasChanges = CHANNELS.some((ch) => {
 const creds = store?.credentials as Record<string, unknown> | undefined;
 return channelIds[ch.key] !== ((creds?.[ch.key] as string) || '');
 });

 const saveChannels = useMutation({
 mutationFn: async () => {
 if (!store?.id) throw new Error('Store not found');
 const updates: Record<string, string | null> = {};
 CHANNELS.forEach((ch) => {
 updates[ch.key] = channelIds[ch.key]?.trim() || null;
 });
 const { error } = await supabase
 .from('store_credentials')
 .update(updates)
 .eq('store_id', store.id);
 if (error) throw error;
 },
 onSuccess: () => {
 toast.success('Notification channels saved');
 queryClient.invalidateQueries({ queryKey: ['seller-store'] });
 },
 onError: (error) => toast.error(error.message || 'Failed to save'),
 });

 const configuredCount = CHANNELS.filter((ch) => channelIds[ch.key]?.trim()).length;

 return (
 <div className="space-y-4">
 {/* Info Banner */}
 {!hasBotConnected ? (
 <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
 <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
 <div className="text-sm text-amber-600 dark:text-amber-400">
 <p className="font-medium">Bot not connected</p>
 <p className="text-xs mt-0.5">
 You need to add the Eclipse Portal Bot to your server first (Bot tab) to receive notifications.
 </p>
 </div>
 </div>
 ) : (
 <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
 <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
 <div className="text-sm">
 <p className="font-medium">Route notifications to your server</p>
 <p className="text-xs text-muted-foreground mt-0.5">
 Paste a Discord channel ID for each notification type. The Eclipse Portal Bot will post updates directly to your channels.
 Right-click any channel in Discord → <span className="font-mono text-[11px]">Copy Channel ID</span>.
 </p>
 </div>
 </div>
 )}

 {/* Status summary */}
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-xs">
 {configuredCount}/{CHANNELS.length} channels configured
 </Badge>
 </div>

 {/* Channel cards */}
 <div className="space-y-3">
 {CHANNELS.map((channel) => {
 const value = channelIds[channel.key] || '';
 const isConfigured = !!value.trim();

 return (
 <div className="border border-border rounded-xl overflow-hidden" key={channel.key} className="border-border/50">
 <div className="p-4 p-4">
 <div className="flex flex-col sm:flex-row sm:items-start gap-3">
 <div className="flex items-start gap-3 flex-1 min-w-0">
 <div className="mt-0.5 shrink-0">{channel.icon}</div>
 <div className="flex-1 min-w-0 space-y-2">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium">{channel.label}</span>
 {isConfigured ? (
 <CheckCircle className="h-3.5 w-3.5 text-green-500" />
 ) : (
 <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
 )}
 </div>
 <p className="text-xs text-muted-foreground">{channel.description}</p>
 <div className="flex items-center gap-2">
 <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
 <Input
 value={value}
 onChange={(e) =>
 setChannelIds((prev) => ({ ...prev, [channel.key]: e.target.value }))
 }
 placeholder={channel.placeholder}
 className="font-mono text-xs h-8"
 disabled={!hasBotConnected}
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Save */}
 <Button
 onClick={() => saveChannels.mutate()}
 disabled={!hasChanges || saveChannels.isPending || !hasBotConnected}
 className="w-full"
 >
 {saveChannels.isPending ? (
 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
 ) : (
 <Save className="h-4 w-4 mr-2" />
 )}
 Save Notification Channels
 </Button>
 </div>
 );
}
