import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Package, ChevronLeft, FileDown, CheckCircle, Loader2, Bot, Star, Receipt, ChevronRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useState } from 'react';
import { toast } from 'sonner';
import { AddToServerButton } from '@/components/bots/AddToServerButton';
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
    slug: string;
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
  order_item_id: string;
  discord_guild_name: string | null;
  discord_guild_icon: string | null;
  activated_at: string | null;
  product_name: string;
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
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Fetch bot installation codes for the user (simplified query)
  const { data: botCodes } = useQuery({
    queryKey: ['user-bot-codes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('bot_installation_codes')
        .select('id, order_item_id, discord_guild_name, discord_guild_icon, activated_at, product_name')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as BotInstallationCode[];
    },
    enabled: !!user?.id,
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
              slug,
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
              slug,
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
          a.download = data.fileName || data.productName || 'download';
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

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Select/deselect all downloadable items (non-bot items with assets)
  const toggleSelectAll = () => {
    const downloadableIds = downloadableItems
      .filter(item => item.product?.asset_file_url && item.product?.category_id !== BOT_CATEGORY_ID)
      .map(item => item.id);
    
    const allSelected = downloadableIds.every(id => selectedItems.has(id));
    
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(downloadableIds));
    }
  };

  // Download all selected items
  const handleDownloadSelected = async () => {
    const itemsToDownload = downloadableItems.filter(
      item => selectedItems.has(item.id) && 
      item.product?.asset_file_url && 
      item.product?.category_id !== BOT_CATEGORY_ID
    );

    if (itemsToDownload.length === 0) {
      toast.error('No items selected for download');
      return;
    }

    setIsBatchDownloading(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToDownload) {
      try {
        if (!item.product_id || !session?.access_token) continue;

        const { data, error } = await supabase.functions.invoke('download-asset', {
          body: { 
            productId: item.product_id,
            orderItemId: item.id
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error || data?.error) {
          failCount++;
          continue;
        }

        if (data?.downloadUrl) {
          // Open in new tab for batch downloads
          window.open(data.downloadUrl, '_blank');
          successCount++;
          // Small delay between downloads to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error('Batch download error:', err);
        failCount++;
      }
    }

    setIsBatchDownloading(false);
    
    if (successCount > 0) {
      showSuccessNotification('Downloads Started', `${successCount} file(s) downloading`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} file(s) failed to download`);
    }
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

  // Pagination
  const totalPages = Math.ceil(downloadableItems.length / ITEMS_PER_PAGE);
  const paginatedItems = downloadableItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Count selectable items (non-bot with assets)
  const selectableItems = downloadableItems.filter(
    item => item.product?.asset_file_url && item.product?.category_id !== BOT_CATEGORY_ID
  );
  const allSelectableSelected = selectableItems.length > 0 && 
    selectableItems.every(item => selectedItems.has(item.id));

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
                {/* Download All Header */}
                {selectableItems.length > 0 && (
                  <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="select-all"
                        checked={allSelectableSelected}
                        onCheckedChange={toggleSelectAll}
                        disabled={isBatchDownloading}
                      />
                      <label htmlFor="select-all" className="text-sm cursor-pointer">
                        {allSelectableSelected ? 'Deselect all' : 'Select all'} ({selectableItems.length})
                      </label>
                    </div>
                    <Button
                      onClick={handleDownloadSelected}
                      disabled={selectedItems.size === 0 || isBatchDownloading}
                      className="gradient-button border-0"
                      size="sm"
                    >
                      {isBatchDownloading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download Selected ({selectedItems.size})
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {paginatedItems.map((item) => {
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
                        {/* Selection Checkbox - only for downloadable non-bot items */}
                        {!isBot && hasAsset && (
                          <div className="flex-shrink-0 pt-1">
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => toggleItemSelection(item.id)}
                              disabled={isBatchDownloading}
                            />
                          </div>
                        )}
                        
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
                              {isBot && botCode ? (
                                <AddToServerButton
                                  installationCodeId={botCode.id}
                                  productName={botCode.product_name || item.product_name}
                                  isActivated={!!botCode.activated_at}
                                  guildName={botCode.discord_guild_name}
                                  guildIcon={botCode.discord_guild_icon}
                                  userId={user?.id || ''}
                                />
                              ) : isBot ? (
                                <Badge variant="secondary" className="text-xs">
                                  Loading...
                                </Badge>
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
                              {/* Leave Review Button - Desktop */}
                              {item.product?.slug && (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                                >
                                  <Link to={`/products/${item.product.slug}#reviews`}>
                                    <Star className="h-4 w-4 mr-2" />
                                    Leave Review
                                  </Link>
                                </Button>
                              )}
                              {/* Receipt Button - Desktop */}
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                              >
                                <Link to={`/order-success?order_id=${item.orderId}`}>
                                  <Receipt className="h-4 w-4 mr-2" />
                                  Receipt
                                </Link>
                              </Button>
                            </div>
                          </div>
                          
                          {/* Download progress */}
                          {!isBot && isDownloading && downloadProgress && downloadProgress.fileSize && (
                            <div className="w-full max-w-[200px] space-y-1">
                              <Progress value={downloadProgress.progress} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground">
                                {formatFileSize(downloadProgress.downloaded)} / {formatFileSize(downloadProgress.fileSize)}
                              </p>
                            </div>
                          )}
                          
                          {/* Action Buttons - Mobile */}
                          <div className="sm:hidden pt-2 space-y-2">
                            {isBot && botCode ? (
                              <AddToServerButton
                                installationCodeId={botCode.id}
                                productName={botCode.product_name || item.product_name}
                                isActivated={!!botCode.activated_at}
                                guildName={botCode.discord_guild_name}
                                guildIcon={botCode.discord_guild_icon}
                                userId={user?.id || ''}
                                className="w-full"
                              />
                            ) : isBot ? (
                              <Badge variant="secondary" className="text-xs">
                                Loading...
                              </Badge>
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
                            {/* Leave Review Button - Mobile */}
                            {item.product?.slug && (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 w-full"
                              >
                                <Link to={`/products/${item.product.slug}#reviews`}>
                                  <Star className="h-4 w-4 mr-2" />
                                  Leave Review
                                </Link>
                              </Button>
                            )}
                            {/* Receipt Button - Mobile */}
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Link to={`/order-success?order_id=${item.orderId}`}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Receipt
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}