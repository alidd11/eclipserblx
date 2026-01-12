import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Package, ChevronLeft, FileDown, CheckCircle, Loader2, Bot, Key, Copy, HardDrive, ExternalLink, Save } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useState } from 'react';
import { toast } from 'sonner';

// Format bytes to human readable size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface OrderItem {
  id: string;
  product_name: string;
  price: number;
  product_id: string | null;
  product?: {
    id: string;
    name: string;
    images: string[] | null;
    asset_file_url: string | null;
    category_id: string | null;
  } | null;
}

interface Order {
  id: string;
  status: string;
  created_at: string;
  total: number;
  order_items: OrderItem[];
}

interface BotInstallationCode {
  id: string;
  installation_code: string;
  order_item_id: string;
  is_used: boolean;
  discord_invite: string | null;
  discord_guild_name: string | null;
  discord_guild_icon: string | null;
  discord_member_count: number | null;
}

const BOT_CATEGORY_ID = '852838dc-adb6-4154-93fe-d1814fe46263';

interface DownloadProgress {
  itemId: string;
  progress: number;
  fileSize: number | null;
  downloaded: number;
}

export default function Downloads() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [editingDiscord, setEditingDiscord] = useState<string | null>(null);
  const [validatingDiscord, setValidatingDiscord] = useState(false);
  const [discordInput, setDiscordInput] = useState('');

  // Fetch bot installation codes for the user
  const { data: botCodes } = useQuery({
    queryKey: ['user-bot-codes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('bot_installation_codes')
        .select('id, installation_code, order_item_id, is_used, discord_invite, discord_guild_name, discord_guild_icon, discord_member_count')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as BotInstallationCode[];
    },
    enabled: !!user?.id,
  });

  // Mutation to update discord invite
  const updateDiscordMutation = useMutation({
    mutationFn: async ({ codeId, discordInvite }: { codeId: string; discordInvite: string }) => {
      const trimmed = discordInvite.trim();
      
      // Allow clearing the invite
      if (!trimmed) {
        const { error } = await supabase
          .from('bot_installation_codes')
          .update({ 
            discord_invite: null,
            discord_guild_name: null,
            discord_guild_icon: null
          })
          .eq('id', codeId)
          .eq('user_id', user?.id);
        if (error) throw error;
        return;
      }
      
      // Basic format validation
      if (!trimmed.match(/^https?:\/\/(discord\.(gg|com\/invite)|discordapp\.com\/invite)\//i)) {
        throw new Error('Please enter a valid Discord invite link');
      }
      
      // Validate that the invite is permanent via edge function
      setValidatingDiscord(true);
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-discord-invite', {
        body: { inviteUrl: trimmed },
      });
      setValidatingDiscord(false);
      
      if (validationError) {
        throw new Error('Failed to validate invite link');
      }
      
      if (!validationResult.valid) {
        throw new Error(validationResult.error || 'Invalid invite link');
      }
      
      // Save the validated invite with guild info
      const { error } = await supabase
        .from('bot_installation_codes')
        .update({ 
          discord_invite: trimmed,
          discord_guild_name: validationResult.guildName || null,
          discord_guild_icon: validationResult.guildIcon || null,
          discord_member_count: validationResult.memberCount || null
        })
        .eq('id', codeId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      return { 
        guildName: validationResult.guildName,
        guildIcon: validationResult.guildIcon,
        memberCount: validationResult.memberCount
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-bot-codes'] });
      toast.success(data?.guildName ? `Discord server "${data.guildName}" linked!` : 'Discord invite saved!');
      setEditingDiscord(null);
      setDiscordInput('');
    },
    onError: (error: any) => {
      setValidatingDiscord(false);
      toast.error(error.message || 'Failed to save Discord invite');
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['user-downloads', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return [];
      
      // Query by user_id first
      let { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          total,
          order_items (
            id,
            product_name,
            price,
            product_id,
            product:products (
              id,
              name,
              images,
              asset_file_url,
              category_id
            )
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['paid', 'completed'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Also query by email to catch orders where user_id wasn't set
      if (user?.email) {
        const { data: emailOrders, error: emailError } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            created_at,
            total,
            order_items (
              id,
              product_name,
              price,
              product_id,
              product:products (
                id,
                name,
                images,
                asset_file_url,
                category_id
              )
            )
          `)
          .eq('customer_email', user.email)
          .is('user_id', null)
          .in('status', ['paid', 'completed'])
          .order('created_at', { ascending: false });
        
        if (!emailError && emailOrders) {
          // Merge and deduplicate
          const allOrders = [...(data || []), ...emailOrders];
          const uniqueOrders = allOrders.filter((order, index, self) =>
            index === self.findIndex((o) => o.id === order.id)
          );
          return uniqueOrders as Order[];
        }
      }
      
      return (data || []) as Order[];
    },
    enabled: !!(user?.id || user?.email),
  });

  const handleDownload = async (item: OrderItem) => {
    if (!item.product_id || !session?.access_token) {
      showErrorNotification('Error', 'Unable to download');
      return;
    }

    setDownloading(item.id);
    setDownloadProgress({ itemId: item.id, progress: 0, fileSize: null, downloaded: 0 });

    try {
      const { data, error } = await supabase.functions.invoke('download-asset', {
        body: { 
          productId: item.product_id,
          orderItemId: item.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.error) {
        showErrorNotification('Download Error', data.error);
        return;
      }

      if (data?.downloadUrl) {
        const fileSize = data.fileSize || null;
        
        // Download with progress tracking
        const response = await fetch(data.downloadUrl);
        const reader = response.body?.getReader();
        const contentLength = fileSize || parseInt(response.headers.get('content-length') || '0', 10);
        
        if (reader && contentLength > 0) {
          let receivedLength = 0;
          const chunks: BlobPart[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(new Blob([value]));
            receivedLength += value.length;
            
            const progress = Math.round((receivedLength / contentLength) * 100);
            setDownloadProgress({
              itemId: item.id,
              progress,
              fileSize: contentLength,
              downloaded: receivedLength
            });
          }
          
          // Create blob and download
          const blob = new Blob(chunks);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.productName || 'download';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          // Fallback to simple download
          window.open(data.downloadUrl, '_blank');
        }
        
        showSuccessNotification('Downloaded!', data.productName || 'Your file is ready');
      }
    } catch (err: unknown) {
      console.error('Download error:', err);
      const message = err instanceof Error ? err.message : 'Download failed';
      showErrorNotification('Download Failed', message);
    } finally {
      setDownloading(null);
      setDownloadProgress(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showSuccessNotification('Copied!', 'Installation code copied');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to check if an item is a bot product
  const isBotProduct = (item: OrderItem) => {
    return item.product?.category_id === BOT_CATEGORY_ID;
  };

  // Get bot code for an order item
  const getBotCode = (orderItemId: string) => {
    return botCodes?.find(code => code.order_item_id === orderItemId);
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be signed in to view your downloads.</p>
          <Button asChild className="gradient-button border-0">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Flatten all downloadable items from paid orders
  const downloadableItems = orders?.flatMap(order => 
    order.order_items.map(item => ({
      ...item,
      orderId: order.id,
      orderDate: order.created_at,
    }))
  ) || [];

  return (
    <MainLayout>
      <div className="container py-8 space-y-8 max-w-4xl">
        <div className="space-y-2">
          <Link 
            to="/account" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Account
          </Link>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Download className="h-8 w-8" />
            My Downloads
          </h1>
          <p className="text-muted-foreground">
            Access and download your purchased digital products
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchased Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading your downloads...
              </div>
            ) : downloadableItems.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <FileDown className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No downloads yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your purchased products will appear here after payment
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/products">Browse Products</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {downloadableItems.map((item) => {
                  const isDownloading = downloading === item.id;
                  const hasAsset = !!item.product?.asset_file_url;
                  const isBot = isBotProduct(item);
                  const botCode = isBot ? getBotCode(item.id) : null;
                  
                  return (
                    <div 
                      key={`${item.orderId}-${item.id}`} 
                      className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.product?.images?.[0] ? (
                            <img 
                              src={item.product.images[0]} 
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : isBot ? (
                            <div className="w-full h-full flex items-center justify-center bg-blue-500/10">
                              <Bot className="h-6 w-6 text-blue-500" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{item.product_name}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Purchased
                                </Badge>
                                {isBot && (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs">
                                    <Bot className="h-3 w-3 mr-1" />
                                    Bot
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground mt-1 block">
                                {new Date(item.orderDate).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {/* Action Button - Desktop */}
                            <div className="hidden sm:block flex-shrink-0">
                              {isBot ? (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                                >
                                  <Link to="/bot-installation">
                                    <Bot className="h-4 w-4 mr-2" />
                                    View Guide
                                  </Link>
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleDownload(item)}
                                  disabled={!hasAsset || isDownloading}
                                  className="gradient-button border-0"
                                  size="sm"
                                >
                                  {isDownloading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      {downloadProgress?.progress || 0}%
                                    </>
                                  ) : !hasAsset ? (
                                    <>
                                      <Package className="h-4 w-4 mr-2" />
                                      No file
                                    </>
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Show installation code for bot products */}
                          {isBot && botCode && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs font-mono bg-background px-2 py-1 rounded border whitespace-nowrap">
                                {botCode.installation_code}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleCopyCode(botCode.installation_code)}
                              >
                                {copiedCode === botCode.installation_code ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              {botCode.is_used && (
                                <Badge variant="secondary" className="text-xs">Claimed</Badge>
                              )}
                            </div>
                          )}
                          
                          {/* Discord invite for bot products */}
                          {isBot && botCode && (
                            <div className="space-y-2 pt-1">
                              {editingDiscord === botCode.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      placeholder="https://discord.gg/your-invite"
                                      value={discordInput}
                                      onChange={(e) => setDiscordInput(e.target.value)}
                                      className="flex-1 text-sm h-8"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2"
                                      onClick={() => {
                                        setEditingDiscord(null);
                                        setDiscordInput('');
                                      }}
                                      disabled={updateDiscordMutation.isPending}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={() => updateDiscordMutation.mutate({ 
                                        codeId: botCode.id, 
                                        discordInvite: discordInput 
                                      })}
                                      disabled={updateDiscordMutation.isPending}
                                    >
                                      {updateDiscordMutation.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    ⚠️ Must be a permanent invite (never expires, unlimited uses)
                                  </p>
                                </div>
                              ) : botCode.discord_invite ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/30">
                                    {botCode.discord_guild_icon ? (
                                      <img 
                                        src={botCode.discord_guild_icon} 
                                        alt={botCode.discord_guild_name || 'Server'} 
                                        className="w-5 h-5 rounded-full"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center">
                                        <ExternalLink className="h-3 w-3 text-indigo-500" />
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium text-indigo-500">
                                        {botCode.discord_guild_name || 'Discord server linked'}
                                      </span>
                                      {botCode.discord_member_count && (
                                        <span className="text-[10px] text-indigo-400">
                                          {botCode.discord_member_count.toLocaleString()} members
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={() => {
                                      setEditingDiscord(botCode.id);
                                      setDiscordInput(botCode.discord_invite || '');
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                                  onClick={() => {
                                    setEditingDiscord(botCode.id);
                                    setDiscordInput('');
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1.5" />
                                  Add Discord Invite
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {/* Download progress */}
                          {!isBot && isDownloading && downloadProgress && downloadProgress.fileSize && (
                            <div className="w-full max-w-[200px] space-y-1">
                              <Progress value={downloadProgress.progress} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground">
                                {formatFileSize(downloadProgress.downloaded)} / {formatFileSize(downloadProgress.fileSize)}
                              </p>
                            </div>
                          )}
                          
                          {/* Action Button - Mobile */}
                          <div className="sm:hidden pt-2">
                            {isBot ? (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10 w-full"
                              >
                                <Link to="/bot-installation">
                                  <Bot className="h-4 w-4 mr-2" />
                                  View Guide
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleDownload(item)}
                                disabled={!hasAsset || isDownloading}
                                className="gradient-button border-0 w-full"
                                size="sm"
                              >
                                {isDownloading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {downloadProgress?.progress || 0}%
                                  </>
                                ) : !hasAsset ? (
                                  <>
                                    <Package className="h-4 w-4 mr-2" />
                                    No file
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}