import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, Image, Globe, ArrowLeft, ArrowRight, ImageOff,
  ChevronDown, Tag, EyeOff, Zap, Coins, AlertCircle,
} from 'lucide-react';
import { ExternalProduct, ImportQuota } from '@/lib/api/productImport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { productImportApi } from '@/lib/api/productImport';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { Link } from 'react-router-dom';
import { formatGBP } from '@/lib/formatters';

interface ImportSelectStepProps {
  products: ExternalProduct[];
  platform: string | null;
  onBack: () => void;
  onImport: (urls: string[], downloadImages: boolean, categoryOverrides?: Record<string, string>) => void;
}

export function ImportSelectStep({ products, platform, onBack, onImport }: ImportSelectStepProps) {
  const { activeStoreId } = useActiveStore();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(() => {
    const available = products.filter(p => !p.alreadyImported);
    return new Set(available.map(p => p.sourceUrl));
  });
  const [downloadImages, setDownloadImages] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [hideImported, setHideImported] = useState(false);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch import quota
  const { data: quotaData } = useQuery({
    queryKey: ['import-quota', activeStoreId],
    queryFn: async () => {
      const result = await productImportApi.getQuota(activeStoreId ?? undefined);
      if (!result.success) return null;
      return result.quota!;
    },
    staleTime: 30_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const notImported = useMemo(() => products.filter(p => !p.alreadyImported), [products]);
  const alreadyImportedCount = products.length - notImported.length;

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      if (hideImported && p.alreadyImported) return false;
      if (searchFilter && !p.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    }),
    [products, searchFilter, hideImported]
  );

  const toggleProduct = (sourceUrl: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(sourceUrl)) next.delete(sourceUrl);
      else next.add(sourceUrl);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedProducts.size === notImported.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(notImported.map(p => p.sourceUrl)));
    }
  };

  const toggleDescription = (sourceUrl: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(sourceUrl)) next.delete(sourceUrl);
      else next.add(sourceUrl);
      return next;
    });
  };

  const platformLabel = platform === 'clearlydev' ? 'ClearlyDev' : platform === 'builtbybit' ? 'BuiltByBit' : platform;
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

  // Build overrides map for only selected products that have overrides
  const getActiveOverrides = () => {
    const active: Record<string, string> = {};
    for (const url of selectedProducts) {
      if (categoryOverrides[url]) active[url] = categoryOverrides[url];
    }
    return Object.keys(active).length > 0 ? active : undefined;
  };

  // Quota cost breakdown
  const quotaBreakdown = useMemo(() => {
    if (!quotaData) return null;
    const count = selectedProducts.size;
    const freeAvailable = quotaData.remainingFree;
    const freeUsed = Math.min(count, freeAvailable);
    const paidCount = Math.max(0, count - freeAvailable);
    const paidCost = paidCount * 0.10;
    const canAfford = paidCost <= quotaData.creditBalance;
    return { freeUsed, paidCount, paidCost, canAfford, creditBalance: quotaData.creditBalance };
  }, [quotaData, selectedProducts.size]);

  const handleImportClick = () => {
    if (selectedProducts.size > 5) {
      setConfirmOpen(true);
    } else {
      onImport(Array.from(selectedProducts), downloadImages, getActiveOverrides());
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <Globe className="h-3 w-3" />
            {platformLabel}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {products.length} products found
            {alreadyImportedCount > 0 && (
              <span className="text-warning ml-1">({alreadyImportedCount} already imported)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {alreadyImportedCount > 0 && (
            <div className="flex items-center gap-2">
              <Switch id="hide-imported" checked={hideImported} onCheckedChange={setHideImported} />
              <Label htmlFor="hide-imported" className="text-xs flex items-center gap-1 cursor-pointer">
                <EyeOff className="h-3 w-3" />
                Hide imported
              </Label>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch id="download-images" checked={downloadImages} onCheckedChange={setDownloadImages} />
            <Label htmlFor="download-images" className="text-xs flex items-center gap-1 cursor-pointer">
              <Image className="h-3 w-3" />
              Download images
            </Label>
          </div>
        </div>
      </div>

      {/* Search & actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {selectedProducts.size === notImported.length ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {/* Product grid */}
      <ScrollArea className="h-[420px] rounded-lg border">
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {filteredProducts.map((product) => {
            const isSelected = selectedProducts.has(product.sourceUrl);
            const isImported = product.alreadyImported;
            const plainDesc = product.description ? stripHtml(product.description) : '';
            const isExpanded = expandedDescriptions.has(product.sourceUrl);
            const override = categoryOverrides[product.sourceUrl];
            const matchedCat = categories?.find(c => c.id === (override || product.suggestedCategoryId));

            return (
              <div
                key={product.sourceUrl}
                className={`group relative flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                  isImported
                    ? 'opacity-50 cursor-not-allowed border-muted'
                    : isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:border-muted-foreground/30 hover:bg-muted/30'
                }`}
              >
                <div
                  className="flex gap-3 cursor-pointer"
                  onClick={() => !isImported && toggleProduct(product.sourceUrl)}
                >
                  {/* Image preview */}
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <ImageOff className={`h-5 w-5 text-muted-foreground/40 ${product.images?.[0] ? 'hidden' : ''}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleProduct(product.sourceUrl)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isImported}
                        className="shrink-0 mt-0.5"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {product.price > 0 && (
                        <span className="text-xs font-medium text-primary">
                          {formatGBP(product.price)}
                        </span>
                      )}
                      {product.price === 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free</Badge>
                      )}
                      {isImported && (
                        <Badge variant="outline" className="text-[10px] text-warning border-warning/40 px-1.5 py-0">
                          Already imported
                        </Badge>
                      )}
                      {matchedCat && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <Tag className="h-2.5 w-2.5" />
                          {matchedCat.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable description & category override */}
                {(plainDesc || (categories && categories.length > 0)) && isSelected && !isImported && (
                  <div className="space-y-2 pt-1 border-t border-border/50">
                    {plainDesc && (
                      <Collapsible open={isExpanded} onOpenChange={() => toggleDescription(product.sourceUrl)}>
                        <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          {isExpanded ? 'Hide description' : 'Preview description'}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-6 bg-muted/30 rounded p-2">
                            {plainDesc.substring(0, 500)}{plainDesc.length > 500 ? '…' : ''}
                          </p>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {categories && categories.length > 0 && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Select
                          value={override || product.suggestedCategoryId || ''}
                          onValueChange={(val) =>
                            setCategoryOverrides(prev => ({ ...prev, [product.sourceUrl]: val }))
                          }
                        >
                          <SelectTrigger className="h-7 text-[11px] flex-1">
                            <SelectValue placeholder="Assign category…" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.filter(c => !c.parent_id).map((cat) => (
                              <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Quota info banner */}
      {quotaData && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4" />
            <span>
              <strong className="text-foreground">{quotaData.remainingFree}</strong>/{quotaData.freeLimit} free imports remaining this month
            </span>
          </div>
          {quotaBreakdown && quotaBreakdown.paidCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs">
                {quotaBreakdown.freeUsed > 0 && <span className="text-primary">{quotaBreakdown.freeUsed} free</span>}
                {quotaBreakdown.freeUsed > 0 && ' + '}
                <span className="font-medium">{quotaBreakdown.paidCount} × 10p ({formatGBP(quotaBreakdown.paidCost)})</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Insufficient credits warning */}
      {quotaBreakdown && quotaBreakdown.paidCount > 0 && !quotaBreakdown.canAfford && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You need {formatGBP(quotaBreakdown.paidCost)} in credits but only have {formatGBP(quotaBreakdown.creditBalance)}.
            </span>
            <Link to="/credits" className="text-xs font-medium underline underline-offset-2 ml-2 shrink-0">
              Add Credits
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedProducts.size} selected
          </span>
          <Button
            onClick={handleImportClick}
            disabled={selectedProducts.size === 0 || (quotaBreakdown !== null && quotaBreakdown.paidCount > 0 && !quotaBreakdown.canAfford)}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Import {selectedProducts.size > 0 ? `(${selectedProducts.size})` : ''}
            {quotaBreakdown && quotaBreakdown.paidCount > 0 && quotaBreakdown.canAfford && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {formatGBP(quotaBreakdown.paidCost)}
              </Badge>
            )}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Confirmation dialog for large imports */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import {selectedProducts.size} products?</AlertDialogTitle>
            <AlertDialogDescription>
              This will import {selectedProducts.size} products{downloadImages ? ' including downloading all images' : ''}.
              {quotaBreakdown && quotaBreakdown.paidCount > 0 && (
                <> {quotaBreakdown.freeUsed} will be free, and {quotaBreakdown.paidCount} will cost {formatGBP(quotaBreakdown.paidCost)} in Eclipse Credits (10p each).</>
              )}
              {' '}This may take a few minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onImport(Array.from(selectedProducts), downloadImages, getActiveOverrides())}>
              Start Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
