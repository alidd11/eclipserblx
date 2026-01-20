import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function SellerProducts() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  // Fetch seller's products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('store_id', store?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setDeleteProductId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete product: ' + error.message);
    },
  });

  const filteredProducts = products?.filter((product: any) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getModerationBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Products</h1>
            <p className="text-muted-foreground">
              Manage your store's product catalog
            </p>
          </div>
          <div className="flex gap-2">
            {store?.slug && (
              <Button variant="outline" asChild>
                <Link to={`/store/${store.slug}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Store
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link to="/seller/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Link>
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
            <CardDescription>
              All products in your store. Products need to be approved before they appear publicly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(product.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(product.categories as any)?.name || 'Uncategorized'}
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getModerationBadge(product.moderation_status)}
                            {!product.is_active && (
                              <Badge variant="outline" className="block w-fit">Inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.download_count || 0}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/products/${product.slug}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/seller/products/${product.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteProductId(product.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your first product to the store.
                </p>
                <Button asChild>
                  <Link to="/seller/products/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Product
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moderation Info */}
        <Card className="mt-6 border-blue-500/50 bg-blue-500/5">
          <CardContent className="flex items-start gap-4 py-4">
            <AlertCircle className="h-6 w-6 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Product Moderation</p>
              <p className="text-sm text-muted-foreground">
                All new products are reviewed by our team before being listed publicly. 
                This usually takes 24-48 hours. You'll receive a notification once your 
                product is approved or if any changes are needed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteProductId && deleteProduct.mutate(deleteProductId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SellerLayout>
  );
}
