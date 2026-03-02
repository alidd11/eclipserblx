import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, CheckCircle, XCircle } from 'lucide-react';
import { productImportApi, ExternalProduct } from '@/lib/api/productImport';

export interface ProductImportStatus {
  url: string;
  name: string;
  status: 'pending' | 'importing' | 'success' | 'failed';
  error?: string;
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

  const completedCount = statuses.filter(s => s.status === 'success' || s.status === 'failed').length;
  const progress = urls.length > 0 ? (completedCount / urls.length) * 100 : 0;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const importProducts = async () => {
      if (urls.length === 1) {
        // Single product
        setStatuses(prev => prev.map(s => s.url === urls[0] ? { ...s, status: 'importing' } : s));
        const result = await productImportApi.getProductDetails(urls[0], downloadImages);
        const finalStatuses: ProductImportStatus[] = [{
          url: urls[0],
          name: products.find(p => p.sourceUrl === urls[0])?.name || 'Unknown',
          status: result.success ? 'success' : 'failed',
          error: result.error,
        }];
        setStatuses(finalStatuses);
        onComplete(finalStatuses);
      } else {
        // Mark all as importing
        setStatuses(prev => prev.map(s => ({ ...s, status: 'importing' as const })));

        const result = await productImportApi.bulkImport(urls, downloadImages);

        let finalStatuses: ProductImportStatus[];
        if (result.success && result.results) {
          finalStatuses = result.results.map(r => ({
            url: r.url,
            name: r.product?.name || products.find(p => p.sourceUrl === r.url)?.name || 'Unknown',
            status: (r.success ? 'success' : 'failed') as 'success' | 'failed',
            error: r.error,
          }));
        } else {
          finalStatuses = urls.map(url => ({
            url,
            name: products.find(p => p.sourceUrl === url)?.name || 'Unknown',
            status: 'failed' as const,
            error: result.error || 'Import failed',
          }));
        }
        setStatuses(finalStatuses);
        onComplete(finalStatuses);
      }
    };

    importProducts();
  }, [urls, products, downloadImages, onComplete]);

  return (
    <Card>
      <CardContent className="py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="relative mx-auto w-16 h-16">
            <Loader2 className="h-16 w-16 animate-spin text-primary/30" />
            <Download className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Importing products…</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Scraping product details{downloadImages ? ', downloading images,' : ''} and creating listings.
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {completedCount} / {urls.length} products
          </p>
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
