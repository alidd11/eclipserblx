import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, CheckCircle, XCircle, Clock, Square } from 'lucide-react';
import { productImportApi, ExternalProduct } from '@/lib/api/productImport';
import { useActiveStore } from '@/contexts/ActiveStoreContext';

export interface ProductImportStatus {
  url: string;
  name: string;
  status: 'pending' | 'importing' | 'success' | 'failed' | 'cancelled';
  error?: string;
  duration?: number;
  retried?: boolean;
}

interface ImportProgressStepProps {
  urls: string[];
  products: ExternalProduct[];
  downloadImages: boolean;
  categoryOverrides?: Record<string, string>;
  concurrency?: number;
  onComplete: (results: ProductImportStatus[]) => void;
}

export function ImportProgressStep({
  urls,
  products,
  downloadImages,
  categoryOverrides,
  concurrency = 2,
  onComplete,
}: ImportProgressStepProps) {
  const { activeStoreId } = useActiveStore();
  const [statuses, setStatuses] = useState<ProductImportStatus[]>(() =>
    urls.map(url => ({
      url,
      name: products.find(p => p.sourceUrl === url)?.name || 'Unknown',
      status: 'pending' as const,
    }))
  );
  const [cancelled, setCancelled] = useState(false);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const completedCount = statuses.filter(
    s => s.status === 'success' || s.status === 'failed' || s.status === 'cancelled'
  ).length;
  const progress = urls.length > 0 ? (completedCount / urls.length) * 100 : 0;
  const currentItems = statuses.filter(s => s.status === 'importing');

  // Estimate remaining time
  const completedItems = statuses.filter(s => s.duration);
  const avgDuration =
    completedItems.length > 0
      ? completedItems.reduce((sum, s) => sum + (s.duration || 0), 0) / completedItems.length
      : 0;
  const remaining = urls.length - completedCount;
  const estimatedSecondsLeft =
    avgDuration > 0 ? Math.ceil((remaining * avgDuration) / 1000 / Math.min(concurrency, remaining || 1)) : 0;

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    setCancelled(true);
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    abortRef.current = new AbortController();

    const importWithConcurrency = async () => {
      const finalStatuses: ProductImportStatus[] = urls.map((url, i) => ({
        url,
        name: products.find(p => p.sourceUrl === url)?.name || 'Unknown',
        status: 'pending' as const,
      }));

      let nextIndex = 0;

      const processNext = async (): Promise<void> => {
        while (nextIndex < urls.length && !cancelledRef.current) {
          const i = nextIndex++;
          const url = urls[i];
          const itemStart = Date.now();

          // Mark as importing
          setStatuses(prev =>
            prev.map((s, idx) => (idx === i ? { ...s, status: 'importing' } : s))
          );

          try {
            const result = await productImportApi.getProductDetails(url, downloadImages, categoryOverrides?.[url], activeStoreId ?? undefined);
            const duration = Date.now() - itemStart;

            if (cancelledRef.current) {
              finalStatuses[i] = { ...finalStatuses[i], status: 'cancelled', duration };
              setStatuses(prev =>
                prev.map((s, idx) => (idx === i ? finalStatuses[i] : s))
              );
              break;
            }

            if (result.success) {
              const updated: ProductImportStatus = {
                url,
                name: result.product?.name || products.find(p => p.sourceUrl === url)?.name || 'Unknown',
                status: 'success',
                duration,
              };
              finalStatuses[i] = updated;
              setStatuses(prev => prev.map((s, idx) => (idx === i ? updated : s)));
            } else {
              // Check if the error is retryable (transient) — auto-retry once
              const isRetryable = result.error
                ? /timeout|timed out|network|rate limit|server error|5\d{2}/i.test(result.error)
                : false;

              if (isRetryable && !cancelledRef.current) {
                // Auto-retrying after transient error
                setStatuses(prev =>
                  prev.map((s, idx) => (idx === i ? { ...s, status: 'importing' as const } : s))
                );
                // Wait 2 seconds before retry
                await new Promise(r => setTimeout(r, 2000));

                const retryResult = await productImportApi.getProductDetails(url, downloadImages, categoryOverrides?.[url], activeStoreId ?? undefined);
                const retryDuration = Date.now() - itemStart;

                const updated: ProductImportStatus = {
                  url,
                  name: retryResult.product?.name || products.find(p => p.sourceUrl === url)?.name || 'Unknown',
                  status: retryResult.success ? 'success' : 'failed',
                  error: retryResult.success ? undefined : retryResult.error,
                  duration: retryDuration,
                  retried: true,
                };
                finalStatuses[i] = updated;
                setStatuses(prev => prev.map((s, idx) => (idx === i ? updated : s)));
              } else {
                const updated: ProductImportStatus = {
                  url,
                  name: result.product?.name || products.find(p => p.sourceUrl === url)?.name || 'Unknown',
                  status: 'failed',
                  error: result.error,
                  duration,
                };
                finalStatuses[i] = updated;
                setStatuses(prev => prev.map((s, idx) => (idx === i ? updated : s)));
              }
            }
          } catch {
            const duration = Date.now() - itemStart;
            
            // Network-level errors are retryable — auto-retry once
            if (!cancelledRef.current) {
              console.log(`Auto-retrying ${url} after catch error`);
              setStatuses(prev =>
                prev.map((s, idx) => (idx === i ? { ...s, status: 'importing' as const } : s))
              );
              await new Promise(r => setTimeout(r, 2000));

              try {
                const retryResult = await productImportApi.getProductDetails(url, downloadImages, categoryOverrides?.[url], activeStoreId ?? undefined);
                const retryDuration = Date.now() - itemStart;
                const updated: ProductImportStatus = {
                  url,
                  name: retryResult.product?.name || products.find(p => p.sourceUrl === url)?.name || 'Unknown',
                  status: retryResult.success ? 'success' : 'failed',
                  error: retryResult.success ? undefined : retryResult.error,
                  duration: retryDuration,
                  retried: true,
                };
                finalStatuses[i] = updated;
                setStatuses(prev => prev.map((s, idx) => (idx === i ? updated : s)));
              } catch {
                const retryDuration = Date.now() - itemStart;
                const updated: ProductImportStatus = {
                  url,
                  name: products.find(p => p.sourceUrl === url)?.name || 'Unknown',
                  status: 'failed',
                  error: 'Request failed after retry',
                  duration: retryDuration,
                  retried: true,
                };
                finalStatuses[i] = updated;
                setStatuses(prev => prev.map((s, idx) => (idx === i ? updated : s)));
              }
            } else {
              const updated: ProductImportStatus = {
                url,
                name: products.find(p => p.sourceUrl === url)?.name || 'Unknown',
                status: 'cancelled',
                error: 'Cancelled',
                duration,
              };
              finalStatuses[i] = updated;
              setStatuses(prev => prev.map((s, idx) => (idx === i ? updated : s)));
            }
          }
        }
      };

      // Launch concurrent workers
      const workers = Array.from(
        { length: Math.min(concurrency, urls.length) },
        () => processNext()
      );
      await Promise.all(workers);

      // Mark remaining as cancelled if we aborted early
      if (cancelledRef.current) {
        for (let i = 0; i < finalStatuses.length; i++) {
          if (finalStatuses[i].status === 'pending') {
            finalStatuses[i] = { ...finalStatuses[i], status: 'cancelled' };
          }
        }
        setStatuses([...finalStatuses]);
      }

      onComplete(finalStatuses);
    };

    importWithConcurrency();

    return () => {
      abortRef.current?.abort();
    };
  }, [urls, products, downloadImages, categoryOverrides, concurrency, onComplete]);

  return (
    <Card>
      <CardContent className="py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="relative mx-auto w-16 h-16">
            <Loader2 className="h-16 w-16 animate-spin text-primary/30" />
            <Download className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            {cancelled
              ? 'Cancelling…'
              : currentItems.length > 0
                ? `Importing${currentItems.length > 1 ? ` (${currentItems.length} concurrent)` : ''}: ${currentItems[0]?.name}`
                : 'Importing products…'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {concurrency > 1
              ? `Processing ${concurrency} products concurrently${downloadImages ? ', downloading images,' : ''} and creating listings.`
              : `Scraping product details${downloadImages ? ', downloading images,' : ''} and creating listings.`}
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount} / {urls.length} products
            </span>
            <div className="flex items-center gap-3">
              {estimatedSecondsLeft > 0 && remaining > 0 && !cancelled && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{estimatedSecondsLeft}s remaining
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cancel button */}
        {!cancelled && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Square className="h-3.5 w-3.5" />
              Cancel Import
            </Button>
          </div>
        )}

        {/* Per-product status list */}
        <ScrollArea className="max-h-[250px]">
          <div className="space-y-1.5 max-w-md mx-auto">
            {statuses.map(item => (
              <div
                key={item.url}
                className="flex items-center gap-2.5 py-1.5 px-3 rounded-md bg-muted/30"
              >
                {item.status === 'pending' && (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                {item.status === 'importing' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                )}
                {item.status === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                )}
                {item.status === 'failed' && (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                {item.status === 'cancelled' && (
                  <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm truncate flex-1">{item.name}</span>
                {item.status === 'importing' && (
                  <Badge variant="secondary" className="text-[10px]">
                    Importing
                  </Badge>
                )}
                {item.status === 'cancelled' && (
                  <Badge variant="outline" className="text-[10px]">
                    Cancelled
                  </Badge>
                )}
                {item.status === 'success' && item.duration && (
                  <span className="text-[10px] text-muted-foreground">
                    {(item.duration / 1000).toFixed(1)}s
                    {item.retried && ' (retried)'}
                  </span>
                )}
                {item.retried && item.status === 'failed' && (
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/40">
                    Retried
                  </Badge>
                )}
                {item.error && item.status !== 'cancelled' && (
                  <span className="text-[10px] text-destructive truncate max-w-[120px]">
                    {item.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
