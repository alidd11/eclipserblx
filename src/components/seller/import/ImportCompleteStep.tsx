import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw, Package } from 'lucide-react';
import { ProductImportStatus } from './ImportProgressStep';

interface ImportCompleteStepProps {
  results: ProductImportStatus[];
  onReset: () => void;
  onRetryFailed: (failedUrls: string[]) => void;
}

export function ImportCompleteStep({ results, onReset, onRetryFailed }: ImportCompleteStepProps) {
  const navigate = useNavigate();
  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;
  const failedUrls = results.filter(r => r.status === 'failed').map(r => r.url);

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card className={successCount > 0 ? 'border-green-500/30' : 'border-destructive/30'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {successCount > 0 ? (
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            ) : (
              <div className="p-3 rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold">
                {successCount > 0
                  ? `${successCount} product${successCount !== 1 ? 's' : ''} imported`
                  : 'Import failed'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {failCount > 0 && `${failCount} failed. `}
                {successCount > 0 && 'Products have been created and are ready for review.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results list */}
      {results.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Import Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span className="text-sm truncate flex-1">{result.name}</span>
                  {result.error && (
                    <span className="text-xs text-destructive truncate max-w-[200px]">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Import More
        </Button>
        {failCount > 0 && (
          <Button variant="outline" onClick={() => onRetryFailed(failedUrls)} className="gap-2 text-warning border-warning/40 hover:bg-warning/10">
            <RefreshCw className="h-4 w-4" />
            Retry Failed ({failCount})
          </Button>
        )}
        {successCount > 0 && (
          <Button onClick={() => navigate('/seller/products')} className="gap-2">
            <Package className="h-4 w-4" />
            View My Products
          </Button>
        )}
      </div>
    </div>
  );
}
