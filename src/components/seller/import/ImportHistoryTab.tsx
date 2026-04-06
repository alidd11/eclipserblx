import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
 Loader2, CheckCircle, XCircle, AlertTriangle, History, ExternalLink, RefreshCw
} from 'lucide-react';
import { productImportApi, ImportHistoryItem } from '@/lib/api/productImport';
import { useActiveStore } from '@/contexts/ActiveStoreContext';

export function ImportHistoryTab() {
 const { activeStoreId } = useActiveStore();
 const [history, setHistory] = useState<ImportHistoryItem[]>([]);
 const [loading, setLoading] = useState(false);

 const loadHistory = async () => {
 setLoading(true);
 try {
 const result = await productImportApi.getHistory(activeStoreId ?? undefined);
 if (result.success && result.imports) {
 setHistory(result.imports);
 }
 } catch (err) {
 console.error('Failed to load history:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadHistory();
 }, []);

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <History className="h-5 w-5" />
 Import History
 </h3>
 <p className="text-sm text-muted-foreground">Products you've previously imported</p>
 </div>
 <Button variant="ghost" size="sm" onClick={loadHistory} disabled={loading}>
 <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
 </Button>
 </div>
 </div>
 <div className="p-4">
 {loading ? (
 <div className="flex items-center justify-center py-8">
 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
 </div>
 ) : history.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground">
 <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
 <p className="text-sm">No imports yet</p>
 </div>
 ) : (
 <ScrollArea className="h-[400px]">
 <div className="space-y-2">
 {history.map((item) => (
 <div
 key={item.id}
 className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
 >
 {item.status === 'completed' ? (
 <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
 ) : item.status === 'failed' ? (
 <XCircle className="h-4 w-4 text-destructive shrink-0" />
 ) : (
 <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
 )}
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">{item.source_name}</p>
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <span>{item.source_platform === 'clearlydev' ? 'ClearlyDev' : 'BuiltByBit'}</span>
 <span>•</span>
 <span>{new Date(item.imported_at).toLocaleDateString()}</span>
 {item.source_price != null && item.source_price > 0 && (
 <>
 <span>•</span>
 <span>£{item.source_price.toFixed(2)}</span>
 </>
 )}
 </div>
 {item.error_message && (
 <p className="text-xs text-destructive mt-0.5 truncate">{item.error_message}</p>
 )}
 </div>
 <Badge
 variant={item.status === 'completed' ? 'default' : 'destructive'}
 className="shrink-0 text-[10px]"
 >
 {item.status}
 </Badge>
 <a
 href={item.source_url}
 target="_blank"
 rel="noopener noreferrer"
 className="p-1.5 rounded hover:bg-muted shrink-0"
 >
 <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
 </a>
 </div>
 ))}
 </div>
 </ScrollArea>
 )}
 </div>
 </div>
 );
}
