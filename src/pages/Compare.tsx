import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/hooks/useCart';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Scale, ShoppingCart, Check, X, Star, ArrowLeft } from 'lucide-react';

export default function Compare() {
 usePageMeta({ title: 'Compare Products', description: 'Compare products side by side', canonicalPath: '/compare' });
 const [searchParams] = useSearchParams();
 const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
 const { formatPrice } = useCurrency();
 const { addItem, isInCart } = useCart();

 const { data: products, isLoading } = useQuery({
 queryKey: ['compare-products', ids.join(',')],
 queryFn: async () => {
 if (ids.length === 0) return [];
 const { data } = await supabase
  .from('products')
  .select(`
  id, name, slug, product_number, price, images, description,
  is_active, category_id, is_resellable,
  categories!inner(name)
  `)
  .in('id', ids);
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 return (data as any[]) || [];
 },
 enabled: ids.length >= 2,
 });

 if (ids.length < 2) {
 return (
 <MainLayout>
 <div className="container py-16 text-center max-w-lg mx-auto">
 <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
 <h1 className="text-2xl font-display font-bold mb-2">Compare Products</h1>
 <p className="text-muted-foreground mb-6">Select at least 2 products to compare them side by side.</p>
 <Button asChild variant="outline">
 <Link to="/products">
 <ArrowLeft className="mr-2 h-4 w-4" /> Browse Products
 </Link>
 </Button>
 </div>
 </MainLayout>
 );
 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compareFields: { label: string; render: (p: Record<string, any>) => React.ReactNode }[] = [
  { label: 'Price', render: (p) => <span className="font-bold text-primary">{formatPrice(p.price)}</span> },
  { label: 'Category', render: (p) => <Badge variant="secondary">{p.categories?.name || 'N/A'}</Badge> },
  { label: 'Resellable', render: (p) => p.is_resellable ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground" /> },
  ];

 return (
 <MainLayout>
 <div className="container py-8 space-y-6">
 <div className="flex items-center gap-3">
 <Button asChild variant="ghost" size="icon" aria-label="Go back">
 <Link to="/products"><ArrowLeft className="h-4 w-4" /></Link>
 </Button>
 <h1 className="text-2xl font-display font-bold flex items-center gap-2">
 <Scale className="h-6 w-6" />
 Compare Products
 </h1>
 </div>

 {isLoading ? (
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 {ids.map(id => <Skeleton key={id} className="h-80 rounded-lg" />)}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full border-collapse min-w-[600px]">
 <thead>
 <tr>
 <th className="p-3 text-left text-sm font-medium text-muted-foreground w-32"></th>
 {products?.map((product) => (
 <th key={product.id} className="p-3 text-center">
 <div className="space-y-2">
 <Link to={`/products/${product.product_number}`}>
 <div className="w-24 h-24 mx-auto rounded-lg bg-muted overflow-hidden mb-2">
 {product.images?.[0] ? (
 <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain" />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-bold text-xl">
 {product.name?.charAt(0)}
 </div>
 )}
 </div>
 <p className="text-sm font-semibold hover:text-primary transition-colors">{product.name}</p>
 </Link>
 <Button
 size="sm"
 variant={isInCart(product.id) ? "secondary" : "default"}
 className={!isInCart(product.id) ? "gradient-button border-0" : ""}
 disabled={isInCart(product.id)}
 onClick={() => addItem({
 id: product.id,
 name: product.name,
 price: product.price,
 image: product.images?.[0],
 slug: String(product.product_number),
 category_id: product.category_id,
 is_resellable: product.is_resellable,
 })}
 >
 <ShoppingCart className="mr-1 h-3 w-3" />
 {isInCart(product.id) ? 'In Cart' : 'Add to Cart'}
 </Button>
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {compareFields.map(field => (
 <tr key={field.label} className="border-t border-border">
 <td className="p-3 text-sm font-medium text-muted-foreground">{field.label}</td>
 {products?.map((product) => (
 <td key={product.id} className="p-3 text-center text-sm">
 {field.render(product)}
 </td>
 ))}
 </tr>
 ))}
 <tr className="border-t border-border">
 <td className="p-3 text-sm font-medium text-muted-foreground">Description</td>
 {products?.map((product) => (
 <td key={product.id} className="p-3 text-xs text-muted-foreground max-w-[200px]">
 <p className="line-clamp-4">{product.description || 'No description'}</p>
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>
 )}
 </div>
 </MainLayout>
 );
}
