import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useQuery } from '@tanstack/react-query';
import { Download, ChevronLeft, ShoppingBag, Receipt } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { toast } from 'sonner';
import { usePageTracking } from '@/hooks/usePageTracking';
import { DisputeDialog } from '@/components/purchases/DisputeDialog';
import { DisputeStatusDialog } from '@/components/purchases/DisputeStatusDialog';
import { ProductsTab } from '@/components/purchases/ProductsTab';
import { OrdersTab } from '@/components/purchases/OrdersTab';

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
    additional_asset_files: string[] | null;
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

interface DownloadProgress {
  itemId: string;
  progress: number;
  fileSize: number | null;
  downloaded: number;
}

const BOT_CATEGORY_ID = '852838dc-adb6-4154-93fe-d1814fe46263';
const ITEMS_PER_PAGE = 6;
const formatOrderId = (id: string): string => `#${id.slice(-6).toUpperCase()}`;

export default function MyPurchases() {
  usePageMeta({ title: 'My Purchases', description: 'View and download your purchased products on Eclipse.', canonicalPath: '/purchases' });
  usePageTracking({ pagePath: '/purchases' });
  const { user, session } = useAuth();
  const { formatPrice } = useCurrency();

  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [ordersPage, setOrdersPage] = useState(1);
  const [disputeOrder, setDisputeOrder] = useState<{ id: string; displayId: string } | null>(null);
  const [viewingDisputeId, setViewingDisputeId] = useState<string | null>(null);

  const { data: userDisputes } = useQuery({
    queryKey: ['user-disputes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('refund_requests').select('id, order_id, status, amount, dispute_number').eq('customer_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const disputesByOrder = useMemo(() => {
    const map: Record<string, { id: string; status: string; amount: number; dispute_number: string }> = {};
    (userDisputes || []).forEach((d) => {
      const orderKey = d.order_id ?? '';
      if (!map[orderKey] || ['pending', 'escalated', 'denied'].includes(d.status)) {
        map[orderKey] = { id: d.id, status: d.status, amount: d.amount, dispute_number: d.dispute_number ?? '' };
      }
    });
    return map;
  }, [userDisputes]);

  const { data: botCodes } = useQuery({
    queryKey: ['user-bot-codes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('bot_installation_codes').select('id, order_item_id, discord_guild_name, discord_guild_icon, activated_at, product_name').eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['user-purchases', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return [];
      let allOrders: Order[] = [];
      const { data, error } = await supabase.from('orders').select(`id, status, created_at, total, payment_method, order_items (id, product_name, price, product_id, product:products (id, name, slug, images, asset_file_url, additional_asset_files, category_id))`).eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
      if (!error && data) allOrders = [...allOrders, ...(data as Order[])];
      if (user?.email) {
        const { data: emailOrders, error: emailError } = await supabase.from('orders').select(`id, status, created_at, total, payment_method, order_items (id, product_name, price, product_id, product:products (id, name, slug, images, asset_file_url, additional_asset_files, category_id))`).eq('customer_email', user.email).is('user_id', null).order('created_at', { ascending: false }).limit(200);
        if (!emailError && emailOrders) allOrders = [...allOrders, ...(emailOrders as Order[])];
      }
      return allOrders.filter((order, index, self) => index === self.findIndex((o) => o.id === order.id));
    },
    enabled: !!(user?.id || user?.email),
    staleTime: 2 * 60_000,
  });

  const paidOrders = useMemo(() => orders?.filter(o => ['paid', 'completed'].includes(o.status)) || [], [orders]);
  const downloadableItems = useMemo(() => paidOrders.flatMap(order => order.order_items.map(item => ({ ...item, orderId: order.id, orderDate: order.created_at }))), [paidOrders]);

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
      if (dateRange.to) { const end = new Date(dateRange.to); end.setHours(23, 59, 59, 999); if (new Date(order.created_at) > end) return false; }
      return true;
    });
  }, [orders, searchQuery, statusFilter, dateRange]);

  const productsTotalPages = Math.ceil(downloadableItems.length / ITEMS_PER_PAGE);
  const paginatedProducts = downloadableItems.slice((productsPage - 1) * ITEMS_PER_PAGE, productsPage * ITEMS_PER_PAGE);
  const ordersTotalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE);

  const isBotProduct = (item: OrderItem) => item.product?.category_id === BOT_CATEGORY_ID;
  const getBotCode = (orderItemId: string) => botCodes?.find(code => code.order_item_id === orderItemId);
  const selectableItems = downloadableItems.filter(item => item.product?.asset_file_url && item.product?.category_id !== BOT_CATEGORY_ID);
  const allSelectableSelected = selectableItems.length > 0 && selectableItems.every(item => selectedItems.has(item.id));
  const hasActiveFilters = !!(searchQuery || statusFilter || dateRange.from || dateRange.to);

  const handleDownload = async (item: OrderItem & { orderId: string }, fileIndex: number = 0) => {
    if (!item.product_id || !session?.access_token) { showErrorNotification('Error', 'Unable to download'); return; }
    setDownloading(item.id);
    setDownloadProgress({ itemId: item.id, progress: 0, fileSize: null, downloaded: 0 });
    try {
      const { data, error } = await supabase.functions.invoke('download-asset', { body: { productId: item.product_id, orderItemId: item.id, fileIndex }, headers: { Authorization: `Bearer ${session.access_token}` } });
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
          a.href = url; a.download = data.fileName || data.productName || 'download';
          document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
        } else { window.open(data.downloadUrl, '_blank'); }
        showSuccessNotification('Downloaded!', data.productName || 'Your file is ready');
      }
    } catch (err: unknown) {
      console.error('Download error:', err);
      showErrorNotification('Download Failed', err instanceof Error ? err.message : 'Download failed');
    } finally { setDownloading(null); setDownloadProgress(null); }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => { const next = new Set(prev); next.has(itemId) ? next.delete(itemId) : next.add(itemId); return next; });
  };
  const toggleSelectAll = () => {
    const ids = selectableItems.map(item => item.id);
    setSelectedItems(allSelectableSelected ? new Set() : new Set(ids));
  };

  const handleDownloadSelected = async () => {
    const itemsToDownload = downloadableItems.filter(item => selectedItems.has(item.id) && item.product?.asset_file_url && item.product?.category_id !== BOT_CATEGORY_ID);
    if (itemsToDownload.length === 0) { toast.error('No items selected'); return; }
    setIsBatchDownloading(true);
    let successCount = 0, failCount = 0;
    for (const item of itemsToDownload) {
      try {
        if (!item.product_id || !session?.access_token) continue;
        const { data, error } = await supabase.functions.invoke('download-asset', { body: { productId: item.product_id, orderItemId: item.id }, headers: { Authorization: `Bearer ${session.access_token}` } });
        if (error || data?.error) { failCount++; continue; }
        if (data?.downloadUrl) {
          try {
            const response = await fetch(data.downloadUrl); const blob = await response.blob();
            const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = data.fileName || data.productName || 'download';
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
            successCount++;
          } catch { window.open(data.downloadUrl, '_blank'); successCount++; }
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch { failCount++; }
    }
    setIsBatchDownloading(false);
    if (successCount > 0) showSuccessNotification('Downloads Started', `${successCount} file(s) downloaded`);
    if (failCount > 0) toast.error(`${failCount} file(s) failed`);
  };

  const clearFilters = () => { setSearchQuery(''); setStatusFilter(null); setDateRange({}); setOrdersPage(1); };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be signed in to view your purchases.</p>
          <Button asChild className="gradient-button border-0"><Link to="/auth">Sign In</Link></Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 sm:py-8 space-y-6 max-w-4xl">
        <div className="space-y-2">
          <Link to="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />Back to Account
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold">My Purchases</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Access your products and view order history</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="gap-2"><Download className="h-4 w-4" />Products</TabsTrigger>
            <TabsTrigger value="orders" className="gap-2"><Receipt className="h-4 w-4" />Order History</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <ProductsTab
              isLoading={isLoading}
              downloadableItems={downloadableItems}
              paginatedProducts={paginatedProducts}
              selectableItems={selectableItems}
              allSelectableSelected={allSelectableSelected}
              selectedItems={selectedItems}
              downloading={downloading}
              downloadProgress={downloadProgress}
              isBatchDownloading={isBatchDownloading}
              productsPage={productsPage}
              productsTotalPages={productsTotalPages}
              userId={user?.id}
              isBotProduct={isBotProduct}
              getBotCode={getBotCode}
              toggleItemSelection={toggleItemSelection}
              toggleSelectAll={toggleSelectAll}
              handleDownload={handleDownload}
              handleDownloadSelected={handleDownloadSelected}
              setProductsPage={setProductsPage}
            />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrdersTab
              isLoading={isLoading}
              filteredOrders={filteredOrders}
              paginatedOrders={paginatedOrders}
              searchQuery={searchQuery}
              setSearchQuery={(q) => { setSearchQuery(q); setOrdersPage(1); }}
              statusFilter={statusFilter}
              setStatusFilter={(s) => { setStatusFilter(s); setOrdersPage(1); }}
              dateRange={dateRange}
              setDateRange={(r) => { setDateRange(r); setOrdersPage(1); }}
              ordersPage={ordersPage}
              ordersTotalPages={ordersTotalPages}
              setOrdersPage={setOrdersPage}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
              disputesByOrder={disputesByOrder}
              setDisputeOrder={setDisputeOrder}
              setViewingDisputeId={setViewingDisputeId}
              formatPrice={formatPrice}
            />
          </TabsContent>
        </Tabs>

        {disputeOrder && (
          <DisputeDialog open={!!disputeOrder} onOpenChange={(open) => !open && setDisputeOrder(null)} orderId={disputeOrder.id} orderDisplayId={disputeOrder.displayId} />
        )}
        {viewingDisputeId && (
          <DisputeStatusDialog open={!!viewingDisputeId} onOpenChange={(open) => !open && setViewingDisputeId(null)} disputeId={viewingDisputeId} />
        )}
      </div>
    </MainLayout>
  );
}
