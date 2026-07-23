import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductReviewCard } from "@/components/admin/seller-review/ProductReviewCard";
import { ProductReviewDialog } from "@/components/admin/seller-review/ProductReviewDialog";

const REVIEW_PER_PAGE = 25;

export default function SellerProducts() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [moderationNotes, setModerationNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("flagged");
  const [currentPage, setCurrentPage] = useState(1);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);

  const handleFilterChange = (v: string) => { setFilterStatus(v); setCurrentPage(1); };

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["seller-products-moderation", filterStatus, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * REVIEW_PER_PAGE;
      const to = from + REVIEW_PER_PAGE - 1;

      let query = supabase
        .from("products")
        .select(`*, stores!products_store_id_fkey (name, store_id, owner_id), categories (name)`, { count: 'exact' })
        .eq("is_seller_product", true)
        .order("created_at", { ascending: false });

      if (filterStatus === "flagged") {
        query = query.eq("moderation_status", "pending").not("moderation_flags", "is", null);
      } else if (filterStatus !== "all") {
        query = query.eq("moderation_status", filterStatus);
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return { products: data || [], totalCount: count || 0 };
    },
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / REVIEW_PER_PAGE);

  const moderateMutation = useMutation({
    mutationFn: async ({ productId, status, notes }: { productId: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("products")
        .update({ moderation_status: status, moderation_notes: notes, is_active: status === "approved" })
        .eq("id", productId);
      if (error) throw error;
      return { productId, status };
    },
    onSuccess: async (result, variables) => {
      // Approving/rejecting changes what's pending — refresh this list AND the
      // moderation queue + dashboard "Products awaiting review" count, which read
      // their own query keys and would otherwise keep showing the product as pending.
      queryClient.invalidateQueries({ queryKey: ["seller-products-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["mod-queue-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview-snapshot"] });
      toast.success(`Product ${variables.status === "approved" ? "approved" : "rejected"}`);
      setSelectedProduct(null);
      setModerationNotes("");
      if (result.status === "approved") {
        try {
          await supabase.functions.invoke('send-product-drop-webhook', {
            body: { productId: result.productId, isEarlyAccess: false },
          });
          toast.success("Product drop announced to Discord!");
        } catch (error) {
          console.error("Failed to send Discord announcement:", error);
        }
      }
    },
    onError: () => toast.error("Failed to update product status"),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ productId, imageUrl, allImages }: { productId: string; imageUrl: string; allImages: string[] }) => {
      const updatedImages = allImages.filter(img => img !== imageUrl);
      const { error } = await supabase.from("products").update({ images: updatedImages }).eq("id", productId);
      if (error) throw error;
      try {
        const url = new URL(imageUrl);
        const pathParts = url.pathname.split('/product-images/');
        if (pathParts[1]) await supabase.storage.from('product-images').remove([decodeURIComponent(pathParts[1])]);
      } catch { /* best-effort */ }
      return updatedImages;
    },
    onSuccess: (updatedImages) => {
      queryClient.invalidateQueries({ queryKey: ["seller-products-moderation"] });
      if (selectedProduct) setSelectedProduct({ ...selectedProduct, images: updatedImages });
      toast.success("Image removed from product");
    },
    onError: () => toast.error("Failed to remove image"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (product: { id: string; images?: string[]; asset_file_url?: string }) => {
      const images: string[] = product.images || [];
      if (images.length > 0) {
        const storagePaths = images.map((imageUrl: string) => {
          try { const url = new URL(imageUrl); const p = url.pathname.split('/product-images/'); return p[1] ? decodeURIComponent(p[1]) : null; } catch { return null; }
        }).filter(Boolean) as string[];
        if (storagePaths.length > 0) await supabase.storage.from('product-images').remove(storagePaths);
      }
      if (product.asset_file_url) {
        try { const url = new URL(product.asset_file_url); const p = url.pathname.split('/product-assets/'); if (p[1]) await supabase.storage.from('product-assets').remove([decodeURIComponent(p[1])]); } catch { /* best-effort */ }
      }
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["mod-queue-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview-snapshot"] });
      toast.success("Product deleted successfully");
      setProductToDelete(null);
      setDeleteStep(1);
    },
    onError: () => toast.error("Failed to delete product"),
  });

  return (
    <AdminLayout requiredPermissions={['manage_products']}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product Review</h1>
            <p className="text-muted-foreground">Review and moderate seller product submissions</p>
          </div>
          <Select value={filterStatus} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flagged">Flagged for Review</SelectItem>
              <SelectItem value="pending">All Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Products</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse"><div className="h-48 bg-muted rounded-xl" /></div>)}
          </div>
        ) : products?.length === 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="p-4 py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products found</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products?.map((product) => (
              <ProductReviewCard
                key={product.id}
                product={product}
                onReview={setSelectedProduct}
                onReject={(p) => {
                  setSelectedProduct(p);
                  setModerationNotes("Your product has been rejected as it does not meet our marketplace guidelines. Please review the requirements and resubmit.");
                }}
                onDelete={(p) => { setProductToDelete(p); setDeleteStep(1); }}
                onApprove={(id) => moderateMutation.mutate({ productId: id, status: "approved", notes: "" })}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * REVIEW_PER_PAGE) + 1}–{Math.min(currentPage * REVIEW_PER_PAGE, totalCount)} of {totalCount}
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

        <ProductReviewDialog
          selectedProduct={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          moderationNotes={moderationNotes}
          setModerationNotes={setModerationNotes}
          onApprove={(id, notes) => moderateMutation.mutate({ productId: id, status: "approved", notes })}
          onReject={(id, notes) => moderateMutation.mutate({ productId: id, status: "rejected", notes })}
          onDeleteImage={(productId, imageUrl, allImages) => deleteImageMutation.mutate({ productId, imageUrl, allImages })}
          isDeleteImagePending={deleteImageMutation.isPending}
        />

        <AlertDialog open={!!productToDelete} onOpenChange={() => { setProductToDelete(null); setDeleteStep(1); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{deleteStep === 1 ? "Delete Product?" : "Are you absolutely sure?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteStep === 1 ? (
                  <>You are about to delete <strong>"{productToDelete?.name}"</strong>. This action cannot be undone.</>
                ) : (
                  <>This is your <strong>final confirmation</strong>. <strong>"{productToDelete?.name}"</strong> will be permanently deleted.<br /><br /><span className="text-destructive font-medium">This action is irreversible.</span></>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setProductToDelete(null); setDeleteStep(1); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteStep === 1 ? setDeleteStep(2) : deleteMutation.mutate(productToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteStep === 1 ? "Continue" : deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
