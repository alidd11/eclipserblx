import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { productImportApi, ExternalProduct } from '@/lib/api/productImport';

export interface ProductImportStatus {
  url: string;
  name: string;
  status: 'pending' | 'importing' | 'success' | 'failed';
  error?: string;
  duration?: number;
}

interface ImportProgressStepProps {
  urls: string[];
  products: ExternalProduct[];
  downloadImages: boolean;
  onComplete: (results: ProductImportStatus[]) => void;
}

export function ImportProgressStep({ urls, products, downloadImages, onComplete }: ImportProgressStepProps) {
  const [statuses, setStatuses] = useState<ProductImportStatus[]>(() =>
    urls.map(url => ({
      url,
      name: products.find(p => p.sourceUrl === url)?.name || 'Unknown',
      status: 'pending',
    }))
  );
  const startedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  const completedCount = statuses.filter(s => s.status === 'success' || s.status === 'failed').length;
  const progress = urls.length > 0 ? (completedCount / urls.length) * 100 : 0;
  const currentItem = statuses.find(s => s.status === 'importing');

  // Estimate remaining time based on average duration of completed items
  const completedItems = statuses.filter(s => s.duration);
  const avgDuration = completedItems.length > 0
    ? completedItems.reduce((sum, s) => sum + (s.duration || 0), 0) / completedItems.length
    : 0;
  const remaining = urls.length - completedCount;
  const estimatedSecondsLeft = avgDuration > 0 ? Math.ceil((remaining * avgDuration) / 1000) : 0;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startTimeRef.current = Date.now();

    const importSequentially = async () => {
      const finalStatuses: ProductImportStatus[] = [...statuses];

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const itemStart = Date.now();

        // Mark current as importing
        setStatuses(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'importing' } : s
        ));

        const result = await productImportApi.getProductDetails(url, downloadImages);
        const duration = Date.now() - itemStart;

        const updatedItem: ProductImportStatus = {
          url,
          name: result.product?.name || products.find(p => p.sourceUrl === url)?.name || 'Unknown',
          status: result.success ? 'success' : 'failed',
          error: result.error,
          duration,
        };

        finalStatuses[i] = updatedItem;

        setStatuses(prev => prev.map((s, idx) =>
          idx === i ? updatedItem : s
        ));
      }

      onComplete(finalStatuses);
    };

    importSequentially();
  }, [urls, products, downloadImages, onComplete]);

  return (
    <Card>
      <CardContent className="py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="relative mx-auto w-16 h-16">
            <Loader2 className="h-16 w-16 animate-spin text-primary/30" />
            <Download className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            {currentItem ? `Importing: ${currentItem.name}` : 'Importing products…'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Scraping product details{downloadImages ? ', downloading images,' : ''} and creating listings.
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedCount} / {urls.length} products</span>
            {estimatedSecondsLeft > 0 && remaining > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{estimatedSecondsLeft}s remaining
              </span>
            )}
          </div>
        </div>

        {/* Per-product status list */}
        <ScrollArea className="max-h-[250px]">
          <div className="space-y-1.5 max-w-md mx-auto">
            {statuses.map((item) => (
              <div key={item.url} className="flex items-center gap-2.5 py-1.5 px-3 rounded-md bg-muted/30">
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
                <span className="text-sm truncate flex-1">{item.name}</span>
                {item.status === 'importing' && (
                  <Badge variant="secondary" className="text-[10px]">Importing</Badge>
                )}
                {item.status === 'success' && item.duration && (
                  <span className="text-[10px] text-muted-foreground">{(item.duration / 1000).toFixed(1)}s</span>
                )}
                {item.error && (
                  <span className="text-[10px] text-destructive truncate max-w-[120px]">{item.error}</span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
