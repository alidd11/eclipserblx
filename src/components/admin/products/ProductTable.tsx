import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Clock } from 'lucide-react';
import {
import { formatGBP } from '@/lib/formatters';
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';


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

interface ProductTableProps {
  products: any[] | undefined;
  isLoading: boolean;
  selectedProducts: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
  isScheduledForFuture: (releaseAt: string | null) => boolean;
}

export function ProductTable({
  products,
  isLoading,
  selectedProducts,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onDelete,
  isScheduledForFuture,
}: ProductTableProps) {
  return (
    <div className="hidden md:block rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox
                checked={products && products.length > 0 && selectedProducts.size === products.length}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </>
          ) : products?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found</TableCell>
            </TableRow>
          ) : (
            products?.map((product) => (
              <TableRow
                key={product.id}
                className={selectedProducts.has(product.id) ? 'bg-primary/5' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => onToggleSelection(product.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {product.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">#{(product as any).product_number}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{product.categories?.name || '—'}</TableCell>
                <TableCell>£{product.price.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    {isScheduledForFuture(product.release_at) ? (
                      <Badge variant="outline" className="text-warning border-warning/30" title={`Releases: ${new Date(product.release_at).toLocaleString()}`}>
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(product.release_at).toLocaleDateString()}
                      </Badge>
                    ) : product.is_active ? (
                      <Badge variant="outline" className="text-success border-success/30">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => onEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(product.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
