import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Image, Globe, Sparkles, ArrowLeft, ArrowRight, ImageOff
} from 'lucide-react';
import { ExternalProduct } from '@/lib/api/productImport';

interface ImportSelectStepProps {
  products: ExternalProduct[];
  platform: string | null;
  onBack: () => void;
  onImport: (urls: string[], downloadImages: boolean) => void;
}

export function ImportSelectStep({ products, platform, onBack, onImport }: ImportSelectStepProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(() => {
    const available = products.filter(p => !p.alreadyImported);
    return new Set(available.map(p => p.sourceUrl));
  });
  const [downloadImages, setDownloadImages] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const notImported = useMemo(() => products.filter(p => !p.alreadyImported), [products]);
  const alreadyImportedCount = products.length - notImported.length;

  const filteredProducts = useMemo(() =>
    products.filter(p =>
      !searchFilter || p.name.toLowerCase().includes(searchFilter.toLowerCase())
    ),
    [products, searchFilter]
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

  const platformLabel = platform === 'clearlydev' ? 'ClearlyDev' : platform === 'builtbybit' ? 'BuiltByBit' : platform;

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
        <div className="flex items-center gap-2">
          <Switch id="download-images" checked={downloadImages} onCheckedChange={setDownloadImages} />
          <Label htmlFor="download-images" className="text-xs flex items-center gap-1 cursor-pointer">
            <Image className="h-3 w-3" />
            Download images
          </Label>
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

            return (
              <div
                key={product.sourceUrl}
                onClick={() => !isImported && toggleProduct(product.sourceUrl)}
                className={`group relative flex gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isImported
                    ? 'opacity-50 cursor-not-allowed border-muted'
                    : isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:border-muted-foreground/30 hover:bg-muted/30'
                }`}
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {product.description.replace(/<[^>]*>/g, '').substring(0, 80)}
                        </p>
                      )}
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProduct(product.sourceUrl)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={isImported}
                      className="shrink-0 mt-0.5"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {product.price > 0 && (
                      <span className="text-xs font-medium text-primary">
                        £{product.price.toFixed(2)}
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
                    {product.suggestedCategoryId && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        Matched
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

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
            onClick={() => onImport(Array.from(selectedProducts), downloadImages)}
            disabled={selectedProducts.size === 0}
            className="gap-2"
          >
            Import {selectedProducts.size > 0 ? `(${selectedProducts.size})` : ''}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
