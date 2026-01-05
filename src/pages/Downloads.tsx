import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Package, ChevronLeft, FileDown, CheckCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { user } = useAuth();

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

  const handleDownload = (item: OrderItem) => {
    const assetUrl = item.product?.asset_file_url;
    
    if (!assetUrl) {
      toast.error('Download not available for this product');
      return;
    }

    // Open the download URL in a new tab
    window.open(assetUrl, '_blank');
    toast.success('Download started!');
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
            Access all your purchased digital products
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
                {downloadableItems.map((item) => (
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
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Purchased
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.orderDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Download Button */}
                    <Button
                      onClick={() => handleDownload(item)}
                      disabled={!item.product?.asset_file_url}
                      className="gradient-button border-0"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Info */}
        <Card className="bg-muted/30 border-border">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileDown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Download Information</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your downloads are available immediately after purchase. You can download each product as many times as you need. 
                  If you have any issues, please contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
