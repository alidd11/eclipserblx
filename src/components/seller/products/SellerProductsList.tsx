import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BulkProductActions } from '@/components/seller/BulkProductActions';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Lock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { ADMIN_MANAGED_STORES } from '@/lib/constants';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAdminManagedProduct = (product: any) =>
  (ADMIN_MANAGED_STORES as readonly string[]).includes(product.store_id) && product.is_seller_product === false;

const getModerationBadge = (status: string | null) => {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Rejected
        </span>
      );
    case 'pending':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-500">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
          Pending
        </span>
      );
  }
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

interface SellerProductsListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[];
  totalCount: number;
  isLoading: boolean;
  storeId: string | undefined;
  selectedProductIds: string[];
  onSelectionChange: (ids: string[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit: (product: any) => void;
  onDelete: (productId: string) => void;
  onCreateClick: () => void;
}

export function SellerProductsList({
  products,
  totalCount,
  isLoading,
  storeId,
  selectedProductIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onCreateClick,
}: SellerProductsListProps) {
  const toggleSelection = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      onSelectionChange(selectedProductIds.filter(id => id !== productId));
    } else {
      onSelectionChange([...selectedProductIds, productId]);
    }
  };

  return (
    <>
      {/* Bulk Actions */}
      {products.length > 0 && storeId && (
        <BulkProductActions
          products={products}
          storeId={storeId}
          selectedIds={selectedProductIds}
          onSelectionChange={onSelectionChange}
        />
      )}

      {/* Mobile List */}
      <div className="block md:hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : products.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {products.map((product) => {
              const isLocked = isAdminManagedProduct(product);
              return (
                <div
                  key={product.id}
                  className={`px-3 py-3 flex items-center gap-3 ${isLocked ? 'opacity-75' : 'cursor-pointer active:bg-muted/30'}`}
                  onClick={() => !isLocked && onEdit(product)}
                >
                  {product.images?.[0] ? (
                    <img src={optimizeImageUrl(product.images[0], 44, 44, 'contain')} alt={product.name} className="h-11 w-11 rounded-lg object-contain object-center flex-shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate text-sm leading-tight">{product.name}</p>
                      {isLocked && (
                        <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 flex-shrink-0">
                          <ShieldCheck className="h-3 w-3" />Eclipse
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(product.price)}</span>
                      <span className="text-muted-foreground text-xs">·</span>
                      {getModerationBadge(product.moderation_status)}
                      {!product.is_active && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Inactive</Badge>}
                    </div>
                  </div>
                  {isLocked ? <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border border-border rounded-xl">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-sm font-medium mb-1">No products yet</h3>
            <p className="text-xs text-muted-foreground mb-3">Start by adding your first product.</p>
            <Button size="sm" onClick={onCreateClick}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-medium">Products ({totalCount})</p>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : products.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const isLocked = isAdminManagedProduct(product);
                  return (
                    <TableRow key={product.id} className={isLocked ? 'opacity-75' : 'cursor-pointer hover:bg-muted/50'} onClick={() => !isLocked && onEdit(product)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={() => toggleSelection(product.id)}
                          aria-label="Select product"
                          disabled={isLocked}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <img src={optimizeImageUrl(product.images[0], 40, 40, 'contain')} alt={product.name} className="h-10 w-10 rounded object-contain object-center" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{product.name}</p>
                              {isLocked && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <ShieldCheck className="h-3 w-3" />Eclipse
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{new Date(product.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{(product.categories as any)?.name || 'Uncategorized'}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getModerationBadge(product.moderation_status)}
                          {!product.is_active && <Badge variant="outline" className="block w-fit text-[10px]">Inactive</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{product.download_count || 0}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {isLocked ? (
                          <Button variant="ghost" size="icon" aria-label="Lock" disabled title="Managed by Eclipse admins">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(product.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-sm font-medium mb-1">No products yet</h3>
            <p className="text-xs text-muted-foreground mb-3">Start by adding your first product.</p>
            <Button size="sm" onClick={onCreateClick}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
          </div>
        )}
      </div>
    </>
  );
}
