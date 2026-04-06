import { useState } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Check, X, Eye, Package, Trash2, AlertTriangle, ShieldAlert, Clock, Lock, ImageMinus, FileCheck, FileX, ChevronDown, ScanSearch, ChevronLeft, ChevronRight } from "lucide-react";
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
        .select(`
          *,
          stores!products_store_id_fkey (
            name,
            store_id,
            owner_id
          ),
          categories (name)
        `, { count: 'exact' })
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

  // Delete individual image from a product
  const deleteImageMutation = useMutation({
    mutationFn: async ({ productId, imageUrl, allImages }: { productId: string; imageUrl: string; allImages: string[] }) => {
      const updatedImages = allImages.filter(img => img !== imageUrl);
      
      const { error } = await supabase
        .from("products")
        .update({ images: updatedImages })
        .eq("id", productId);

      if (error) throw error;

      // Try to delete from storage too
      try {
        const url = new URL(imageUrl);
        const pathParts = url.pathname.split('/product-images/');
        if (pathParts[1]) {
          await supabase.storage.from('product-images').remove([decodeURIComponent(pathParts[1])]);
        }
      } catch {
        // Storage deletion is best-effort
      }

      return updatedImages;
    },
    onSuccess: (updatedImages) => {
      queryClient.invalidateQueries({ queryKey: ["seller-products-moderation"] });
      // Update selected product in place
      if (selectedProduct) {
        setSelectedProduct({ ...selectedProduct, images: updatedImages });
      }
      toast.success("Image removed from product");
    },
    onError: () => {
      toast.error("Failed to remove image");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (product: { id: string; images?: string[]; asset_file_url?: string }) => {
      // Delete product images from storage first
      const images: string[] = product.images || [];
      if (images.length > 0) {
        const storagePaths = images
          .map((imageUrl: string) => {
            try {
              const url = new URL(imageUrl);
              const pathParts = url.pathname.split('/product-images/');
              return pathParts[1] ? decodeURIComponent(pathParts[1]) : null;
            } catch {
              return null;
            }
          })
          .filter(Boolean) as string[];

        if (storagePaths.length > 0) {
          await supabase.storage.from('product-images').remove(storagePaths);
        }
      }

      // Delete asset file from storage if exists
      if (product.asset_file_url) {
        try {
          const url = new URL(product.asset_file_url);
          const pathParts = url.pathname.split('/product-assets/');
          if (pathParts[1]) {
            await supabase.storage.from('product-assets').remove([decodeURIComponent(pathParts[1])]);
          }
        } catch {
          // Asset deletion is best-effort
        }
      }

      // Then delete the product record
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

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

  const handleDeleteClick = (product: { id: string; images?: string[]; asset_file_url?: string }) => {
    setProductToDelete(product);
    setDeleteStep(1);
  };

  const handleDeleteConfirm = () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
    } else {
      deleteMutation.mutate(productToDelete);
    }
  };

  const handleDeleteCancel = () => {
    setProductToDelete(null);
    setDeleteStep(1);
  };

  const getStatusBadge = (status: string, product?: Record<string, unknown>) => {
    // Show consent status for flagged products
    if (status === 'pending' && product?.moderation_flags && product?.file_review_requested_at) {
      if (!product?.file_review_consented_at) {
        return (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            Awaiting Consent
          </Badge>
        );
      }
      return (
        <Badge className="bg-amber-500/20 text-amber-400 gap-1">
          <Eye className="h-3 w-3" />
          Ready for Review
        </Badge>
      );
    }
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Render moderation flags if present
  const renderModerationFlags = (flags: Record<string, unknown> | null | undefined) => {
    if (!flags) return null;
    const f = flags as { nsfw_flags?: string[]; lua_concerns?: string[]; lua_risk_level?: string; has_roblox_files?: boolean; file_names_sample?: string[]; total_files?: number; scan_timestamp?: string };
    
    const hasNsfw = flags.nsfw_flags?.length > 0;
    const hasLuaConcerns = flags.lua_concerns?.length > 0;
    const luaRisk = flags.lua_risk_level;
    
    if (!hasNsfw && !hasLuaConcerns) return null;
    
    return (
      <div className="mt-2 space-y-1">
        {hasNsfw && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <ShieldAlert className="h-3 w-3" />
            <span>NSFW flagged</span>
          </div>
        )}
        {hasLuaConcerns && (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            <span>Lua {luaRisk} risk: {flags.lua_concerns.slice(0, 2).join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout requiredPermissions={['view_seller_stores']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product Review</h1>
            <p className="text-muted-foreground">Review and moderate seller product submissions</p>
          </div>
          <Select value={filterStatus} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
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
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-xl" />
              </div>
            ))}
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
              <div key={product.id} className="overflow-hidden">
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
                    {getStatusBadge(product.moderation_status || "pending", product)}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
                  <h3 className="font-semibold text-sm text-lg line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    by {product.stores?.name || "Unknown Store"}
                  </p>
                </div>
                <div className="p-4 space-y-3">
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
                  {/* Consent status info */}
                  {product.moderation_status === "pending" && product.moderation_flags && product.file_review_requested_at && !product.file_review_consented_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-2 rounded bg-muted/50">
                      <Lock className="h-3 w-3" />
                      <span>File sealed — waiting for seller consent since {new Date(product.file_review_requested_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {product.file_review_consented_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-2 rounded bg-green-500/5">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Seller consented {new Date(product.file_review_consented_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* File & Scan Info - Collapsible */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors text-xs">
                      <div className="flex items-center gap-1.5">
                        {product.asset_file_url ? (
                          <FileCheck className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <FileX className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span className="font-medium">
                          {product.asset_file_url ? 'File Attached' : 'No File'}
                        </span>
                        {product.moderation_flags && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1">
                            <ScanSearch className="h-2.5 w-2.5 mr-0.5" />
                            Scanned
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-1.5">
                      {product.asset_file_url ? (
                        <p className="text-[11px] text-muted-foreground break-all px-1">
                          {product.asset_file_url.split('/').pop()}
                        </p>
                      ) : (
                        <p className="text-[11px] text-destructive/80 px-1">
                          No asset file uploaded — product is hidden from marketplace
                        </p>
                      )}
                      {product.moderation_flags ? (
                        <div className="space-y-1 px-1">
                          {product.moderation_flags.nsfw_flags?.length > 0 && (
                            <div className="flex items-start gap-1 text-[11px] text-destructive">
                              <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>NSFW: {product.moderation_flags.nsfw_flags.join(', ')}</span>
                            </div>
                          )}
                          {product.moderation_flags.lua_concerns?.length > 0 && (
                            <div className="flex items-start gap-1 text-[11px] text-amber-500">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>Lua ({product.moderation_flags.lua_risk_level}): {product.moderation_flags.lua_concerns.join(', ')}</span>
                            </div>
                          )}
                          {product.moderation_flags.has_roblox_files === false && (
                            <div className="flex items-start gap-1 text-[11px] text-amber-500">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>No Roblox files detected (.rbxm/.rbxl)</span>
                            </div>
                          )}
                          {(() => {
                            const fileNames: string[] = product.moderation_flags.file_names_sample || [];
                            const suspiciousExts = fileNames.filter((f: string) => /\.(rtf|exe|bat|cmd|ps1|vbs|dll|msi|scr)$/i.test(f));
                            if (suspiciousExts.length === 0) return null;
                            return (
                              <div className="flex items-start gap-1 text-[11px] text-destructive">
                                <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>Suspicious files: {suspiciousExts.map((f: string) => f.split('/').pop()).join(', ')}</span>
                              </div>
                            );
                          })()}
                          {product.moderation_flags.file_names_sample?.length > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              <span className="font-medium">{product.moderation_flags.total_files || '?'} files:</span>
                              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                {product.moderation_flags.file_names_sample.map((f: string, i: number) => (
                                  <li key={i} className="break-all">{f}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {product.moderation_flags.scan_timestamp && (
                            <p className="text-[10px] text-muted-foreground">
                              Scanned {new Date(product.moderation_flags.scan_timestamp).toLocaleDateString()}
                            </p>
                          )}
                          {!product.moderation_flags.nsfw_flags?.length && !product.moderation_flags.lua_concerns?.length && product.moderation_flags.has_roblox_files !== false && !(product.moderation_flags.file_names_sample || []).some((f: string) => /\.(rtf|exe|bat|cmd|ps1|vbs|dll|msi|scr)$/i.test(f)) && (
                            <p className="text-[11px] text-green-500">✓ Clean — no issues detected</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground px-1">No scan results available</p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Show moderation flags for pending products */}
                  {product.moderation_status === "pending" && renderModerationFlags(product.moderation_flags)}
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
                        {/* Only allow approve/reject if consent given (or no flags) */}
                        {(!product.moderation_flags || product.file_review_consented_at) ? (
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
                          </>
                        ) : !product.file_review_requested_at ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1 text-xs"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('products')
                                .update({ file_review_requested_at: new Date().toISOString() })
                                .eq('id', product.id);
                              if (error) {
                                toast.error("Failed to request file access");
                              } else {
                                toast.success("File access requested — seller will be prompted to consent");
                                queryClient.invalidateQueries({ queryKey: ["seller-products-moderation"] });
                              }
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            Request Access
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled className="gap-1">
                            <Lock className="h-3 w-3" />
                            Sealed
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedProduct(product);
                            setModerationNotes("Your product has been rejected as it does not meet our marketplace guidelines. Please review the requirements and resubmit.");
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
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

        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Product: {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Product Images Gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Product Images ({selectedProduct?.images?.length || 0})
                  </span>
                </div>
                {selectedProduct?.images?.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedProduct.images.map((imageUrl: string, index: number) => (
                      <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                        <img
                          src={imageUrl}
                          alt={`Product image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => deleteImageMutation.mutate({
                              productId: selectedProduct.id,
                              imageUrl,
                              allImages: selectedProduct.images,
                            })}
                            disabled={deleteImageMutation.isPending}
                          >
                            <ImageMinus className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                        {index === 0 && (
                          <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0">
                            Thumbnail
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
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
                  <p>{getStatusBadge(selectedProduct?.moderation_status || "pending", selectedProduct)}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Description:</span>
                {selectedProduct?.description ? (
                  <div
                    className="mt-1 text-sm prose prose-sm prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(selectedProduct.description),
                    }}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No description</p>
                )}
              </div>
              {/* Show moderation flags in detail */}
              {selectedProduct?.moderation_flags && (
                <div className="p-3 border border-amber-500/30 bg-amber-500/10 rounded-lg space-y-2">
                  <span className="text-sm font-medium flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    Security Scan Flags
                  </span>
                  {selectedProduct.moderation_flags.nsfw_flags?.length > 0 && (
                    <div className="text-sm">
                      <span className="text-destructive font-medium">NSFW Detected:</span>
                      <ul className="list-disc list-inside ml-2 text-muted-foreground">
                        {selectedProduct.moderation_flags.nsfw_flags.map((flag: string, i: number) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedProduct.moderation_flags.lua_concerns?.length > 0 && (
                    <div className="text-sm">
                      <span className="text-amber-600 font-medium">
                        Lua Analysis ({selectedProduct.moderation_flags.lua_risk_level} risk):
                      </span>
                      <ul className="list-disc list-inside ml-2 text-muted-foreground">
                        {selectedProduct.moderation_flags.lua_concerns.map((concern: string, i: number) => (
                          <li key={i}>{concern}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedProduct.moderation_flags.scan_timestamp && (
                    <p className="text-xs text-muted-foreground">
                      Scanned: {new Date(selectedProduct.moderation_flags.scan_timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {selectedProduct?.moderation_status === "pending" && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Moderation Notes</label>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {[
                      "Does not meet marketplace guidelines",
                      "Missing or incomplete product files",
                      "Inappropriate content detected",
                      "Price does not match product quality",
                      "Duplicate or copied product",
                    ].map((reason) => (
                      <Badge
                        key={reason}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent text-[11px]"
                        onClick={() => setModerationNotes(reason)}
                      >
                        {reason}
                      </Badge>
                    ))}
                  </div>
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
