import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Package, ChevronLeft, FileDown, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

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
  } | null;
}

interface Order {
  id: string;
  status: string;
  created_at: string;
  total: number;
  order_items: OrderItem[];
}

export default function Downloads() {
  const { user, session } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['user-downloads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
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
              asset_file_url
            )
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['paid', 'completed'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user?.id,
  });

  // Check download eligibility and get next download time
  const { data: downloadStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['download-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return { canDownload: false, nextDownloadAt: null };
      
      const [canDownloadRes, nextTimeRes] = await Promise.all([
        supabase.rpc('can_user_download', { _user_id: user.id }),
        supabase.rpc('get_next_download_time', { _user_id: user.id })
      ]);
      
      return {
        canDownload: canDownloadRes.data ?? true,
        nextDownloadAt: nextTimeRes.data as string | null
      };
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  // Get download history
  const { data: downloadHistory } = useQuery({
    queryKey: ['download-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('download_logs')
        .select('id, product_id, downloaded_at')
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleDownload = async (item: OrderItem) => {
    if (!item.product_id || !session?.access_token) {
      toast.error('Unable to download');
      return;
    }

    if (!downloadStatus?.canDownload) {
      toast.error('You can only download 1 product every 48 hours');
      return;
    }

    setDownloading(item.id);

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
        if (data.nextDownloadAt) {
          toast.error(data.message || 'Download limit reached');
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast.success(`Downloading ${data.productName || 'file'}!`);
        refetchStatus();
      }
    } catch (err: unknown) {
      console.error('Download error:', err);
      const message = err instanceof Error ? err.message : 'Download failed';
      toast.error(message);
    } finally {
      setDownloading(null);
    }
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

  const getTimeRemaining = () => {
    if (!downloadStatus?.nextDownloadAt) return null;
    const nextTime = new Date(downloadStatus.nextDownloadAt);
    if (nextTime <= new Date()) return null;
    return formatDistanceToNow(nextTime, { addSuffix: true });
  };

  const timeRemaining = getTimeRemaining();

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
            Access all your purchased digital products
          </p>
        </div>

        {/* Download Status Alert */}
        {!downloadStatus?.canDownload && timeRemaining && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Download limit reached. Next download available <strong>{timeRemaining}</strong>
              </span>
            </AlertDescription>
          </Alert>
        )}

        {downloadStatus?.canDownload && downloadableItems.length > 0 && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              You can download 1 product now. Downloads are limited to 1 every 48 hours.
            </AlertDescription>
          </Alert>
        )}

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
                  const wasDownloaded = downloadHistory?.some(d => d.product_id === item.product_id);
                  const isDownloading = downloading === item.id;
                  
                  return (
                    <div 
                      key={`${item.orderId}-${item.id}`} 
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.product?.images?.[0] ? (
                          <img 
                            src={item.product.images[0]} 
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Purchased
                          </Badge>
                          {wasDownloaded && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                              <Download className="h-3 w-3 mr-1" />
                              Downloaded
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.orderDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Download Button */}
                      <Button
                        onClick={() => handleDownload(item)}
                        disabled={!item.product?.asset_file_url || !downloadStatus?.canDownload || isDownloading}
                        className="gradient-button border-0"
                        size="sm"
                      >
                        {isDownloading ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Preparing...
                          </>
                        ) : !downloadStatus?.canDownload ? (
                          <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Wait 48h
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Info */}
        <Card className="bg-muted/30 border-border">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Download Limit</p>
                <p className="text-sm text-muted-foreground mt-1">
                  To ensure fair usage, you can download <strong>1 product every 48 hours</strong>. 
                  Plan your downloads accordingly. If you have urgent needs, please contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Downloads */}
        {downloadHistory && downloadHistory.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {downloadHistory.slice(0, 5).map((log) => {
                  const product = downloadableItems.find(i => i.product_id === log.product_id);
                  return (
                    <div key={log.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-muted-foreground">
                        {product?.product_name || 'Unknown Product'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.downloaded_at), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
