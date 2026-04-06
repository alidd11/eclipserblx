import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Package, Clock, Zap, Square } from 'lucide-react';
import { ProductImportStatus } from './ImportProgressStep';
import { motion } from 'framer-motion';

interface ImportCompleteStepProps {
 results: ProductImportStatus[];
 onReset: () => void;
 onRetryFailed: (failedUrls: string[]) => void;
}

export function ImportCompleteStep({ results, onReset, onRetryFailed }: ImportCompleteStepProps) {
 const navigate = useNavigate();
 const successCount = results.filter(r => r.status === 'success').length;
 const failCount = results.filter(r => r.status === 'failed').length;
 const cancelledCount = results.filter(r => r.status === 'cancelled').length;
 const failedUrls = results.filter(r => r.status === 'failed').map(r => r.url);
 const retryableUrls = results.filter(r => r.status === 'failed' || r.status === 'cancelled').map(r => r.url);
 const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
 const completedResults = results.filter(r => r.duration);
 const avgDuration = completedResults.length > 0 ? totalDuration / completedResults.length : 0;

 return (
 <div className="space-y-4">
 {/* Summary card */}
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ type: 'spring', stiffness: 300, damping: 25 }}
 >
 <div className={cn("border border-border rounded-xl overflow-hidden", successCount > 0 ? 'border-green-500/30' : 'border-destructive/30')}>
 <div className="p-4 pt-6">
 <div className="flex items-center gap-4">
 {successCount > 0 ? (
 <motion.div
 className="p-3 rounded-full bg-green-500/10"
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
 >
 <CheckCircle className="h-8 w-8 text-green-500" />
 </motion.div>
 ) : cancelledCount > 0 ? (
 <div className="p-3 rounded-full bg-muted">
 <Square className="h-8 w-8 text-muted-foreground" />
 </div>
 ) : (
 <div className="p-3 rounded-full bg-destructive/10">
 <XCircle className="h-8 w-8 text-destructive" />
 </div>
 )}
 <div className="flex-1">
 <h3 className="text-lg font-semibold">
 {cancelledCount > 0 && successCount === 0
 ? 'Import cancelled'
 : successCount > 0
 ? `${successCount} product${successCount !== 1 ? 's' : ''} imported`
 : 'Import failed'}
 </h3>
 <p className="text-sm text-muted-foreground">
 {failCount > 0 && `${failCount} failed. `}
 {cancelledCount > 0 && `${cancelledCount} cancelled. `}
 {successCount > 0 && 'Products have been created and are ready for review.'}
 </p>
 </div>
 </div>

 {/* Stats row */}
 {completedResults.length > 0 && (
 <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Clock className="h-3.5 w-3.5" />
 <span>Total: {(totalDuration / 1000).toFixed(1)}s</span>
 </div>
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Zap className="h-3.5 w-3.5" />
 <span>Avg: {(avgDuration / 1000).toFixed(1)}s/product</span>
 </div>
 <div className="ml-auto flex items-center gap-2">
 {successCount > 0 && (
 <Badge variant="secondary" className="text-[10px] gap-1 bg-green-500/10 text-green-600 border-green-500/20">
 <CheckCircle className="h-2.5 w-2.5" /> {successCount}
 </Badge>
 )}
 {failCount > 0 && (
 <Badge variant="secondary" className="text-[10px] gap-1 bg-destructive/10 text-destructive border-destructive/20">
 <XCircle className="h-2.5 w-2.5" /> {failCount}
 </Badge>
 )}
 {cancelledCount > 0 && (
 <Badge variant="outline" className="text-[10px] gap-1">
 <Square className="h-2.5 w-2.5" /> {cancelledCount}
 </Badge>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 </motion.div>

 {/* Results list */}
 {results.length > 1 && (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <h3 className="font-semibold text-sm text-sm">Import Details</h3>
 </div>
 <div className="p-4">
 <div className="space-y-2">
 {results.map((result, i) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: i * 0.05 }}
 className="flex items-center gap-3 py-2"
 >
 {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
 {result.status === 'failed' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
 {result.status === 'cancelled' && <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
 {result.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
 <span className="text-sm truncate flex-1">{result.name}</span>
 {result.duration && (
 <span className="text-[10px] text-muted-foreground shrink-0">
 {(result.duration / 1000).toFixed(1)}s
 </span>
 )}
 {result.error && result.status !== 'cancelled' && (
 <span className="text-xs text-destructive truncate max-w-[200px]">{result.error}</span>
 )}
 </motion.div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Actions */}
 <div className="flex items-center gap-3 flex-wrap">
 <Button variant="outline" onClick={onReset} className="gap-2">
 <RefreshCw className="h-4 w-4" />
 Import More
 </Button>
 {retryableUrls.length > 0 && (
 <Button variant="outline" onClick={() => onRetryFailed(retryableUrls)} className="gap-2 text-warning border-warning/40 hover:bg-warning/10">
 <RefreshCw className="h-4 w-4" />
 Retry {failCount > 0 ? 'Failed' : 'Cancelled'} ({retryableUrls.length})
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
