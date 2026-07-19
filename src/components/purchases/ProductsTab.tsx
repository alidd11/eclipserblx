import { Link } from 'react-router-dom';
import { ProductsListSkeleton } from '@/components/purchases/PurchasesSkeletons';
import {
  Download, Package, FileDown, CheckCircle, Loader2, Bot, Star, Receipt, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { AddToServerButton } from '@/components/bots/AddToServerButton';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface DownloadProgress {
  itemId: string;
  progress: number;
  fileSize: number | null;
  downloaded: number;
}

interface ProductsTabProps {
  isLoading: boolean;
  downloadableItems: any[];
  paginatedProducts: any[];
  selectableItems: any[];
  allSelectableSelected: boolean;
  selectedItems: Set<string>;
  downloading: string | null;
  downloadProgress: DownloadProgress | null;
  isBatchDownloading: boolean;
  productsPage: number;
  productsTotalPages: number;
  userId?: string;
  isBotProduct: (item: any) => boolean;
  getBotCode: (orderItemId: string) => any;
  toggleItemSelection: (itemId: string) => void;
  toggleSelectAll: () => void;
  handleDownload: (item: any, fileIndex?: number) => void;
  handleDownloadSelected: () => void;
  setProductsPage: (fn: (p: number) => number) => void;
}

export function ProductsTab({
  isLoading,
  downloadableItems,
  paginatedProducts,
  selectableItems,
  allSelectableSelected,
  selectedItems,
  downloading,
  downloadProgress,
  isBatchDownloading,
  productsPage,
  productsTotalPages,
  userId,
  isBotProduct,
  getBotCode,
  toggleItemSelection,
  toggleSelectAll,
  handleDownload,
  handleDownloadSelected,
  setProductsPage,
}: ProductsTabProps) {
  if (isLoading) return <ProductsListSkeleton />;

  if (downloadableItems.length === 0) {
    return (
      <div className="border border-border rounded-xl overflow-hidden border-border bg-card">
        <div className="p-4 py-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
            <FileDown className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No products yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your purchased products will appear here</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {selectableItems.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-3">
            <Checkbox id="select-all" checked={allSelectableSelected} onCheckedChange={toggleSelectAll} disabled={isBatchDownloading} />
            <label htmlFor="select-all" className="text-sm cursor-pointer">
              {allSelectableSelected ? 'Deselect all' : 'Select all'} ({selectableItems.length})
            </label>
          </div>
          <Button onClick={handleDownloadSelected} disabled={selectedItems.size === 0 || isBatchDownloading} className="gradient-button border-0" size="sm">
            {isBatchDownloading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Downloading...</> : <><Download className="h-4 w-4 mr-2" />Download ({selectedItems.size})</>}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {paginatedProducts.map((item) => {
          const isDownloading = downloading === item.id;
          const hasAsset = !!item.product?.asset_file_url;
          const additionalFiles = (item.product as any)?.additional_asset_files || [];
          const totalFiles = (hasAsset ? 1 : 0) + additionalFiles.length;
          const isBot = isBotProduct(item);
          const botCode = isBot ? getBotCode(item.id) : null;

          return (
            <div key={`${item.orderId}-${item.id}`} className="p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                {!isBot && hasAsset && (
                  <div className="flex-shrink-0 pt-1">
                    <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleItemSelection(item.id)} disabled={isBatchDownloading} />
                  </div>
                )}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.product?.images?.[0] ? (
                    <img src={optimizeImageUrl(item.product.images[0], 64, 64, 'contain')} alt={item.product_name} loading="lazy" decoding="async" className="w-full h-full object-contain object-center" />
                  ) : isBot ? (
                    <div className="w-full h-full flex items-center justify-center bg-blue-500/10">
                      <Bot className="h-6 w-6 text-blue-500" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="font-medium truncate">{item.product_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />Purchased
                      </Badge>
                      {isBot && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs">
                          <Bot className="h-3 w-3 mr-1" />Bot
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {new Date(item.orderDate).toLocaleDateString()}
                    </span>
                  </div>

                  {!isBot && isDownloading && downloadProgress?.fileSize && (
                    <div className="w-full max-w-[200px] space-y-1">
                      <Progress value={downloadProgress.progress} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(downloadProgress.downloaded)} / {formatFileSize(downloadProgress.fileSize)}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {isBot && botCode ? (
                      <AddToServerButton
                        installationCodeId={botCode.id}
                        productName={botCode.product_name || item.product_name}
                        isActivated={!!botCode.activated_at}
                        guildName={botCode.discord_guild_name}
                        guildIcon={botCode.discord_guild_icon}
                        userId={userId || ''}
                      />
                    ) : isBot ? (
                      <Badge variant="secondary" className="text-xs">Loading...</Badge>
                    ) : totalFiles > 1 ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Button onClick={() => handleDownload(item, 0)} disabled={!hasAsset || isDownloading} className="gradient-button border-0" size="sm">
                          {isDownloading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{downloadProgress?.progress || 0}%</> : <><Download className="h-4 w-4 mr-2" />Main File</>}
                        </Button>
                        {additionalFiles.map((_: string, idx: number) => (
                          <Button key={idx} onClick={() => handleDownload(item, idx + 1)} disabled={isDownloading} variant="outline" size="sm">
                            <FileDown className="h-4 w-4 mr-1" />File {idx + 2}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Button onClick={() => handleDownload(item, 0)} disabled={!hasAsset || isDownloading} className="gradient-button border-0" size="sm">
                        {isDownloading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{downloadProgress?.progress || 0}%</> : !hasAsset ? <><Package className="h-4 w-4 mr-2" />No file</> : <><Download className="h-4 w-4 mr-2" />Download</>}
                      </Button>
                    )}
                    {(item.product as any)?.product_number && (
                      <Button asChild variant="outline" size="sm" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                        <Link to={`/products/${(item.product as any).product_number}#reviews`}><Star className="h-4 w-4 mr-2" />Review</Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/order-success?order_id=${item.orderId}`}><Receipt className="h-4 w-4 mr-2" />Receipt</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {productsTotalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setProductsPage(p => Math.max(1, p - 1))} disabled={productsPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">Page {productsPage} of {productsTotalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setProductsPage(p => Math.min(productsTotalPages, p + 1))} disabled={productsPage === productsTotalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
