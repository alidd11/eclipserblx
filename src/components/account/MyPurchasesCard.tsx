import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Package, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PurchasedProduct {
  id: string;
  name: string;
  images: string[] | null;
  slug: string;
  category_name: string | null;
  asset_file_url: string | null;
  order_item_id: string;
  purchased_at: string;
}

export function MyPurchasesCard() {
  const { user } = useAuth();

  const { data: purchasedProducts, isLoading } = useQuery({
    queryKey: ['purchased-products', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return [];

      // Get all order items from paid/completed orders
      let allItems: any[] = [];

      // Query by user_id
      const { data: userOrders, error: userError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          order_items (
            id,
            product_id,
            product_name,
            product:products (
              id,
              name,
              slug,
              images,
              asset_file_url,
              category:categories (name)
            )
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['paid', 'completed'])
        .order('created_at', { ascending: false });

      if (!userError && userOrders) {
        userOrders.forEach(order => {
          order.order_items?.forEach((item: any) => {
            allItems.push({
              ...item,
              order_created_at: order.created_at,
            });
          });
        });
      }

      // Also query by email for orders without user_id
      if (user?.email) {
        const { data: emailOrders, error: emailError } = await supabase
          .from('orders')
        .select(`
            id,
            created_at,
            order_items (
              id,
              product_id,
              product_name,
              product:products (
                id,
                name,
                slug,
                images,
                asset_file_url,
                category:categories (name)
              )
            )
          `)
          .eq('customer_email', user.email)
          .is('user_id', null)
          .in('status', ['paid', 'completed'])
          .order('created_at', { ascending: false });

        if (!emailError && emailOrders) {
          emailOrders.forEach(order => {
            order.order_items?.forEach((item: any) => {
              allItems.push({
                ...item,
                order_created_at: order.created_at,
              });
            });
          });
        }
      }

      // Deduplicate by product_id and transform
      const productMap = new Map<string, PurchasedProduct>();
      
      allItems.forEach(item => {
        if (!item.product_id || productMap.has(item.product_id)) return;
        
        const product = item.product;
        productMap.set(item.product_id, {
          id: item.product_id,
          name: product?.name || item.product_name,
          images: product?.images || null,
          slug: product?.slug || item.product_id,
          category_name: product?.category?.name || null,
          asset_file_url: product?.asset_file_url || null,
          order_item_id: item.id,
          purchased_at: item.order_created_at,
        });
      });

      return Array.from(productMap.values());
    },
    enabled: !!(user?.id || user?.email),
    staleTime: 1000 * 60 * 5,
  });

  const hasDownloadableProducts = useMemo(() => {
    return purchasedProducts?.some(p => p.asset_file_url) ?? false;
  }, [purchasedProducts]);

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            My Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading purchases...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          My Purchases
          {purchasedProducts && purchasedProducts.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {purchasedProducts.length}
            </Badge>
          )}
        </CardTitle>
        {hasDownloadableProducts && (
          <Button asChild size="sm" variant="outline">
            <Link to="/downloads">
              <Download className="h-4 w-4 mr-2" />
              Downloads
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!purchasedProducts || purchasedProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>You haven't purchased anything yet.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {purchasedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/20 hover:bg-muted/40 transition-all group"
              >
                {/* Product Image */}
                <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
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
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  {product.category_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {product.category_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Purchased {new Date(product.purchased_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {product.asset_file_url && (
                    <Button
                      asChild
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Download"
                    >
                      <Link to="/downloads">
                        <Download className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View Product"
                  >
                    <Link to={`/products/${product.slug}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
