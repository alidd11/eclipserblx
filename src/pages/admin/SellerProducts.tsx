import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Eye, Package, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

export default function SellerProducts() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [moderationNotes, setModerationNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);

  const { data: products, isLoading } = useQuery({
    queryKey: ["seller-products-moderation", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          stores!products_store_id_fkey (
            name,
            store_id,
            owner_id
          ),
          categories (name)
        `)
        .eq("is_seller_product", true)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("moderation_status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ productId, status, notes }: { productId: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("products")
        .update({
          moderation_status: status,
          moderation_notes: notes,
          is_active: status === "approved",
        })
        .eq("id", productId);

      if (error) throw error;
      
      return { productId, status };
    },
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["seller-products-moderation"] });
      toast.success(`Product ${variables.status === "approved" ? "approved" : "rejected"}`);
      setSelectedProduct(null);
      setModerationNotes("");
      
      // Automatically send Discord product drop announcement when approved
      if (result.status === "approved") {
        try {
          await supabase.functions.invoke('send-product-drop-webhook', {
            body: { productId: result.productId, isEarlyAccess: false },
          });
          toast.success("Product drop announced to Discord!");
        } catch (error) {
          console.error("Failed to send Discord announcement:", error);
          // Don't show error toast - the approval was successful, just the announcement failed
        }
      }
    },
    onError: () => {
      toast.error("Failed to update product status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products-moderation"] });
      toast.success("Product deleted successfully");
      setProductToDelete(null);
      setDeleteStep(1);
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

  const handleDeleteClick = (product: any) => {
    setProductToDelete(product);
    setDeleteStep(1);
  };

  const handleDeleteConfirm = () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
    } else {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const handleDeleteCancel = () => {
    setProductToDelete(null);
    setDeleteStep(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <AdminLayout requiredPermissions={['view_seller_stores']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seller Products</h1>
            <p className="text-muted-foreground">Review and moderate seller product submissions</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Products</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-48" />
              </Card>
            ))}
          </div>
        ) : products?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products?.map((product: any) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(product.moderation_status || "pending")}
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    by {product.stores?.name || "Unknown Store"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">£{product.price?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Seller Price</span>
                    <span className="font-medium">£{product.seller_price?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <span>{product.categories?.name || "Uncategorized"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    {product.moderation_status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => moderateMutation.mutate({
                            productId: product.id,
                            status: "approved",
                            notes: "",
                          })}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedProduct(product);
                            setModerationNotes("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(product)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Product: {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedProduct?.images?.[0] ? (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Store:</span>
                  <p className="font-medium">{selectedProduct?.stores?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-medium">£{selectedProduct?.price?.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Seller Earnings:</span>
                  <p className="font-medium">£{selectedProduct?.seller_price?.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>{getStatusBadge(selectedProduct?.moderation_status || "pending")}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Description:</span>
                <p className="mt-1 text-sm">{selectedProduct?.description || "No description"}</p>
              </div>
              {selectedProduct?.moderation_status === "pending" && (
                <div>
                  <label className="text-sm text-muted-foreground">Moderation Notes (optional)</label>
                  <Textarea
                    value={moderationNotes}
                    onChange={(e) => setModerationNotes(e.target.value)}
                    placeholder="Add notes for the seller..."
                    className="mt-1"
                  />
                </div>
              )}
              {selectedProduct?.moderation_notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Previous Notes:</span>
                  <p className="text-sm mt-1">{selectedProduct.moderation_notes}</p>
                </div>
              )}
            </div>
            {selectedProduct?.moderation_status === "pending" && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => moderateMutation.mutate({
                    productId: selectedProduct.id,
                    status: "rejected",
                    notes: moderationNotes,
                  })}
                >
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => moderateMutation.mutate({
                    productId: selectedProduct.id,
                    status: "approved",
                    notes: moderationNotes,
                  })}
                >
                  Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog - Two Step */}
        <AlertDialog open={!!productToDelete} onOpenChange={handleDeleteCancel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteStep === 1 ? "Delete Product?" : "Are you absolutely sure?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteStep === 1 ? (
                  <>
                    You are about to delete <strong>"{productToDelete?.name}"</strong>. 
                    This action cannot be undone and will permanently remove the product from the marketplace.
                  </>
                ) : (
                  <>
                    This is your <strong>final confirmation</strong>. The product <strong>"{productToDelete?.name}"</strong> will be permanently deleted along with all associated data.
                    <br /><br />
                    <span className="text-destructive font-medium">This action is irreversible.</span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending 
                  ? "Deleting..." 
                  : deleteStep === 1 
                    ? "Continue" 
                    : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
