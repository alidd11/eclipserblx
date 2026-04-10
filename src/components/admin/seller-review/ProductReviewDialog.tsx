import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, AlertTriangle, ShieldAlert, ImageMinus } from 'lucide-react';
import { getStatusBadge } from './ProductReviewCard';
import { formatGBP } from '@/lib/formatters';

interface ProductReviewDialogProps {
  selectedProduct: any;
  onClose: () => void;
  moderationNotes: string;
  setModerationNotes: (notes: string) => void;
  onApprove: (productId: string, notes: string) => void;
  onReject: (productId: string, notes: string) => void;
  onDeleteImage: (productId: string, imageUrl: string, allImages: string[]) => void;
  isDeleteImagePending: boolean;
}

export function ProductReviewDialog({
  selectedProduct,
  onClose,
  moderationNotes,
  setModerationNotes,
  onApprove,
  onReject,
  onDeleteImage,
  isDeleteImagePending,
}: ProductReviewDialogProps) {
  if (!selectedProduct) return null;

  return (
    <Dialog open={!!selectedProduct} onOpenChange={() => onClose()}>
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
                    <img src={imageUrl} alt={`Product image ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => onDeleteImage(selectedProduct.id, imageUrl, selectedProduct.images)}
                        disabled={isDeleteImagePending}
                      >
                        <ImageMinus className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                    {index === 0 && (
                      <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0">Thumbnail</Badge>
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
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedProduct.description) }}
              />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No description</p>
            )}
          </div>

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
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" onClick={() => onReject(selectedProduct.id, moderationNotes)}>
              Reject
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => onApprove(selectedProduct.id, moderationNotes)}>
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
