import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Package, Search, FileCheck, FileX, ChevronDown, ScanSearch,
  ShieldAlert, AlertTriangle, ExternalLink, Pencil, Eye,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ADMIN_PRODUCTS_PER_PAGE = 25;

export default function SellerProductsAll() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterStore, setFilterStore] = useState<string>("all");
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editCategory, setEditCategory] = useState<string>("");
  const [editPrice, setEditPrice] = useState<string>("");
  const [viewProduct, setViewProduct] = useState<any>(null);

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 300);
  };

  // Reset page on filter change
  const handleFilterStatus = (v: string) => { setFilterStatus(v); setCurrentPage(1); };
  const handleFilterStore = (v: string) => { setFilterStore(v); setCurrentPage(1); };

  // Fetch all seller products with pagination
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["seller-products-all", filterStatus, filterStore, currentPage, debouncedSearch],
    queryFn: async () => {
      const from = (currentPage - 1) * ADMIN_PRODUCTS_PER_PAGE;
      const to = from + ADMIN_PRODUCTS_PER_PAGE - 1;

      let query = supabase
        .from("products")
        .select(`
          *,
          stores!products_store_id_fkey (
            name,
            store_id,
            owner_id,
            slug
          ),
          categories (id, name, slug)
        `, { count: 'exact' })
        .eq("is_seller_product", true)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("moderation_status", filterStatus);
      }
      if (filterStore !== "all") {
        query = query.eq("store_id", filterStore);
      }
      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return { products: data || [], totalCount: count || 0 };
    },
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ADMIN_PRODUCTS_PER_PAGE);

  // Fetch categories for editing
  const { data: categories } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .is("parent_id", null)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch unique stores for filtering
  const { data: stores } = useQuery({
    queryKey: ["seller-stores-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ productId, updates }: { productId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products-all"] });
      toast.success("Product updated");
      setEditProduct(null);
    },
    onError: () => {
      toast.error("Failed to update product");
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditOpen = (product: any) => {
    setEditProduct(product);
    setEditCategory(product.category_id || "");
    setEditPrice(product.price?.toString() || "");
  };

  const handleEditSave = () => {
    if (!editProduct) return;
    const updates: Record<string, any> = {};
    if (editCategory && editCategory !== editProduct.category_id) {
      updates.category_id = editCategory;
    }
    if (editPrice && parseFloat(editPrice) !== editProduct.price) {
      updates.price = parseFloat(editPrice);
    }
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      setEditProduct(null);
      return;
    }
    updateMutation.mutate({ productId: editProduct.id, updates });
  };

  const filteredProducts = products;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout requiredPermissions={['view_seller_stores']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">All Seller Products</h1>
          <p className="text-muted-foreground">View and manage all seller products across the marketplace</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products, stores..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={handleFilterStatus}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStore} onValueChange={handleFilterStore}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{totalCount} products</span>
          {debouncedSearch && <span>· filtered by "{debouncedSearch}"</span>}
        </div>

        {/* Products Table-like List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredProducts?.length === 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="p-4 py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No seller products found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[3fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Product</span>
              <span>Store</span>
              <span>Category</span>
              <span>Price</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {filteredProducts?.map((product) => (
              <div key={product.id} className="overflow-hidden">
                <div className="p-4 p-0">
                  <div className="grid grid-cols-1 md:grid-cols-[3fr_1.5fr_1fr_1fr_1fr_auto] gap-3 items-center px-4 py-3">
                    {/* Product */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-md bg-muted shrink-0 overflow-hidden">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {/* File status indicator */}
                          {product.asset_file_url ? (
                            <FileCheck className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <FileX className="h-3 w-3 text-destructive shrink-0" />
                          )}
                          {product.moderation_flags && (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                              <ScanSearch className="h-2 w-2 mr-0.5" />
                              Scanned
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Store */}
                    <span className="text-sm text-muted-foreground truncate">
                      {product.stores?.name || "Unknown"}
                    </span>

                    {/* Category */}
                    <span className="text-sm text-muted-foreground truncate">
                      {product.categories?.name || "—"}
                    </span>

                    {/* Price */}
                    <span className="text-sm font-medium">
                      £{product.price?.toFixed(2)}
                    </span>

                    {/* Status */}
                    <div>{getStatusBadge(product.moderation_status || "pending")}</div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewProduct(product)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditOpen(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {product.stores?.slug && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a
                            href={`/store/${product.stores.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expandable file/scan info */}
                  {(product.moderation_flags || product.asset_file_url) && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-1.5 border-t border-border/50 text-xs text-muted-foreground hover:bg-muted/30 transition-colors">
                        <ChevronDown className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-180" />
                        <span>File & Scan Details</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-3 pt-1 space-y-1.5 text-xs">
                        {product.asset_file_url ? (
                          <p className="text-muted-foreground break-all">
                            <span className="font-medium">File:</span> {product.asset_file_url.split('/').pop()}
                          </p>
                        ) : (
                          <p className="text-destructive/80">No asset file uploaded</p>
                        )}
                        {product.moderation_flags?.nsfw_flags?.length > 0 && (
                          <div className="flex items-start gap-1 text-destructive">
                            <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>NSFW: {product.moderation_flags.nsfw_flags.join(', ')}</span>
                          </div>
                        )}
                        {product.moderation_flags?.lua_concerns?.length > 0 && (
                          <div className="flex items-start gap-1 text-amber-500">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>Lua ({product.moderation_flags.lua_risk_level}): {product.moderation_flags.lua_concerns.join(', ')}</span>
                          </div>
                        )}
                        {product.moderation_flags?.file_names_sample?.length > 0 && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">{product.moderation_flags.total_files || '?'} files:</span>
                            <ul className="list-disc list-inside mt-0.5 space-y-0.5 ml-2">
                              {product.moderation_flags.file_names_sample.slice(0, 5).map((f: string, i: number) => (
                                <li key={i} className="break-all">{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {product.moderation_flags && !product.moderation_flags.nsfw_flags?.length && !product.moderation_flags.lua_concerns?.length && (
                          <p className="text-green-500">✓ Clean — no issues detected</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ADMIN_PRODUCTS_PER_PAGE) + 1}–{Math.min(currentPage * ADMIN_PRODUCTS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm font-medium px-2">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* View Product Dialog */}
        <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewProduct?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewProduct?.images?.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {viewProduct.images.map((img: string, i: number) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted border">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Store:</span><p className="font-medium">{viewProduct?.stores?.name}</p></div>
                <div><span className="text-muted-foreground">Price:</span><p className="font-medium">£{viewProduct?.price?.toFixed(2)}</p></div>
                <div><span className="text-muted-foreground">Seller Price:</span><p className="font-medium">£{viewProduct?.seller_price?.toFixed(2)}</p></div>
                <div><span className="text-muted-foreground">Category:</span><p className="font-medium">{viewProduct?.categories?.name || "Uncategorized"}</p></div>
                <div><span className="text-muted-foreground">Status:</span><div>{getStatusBadge(viewProduct?.moderation_status || "pending")}</div></div>
                <div><span className="text-muted-foreground">Created:</span><p className="font-medium">{viewProduct?.created_at ? new Date(viewProduct.created_at).toLocaleDateString() : "—"}</p></div>
              </div>
              {viewProduct?.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <div className="mt-1 text-sm prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewProduct.description) }} />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit: {editProduct?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Current status: {getStatusBadge(editProduct?.moderation_status || "pending")}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditProduct(null)}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
