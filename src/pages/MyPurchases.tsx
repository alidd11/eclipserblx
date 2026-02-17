import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, 
  Package, 
  ChevronLeft, 
  FileDown, 
  CheckCircle, 
  Loader2, 
  Bot, 
  Star, 
  Receipt, 
  ChevronRight,
  Search,
  Calendar,
  Filter,
  X,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { toast } from 'sonner';
import { AddToServerButton } from '@/components/bots/AddToServerButton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePageTracking } from '@/hooks/usePageTracking';
import { DisputeDialog } from '@/components/purchases/DisputeDialog';

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
  payment_method: string | null;
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

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  refunded: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  partially_refunded: { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
};

const formatPaymentMethod = (method: string | null): string => {
  if (!method) return 'Card';
  return method.replace('stripe_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatOrderId = (id: string): string => `#${id.slice(-6).toUpperCase()}`;

export default function MyPurchases() {
  usePageTracking({ pagePath: '/purchases' });
  const { user, session } = useAuth();
  const { formatPrice } = useCurrency();
  
  // Products tab state
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  
  // Orders tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [ordersPage, setOrdersPage] = useState(1);
  const [disputeOrder, setDisputeOrder] = useState<{ id: string; displayId: string } | null>(null);
  
  const ITEMS_PER_PAGE = 6;

  // Fetch bot installation codes
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

  // Fetch orders with full product data (with caching)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['user-purchases', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return [];
      
      let allOrders: Order[] = [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, created_at, total, payment_method,
          order_items (
            id, product_name, price, product_id,
            product:products (id, name, slug, images, asset_file_url, category_id)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) allOrders = [...allOrders, ...(data as Order[])];
      
      if (user?.email) {
        const { data: emailOrders, error: emailError } = await supabase
          .from('orders')
          .select(`
            id, status, created_at, total, payment_method,
            order_items (
              id, product_name, price, product_id,
              product:products (id, name, slug, images, asset_file_url, category_id)
            )
          `)
          .eq('customer_email', user.email)
          .is('user_id', null)
          .order('created_at', { ascending: false });
        
        if (!emailError && emailOrders) {
          allOrders = [...allOrders, ...(emailOrders as Order[])];
        }
      }
      
      return allOrders.filter((order, index, self) =>
        index === self.findIndex((o) => o.id === order.id)
      );
    },
    enabled: !!(user?.id || user?.email),
    staleTime: 30000,
  });

  // Paid orders for products tab
  const paidOrders = useMemo(() => 
    orders?.filter(o => ['paid', 'completed'].includes(o.status)) || []
  , [orders]);

  // All downloadable items from paid orders
  const downloadableItems = useMemo(() => 
    paidOrders.flatMap(order => 
      order.order_items.map(item => ({ ...item, orderId: order.id, orderDate: order.created_at }))
    )
  , [paidOrders]);

  // Filtered orders for orders tab
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query) || formatOrderId(order.id).toLowerCase().includes(query);
        const matchesProduct = order.order_items.some(item => item.product_name.toLowerCase().includes(query));
        if (!matchesId && !matchesProduct) return false;
      }
      if (statusFilter && order.status !== statusFilter) return false;
      if (dateRange.from && new Date(order.created_at) < dateRange.from) return false;
      if (dateRange.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        if (new Date(order.created_at) > endOfDay) return false;
      }
      return true;
    });
  }, [orders, searchQuery, statusFilter, dateRange]);

  // Pagination
  const productsTotalPages = Math.ceil(downloadableItems.length / ITEMS_PER_PAGE);
  const paginatedProducts = downloadableItems.slice((productsPage - 1) * ITEMS_PER_PAGE, productsPage * ITEMS_PER_PAGE);
  
  const ordersTotalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE);

  // Helpers
  const isBotProduct = (item: OrderItem) => item.product?.category_id === BOT_CATEGORY_ID;
  const getBotCode = (orderItemId: string) => botCodes?.find(code => code.order_item_id === orderItemId);
  
  const selectableItems = downloadableItems.filter(item => item.product?.asset_file_url && item.product?.category_id !== BOT_CATEGORY_ID);
  const allSelectableSelected = selectableItems.length > 0 && selectableItems.every(item => selectedItems.has(item.id));
  const hasActiveFilters = searchQuery || statusFilter || dateRange.from || dateRange.to;

  const handleDownload = async (item: OrderItem & { orderId: string }) => {
    if (!item.product_id || !session?.access_token) {
      showErrorNotification('Error', 'Unable to download');
      return;
    }
    setDownloading(item.id);
    setDownloadProgress({ itemId: item.id, progress: 0, fileSize: null, downloaded: 0 });

    try {
      const { data, error } = await supabase.functions.invoke('download-asset', {
        body: { productId: item.product_id, orderItemId: item.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) { showErrorNotification('Download Error', data.error); return; }

      if (data?.downloadUrl) {
        const response = await fetch(data.downloadUrl);
        const reader = response.body?.getReader();
        const contentLength = data.fileSize || parseInt(response.headers.get('content-length') || '0', 10);
        
        if (reader && contentLength > 0) {
          let receivedLength = 0;
          const chunks: BlobPart[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(new Blob([value]));
            receivedLength += value.length;
            setDownloadProgress({ itemId: item.id, progress: Math.round((receivedLength / contentLength) * 100), fileSize: contentLength, downloaded: receivedLength });
          }
          
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
          window.open(data.downloadUrl, '_blank');
        }
        showSuccessNotification('Downloaded!', data.productName || 'Your file is ready');
      }
    } catch (err: unknown) {
      console.error('Download error:', err);
      showErrorNotification('Download Failed', err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
      setDownloadProgress(null);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const downloadableIds = selectableItems.map(item => item.id);
    setSelectedItems(allSelectableSelected ? new Set() : new Set(downloadableIds));
  };

  const handleDownloadSelected = async () => {
    const itemsToDownload = downloadableItems.filter(
      item => selectedItems.has(item.id) && item.product?.asset_file_url && item.product?.category_id !== BOT_CATEGORY_ID
    );
    if (itemsToDownload.length === 0) { toast.error('No items selected'); return; }

    setIsBatchDownloading(true);
    let successCount = 0, failCount = 0;

    for (const item of itemsToDownload) {
      try {
        if (!item.product_id || !session?.access_token) continue;
        const { data, error } = await supabase.functions.invoke('download-asset', {
          body: { productId: item.product_id, orderItemId: item.id },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error || data?.error) { failCount++; continue; }
        if (data?.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch { failCount++; }
    }

    setIsBatchDownloading(false);
    if (successCount > 0) showSuccessNotification('Downloads Started', `${successCount} file(s) downloading`);
    if (failCount > 0) toast.error(`${failCount} file(s) failed`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setDateRange({});
    setOrdersPage(1);
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be signed in to view your purchases.</p>
          <Button asChild className="gradient-button border-0">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 sm:py-8 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="space-y-2">
          <Link to="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to Account
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold">My Purchases</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Access your products and view order history
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="gap-2">
              <Download className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Receipt className="h-4 w-4" />
              Order History
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : downloadableItems.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                    <FileDown className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">No products yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Your purchased products will appear here</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link to="/products">Browse Products</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Batch Download Header */}
                {selectableItems.length > 0 && (
                  <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <Checkbox id="select-all" checked={allSelectableSelected} onCheckedChange={toggleSelectAll} disabled={isBatchDownloading} />
                      <label htmlFor="select-all" className="text-sm cursor-pointer">
                        {allSelectableSelected ? 'Deselect all' : 'Select all'} ({selectableItems.length})
                      </label>
                    </div>
                    <Button onClick={handleDownloadSelected} disabled={selectedItems.size === 0 || isBatchDownloading} className="gradient-button border-0" size="sm">
                      {isBatchDownloading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Downloading...</> : <><Download className="h-4 w-4 mr-2" />Download ({selectedItems.size})</>}
                    </Button>
                  </div>
                )}

                {/* Product Cards */}
                <div className="space-y-3">
                  {paginatedProducts.map((item) => {
                    const isDownloading = downloading === item.id;
                    const hasAsset = !!item.product?.asset_file_url;
                    const isBot = isBotProduct(item);
                    const botCode = isBot ? getBotCode(item.id) : null;

                    return (
                      <div key={`${item.orderId}-${item.id}`} className="p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
                        <div className="flex items-start gap-4">
                          {!isBot && hasAsset && (
                            <div className="flex-shrink-0 pt-1">
                              <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleItemSelection(item.id)} disabled={isBatchDownloading} />
                            </div>
                          )}
                          
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {item.product?.images?.[0] ? (
                              <img src={item.product.images[0]} alt={item.product_name} className="w-full h-full object-cover" />
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

                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <p className="font-medium truncate">{item.product_name}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />Purchased
                                </Badge>
                                {isBot && (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs">
                                    <Bot className="h-3 w-3 mr-1" />Bot
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground mt-1 block">
                                {new Date(item.orderDate).toLocaleDateString()}
                              </span>
                            </div>

                            {!isBot && isDownloading && downloadProgress?.fileSize && (
                              <div className="w-full max-w-[200px] space-y-1">
                                <Progress value={downloadProgress.progress} className="h-1.5" />
                                <p className="text-[10px] text-muted-foreground">
                                  {formatFileSize(downloadProgress.downloaded)} / {formatFileSize(downloadProgress.fileSize)}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-1">
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
                                <Badge variant="secondary" className="text-xs">Loading...</Badge>
                              ) : (
                                <Button onClick={() => handleDownload(item)} disabled={!hasAsset || isDownloading} className="gradient-button border-0" size="sm">
                                  {isDownloading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{downloadProgress?.progress || 0}%</> : !hasAsset ? <><Package className="h-4 w-4 mr-2" />No file</> : <><Download className="h-4 w-4 mr-2" />Download</>}
                                </Button>
                              )}
                              {item.product?.slug && (
                                <Button asChild variant="outline" size="sm" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                                  <Link to={`/products/${item.product.slug}#reviews`}><Star className="h-4 w-4 mr-2" />Review</Link>
                                </Button>
                              )}
                              <Button asChild variant="outline" size="sm">
                                <Link to={`/order-success?order_id=${item.orderId}`}><Receipt className="h-4 w-4 mr-2" />Receipt</Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {productsTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setProductsPage(p => Math.max(1, p - 1))} disabled={productsPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">Page {productsPage} of {productsTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setProductsPage(p => Math.min(productsTotalPages, p + 1))} disabled={productsPage === productsTotalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {/* Search & Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by order ID or product..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setOrdersPage(1); }} className="pl-9 bg-muted/50 border-border" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("border-dashed gap-1.5", statusFilter && "border-primary text-primary")}>
                      <Filter className="h-3.5 w-3.5" />Status{statusFilter && <span className="ml-1 capitalize">: {statusFilter}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1">
                      {['paid', 'completed', 'pending', 'refunded'].map((status) => (
                        <Button key={status} variant={statusFilter === status ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start capitalize" onClick={() => { setStatusFilter(statusFilter === status ? null : status); setOrdersPage(1); }}>
                          <span className={cn("w-2 h-2 rounded-full mr-2", statusColors[status]?.dot || 'bg-muted-foreground')} />{status}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("border-dashed gap-1.5", (dateRange.from || dateRange.to) && "border-primary text-primary")}>
                      <Calendar className="h-3.5 w-3.5" />Date
                      {dateRange.from && <span className="ml-1">: {format(dateRange.from, 'MMM d')}{dateRange.to && ` - ${format(dateRange.to, 'MMM d')}`}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent initialFocus mode="range" selected={{ from: dateRange.from, to: dateRange.to }} onSelect={(range) => { setDateRange(range || {}); setOrdersPage(1); }} numberOfMonths={1} />
                  </PopoverContent>
                </Popover>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5 mr-1" />Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Orders List */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{hasActiveFilters ? 'No orders match your filters' : 'No orders yet'}</p>
                    <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters ? 'Try adjusting your search or filters' : 'Your orders will appear here after purchase'}</p>
                  </div>
                  {hasActiveFilters ? (
                    <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                  ) : (
                    <Button asChild variant="outline"><Link to="/products">Browse Products</Link></Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedOrders.map((order) => {
                    const statusStyle = statusColors[order.status] || statusColors.pending;
                    const displayStatus = order.status === 'paid' ? 'Completed' : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ');

                    return (
                      <div key={order.id} className="rounded-lg border border-border bg-card overflow-hidden hover:border-muted-foreground/30 transition-colors">
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <span className="text-primary text-sm font-medium">Order ID: </span>
                              <span className="font-semibold">{formatOrderId(order.id)}</span>
                            </div>
                            <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium", statusStyle.bg, statusStyle.text)}>
                              <span className={cn("w-2 h-2 rounded-full", statusStyle.dot)} />
                              {displayStatus}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button asChild variant="outline" className="flex-1">
                              <Link to={`/order-success?order_id=${order.id}`}>View order</Link>
                            </Button>
                            {['paid', 'completed'].includes(order.status) && (
                              <Button
                                variant="outline"
                                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                onClick={() => setDisputeOrder({ id: order.id, displayId: formatOrderId(order.id) })}
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Dispute
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="border-t border-border/50 p-4 space-y-2 bg-muted/20">
                          <div className="flex justify-between text-sm">
                            <span className="text-primary font-medium">Order Date:</span>
                            <span className="text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-primary font-medium">Total:</span>
                            <span className="text-muted-foreground">{formatPrice(order.total)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-primary font-medium">Payment:</span>
                            <span className="text-muted-foreground">{formatPaymentMethod(order.payment_method)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {ordersTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.max(1, p - 1))} disabled={ordersPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">Page {ordersPage} of {ordersTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))} disabled={ordersPage === ordersTotalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Dispute Dialog */}
        {disputeOrder && (
          <DisputeDialog
            open={!!disputeOrder}
            onOpenChange={(open) => !open && setDisputeOrder(null)}
            orderId={disputeOrder.id}
            orderDisplayId={disputeOrder.displayId}
          />
        )}
      </div>
    </MainLayout>
  );
}
