import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, Eye, Package, Trash2, AlertTriangle, ShieldAlert, Lock, FileCheck, FileX, ChevronDown, ScanSearch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { formatGBP } from '@/lib/formatters';

interface ModerationFlags {
  nsfw_flags?: string[];
  lua_concerns?: string[];
  lua_risk_level?: string;
  has_roblox_files?: boolean;
  file_names_sample?: string[];
  total_files?: number;
  scan_timestamp?: string;
}

interface ProductReviewCardProps {
  product: any;
  onReview: (product: any) => void;
  onReject: (product: any) => void;
  onDelete: (product: any) => void;
  onApprove: (productId: string) => void;
}

export function getStatusBadge(status: string, product?: Record<string, unknown>) {
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
}

export function renderModerationFlags(flags: any) {
  if (!flags) return null;
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
}

export function ProductReviewCard({ product, onReview, onReject, onDelete, onApprove }: ProductReviewCardProps) {
  const queryClient = useQueryClient();

  return (
    <div className="overflow-hidden">
      <div className="aspect-video relative bg-muted">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
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
        <p className="text-sm text-muted-foreground">by {product.stores?.name || "Unknown Store"}</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Price</span>
          <span className="font-medium">{formatGBP(product.price ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Seller Price</span>
          <span className="font-medium">{formatGBP(product.seller_price ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Category</span>
          <span>{product.categories?.name || "Uncategorized"}</span>
        </div>

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

        {/* File & Scan Info */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors text-xs">
            <div className="flex items-center gap-1.5">
              {product.asset_file_url ? (
                <FileCheck className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <FileX className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="font-medium">{product.asset_file_url ? 'File Attached' : 'No File'}</span>
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
            {product.moderation_flags ? (() => {
              const mf = product.moderation_flags as unknown as ModerationFlags;
              return (
                <div className="space-y-1 px-1">
                  {mf.nsfw_flags && mf.nsfw_flags.length > 0 && (
                    <div className="flex items-start gap-1 text-[11px] text-destructive">
                      <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>NSFW: {mf.nsfw_flags.join(', ')}</span>
                    </div>
                  )}
                  {mf.lua_concerns && mf.lua_concerns.length > 0 && (
                    <div className="flex items-start gap-1 text-[11px] text-amber-500">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>Lua ({mf.lua_risk_level}): {mf.lua_concerns.join(', ')}</span>
                    </div>
                  )}
                  {mf.has_roblox_files === false && (
                    <div className="flex items-start gap-1 text-[11px] text-amber-500">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>No Roblox files detected (.rbxm/.rbxl)</span>
                    </div>
                  )}
                  {(() => {
                    const fileNames: string[] = mf.file_names_sample || [];
                    const suspiciousExts = fileNames.filter((f: string) => /\.(rtf|exe|bat|cmd|ps1|vbs|dll|msi|scr)$/i.test(f));
                    if (suspiciousExts.length === 0) return null;
                    return (
                      <div className="flex items-start gap-1 text-[11px] text-destructive">
                        <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>Suspicious files: {suspiciousExts.map((f: string) => f.split('/').pop()).join(', ')}</span>
                      </div>
                    );
                  })()}
                  {mf.file_names_sample && mf.file_names_sample.length > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      <span className="font-medium">{mf.total_files || '?'} files:</span>
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                        {mf.file_names_sample.map((f: string, i: number) => (
                          <li key={i} className="break-all">{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {mf.scan_timestamp && (
                    <p className="text-[10px] text-muted-foreground">
                      Scanned {new Date(mf.scan_timestamp).toLocaleDateString()}
                    </p>
                  )}
                  {!mf.nsfw_flags?.length && !mf.lua_concerns?.length && mf.has_roblox_files !== false && !(mf.file_names_sample || []).some((f: string) => /\.(rtf|exe|bat|cmd|ps1|vbs|dll|msi|scr)$/i.test(f)) && (
                    <p className="text-[11px] text-green-500">✓ Clean — no issues detected</p>
                  )}
                </div>
              );
            })() : (
              <p className="text-[11px] text-muted-foreground px-1">No scan results available</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {product.moderation_status === "pending" && renderModerationFlags(product.moderation_flags)}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onReview(product)}>
            <Eye className="h-4 w-4 mr-1" />
            Review
          </Button>
          {product.moderation_status === "pending" && (
            <>
              {(!product.moderation_flags || product.file_review_consented_at) ? (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => onApprove(product.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
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
                onClick={() => onReject(product)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(product)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
