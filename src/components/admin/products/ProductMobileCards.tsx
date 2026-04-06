import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Pencil, Clock } from 'lucide-react';


interface AdminProduct {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  images: unknown;
  created_at: string;
  release_at?: string | null;
  categories?: { name: string } | null;
  stores?: { name: string } | null;
  [key: string]: unknown;
}

interface ProductMobileCardsProps {
 products: any[] | undefined;
 isLoading: boolean;
 selectedProducts: Set<string>;
 onToggleSelection: (id: string) => void;
 onToggleSelectAll: () => void;
 onEdit: (product: any) => void;
 isScheduledForFuture: (releaseAt: string | null) => boolean;
}

export function ProductMobileCards({
 products,
 isLoading,
 selectedProducts,
 onToggleSelection,
 onToggleSelectAll,
 onEdit,
 isScheduledForFuture,
}: ProductMobileCardsProps) {
 return (
 <div className="block md:hidden space-y-3">
 {products && products.length > 0 && (
 <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
 <Checkbox
 checked={selectedProducts.size === products.length && products.length > 0}
 onCheckedChange={onToggleSelectAll}
 id="select-all-mobile"
 />
 <Label htmlFor="select-all-mobile" className="text-sm text-muted-foreground cursor-pointer">
 Select all products
 </Label>
 </div>
 )}

 {isLoading ? (
 <div className="space-y-3">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
 <Skeleton className="h-14 w-14 rounded-lg" />
 <Skeleton className="h-4 w-40" />
 <Skeleton className="h-3 w-24" />
 </div>
 ))}
 </div>
 ) : products?.length === 0 ? (
 <p className="text-center py-8 text-muted-foreground">No products found</p>
 ) : (
 products?.map((product) => (
 <div
 key={product.id}
 className={`bg-muted/30 border-border overflow-hidden transition-colors ${selectedProducts.has(product.id) ? 'ring-2 ring-primary' : ''}`}
 >
 <div className="p-4 p-4">
 <div className="flex items-start gap-3">
 <Checkbox
 checked={selectedProducts.has(product.id)}
 onCheckedChange={() => onToggleSelection(product.id)}
 className="mt-1 flex-shrink-0"
 />
 <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
 {product.images?.[0] ? (
 <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-medium">
 {product.name.charAt(0)}
 </div>
 )}
 </div>
 <div className="flex-1 min-w-0 space-y-2">
 <div>
 <p className="font-medium text-base leading-tight">{product.name}</p>
 <p className="text-sm text-muted-foreground">{product.categories?.name || 'Uncategorized'}</p>
 </div>
 <div className="flex items-center gap-1.5 flex-wrap">
 {isScheduledForFuture(product.release_at) ? (
 <Badge variant="warning" className="border-0 text-xs px-2 py-0.5" title={`Releases: ${new Date(product.release_at).toLocaleString()}`}>
 <Clock className="h-3 w-3 mr-1" />
 Scheduled
 </Badge>
 ) : product.is_active ? (
 <Badge variant="success" className="border-0 text-xs px-2 py-0.5">Active</Badge>
 ) : (
 <Badge variant="outline" className="text-muted-foreground text-xs px-2 py-0.5">Inactive</Badge>
 )}
 </div>
 </div>
 <Button variant="ghost" size="icon" onClick={() => onEdit(product)} className="h-10 w-10 touch-manipulation active:scale-95 flex-shrink-0">
 <Pencil className="h-4 w-4 text-muted-foreground" />
 </Button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 );
}
