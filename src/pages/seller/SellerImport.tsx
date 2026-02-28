import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Download, ExternalLink, CheckCircle, AlertCircle, 
  Info, Package, Image, History, AlertTriangle, Sparkles,
  ArrowRight, ArrowLeft, Search, XCircle, RefreshCw,
  Shield, Globe, ChevronRight, ImageOff
} from 'lucide-react';
import { productImportApi, ExternalProduct, ImportHistoryItem } from '@/lib/api/productImport';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

type ImportStep = 'setup' | 'select' | 'importing' | 'complete';

interface ImportResult {
  url: string;
  name: string;
  success: boolean;
  error?: string;
}

export default function SellerImport() {
  const navigate = useNavigate();
  const { store } = useSellerStatus();
  const { toast } = useToast();
  
  // Step state
  const [step, setStep] = useState<ImportStep>('setup');
  
  // Setup step
  const [storeUrl, setStoreUrl] = useState('');
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Select step
  const [products, setProducts] = useState<ExternalProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<string | null>(null);
  const [downloadImages, setDownloadImages] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Import step
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  // History
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const supportedPlatforms = productImportApi.getSupportedPlatforms();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const result = await productImportApi.getHistory();
      if (result.success && result.imports) {
        setHistory(result.imports);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSearch = async () => {
    if (!storeUrl.trim()) {
      setError('Please enter a store URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProducts([]);
    setSelectedProducts(new Set());

    try {
      const result = await productImportApi.listProducts(storeUrl);
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch products');
        return;
      }

      const found = result.products || [];
      setProducts(found);
      setPlatform(result.platform || null);
      
      if (!found.length) {
        setError('No products found. Make sure you entered a valid store page URL.');
      } else {
        // Auto-select all non-imported products
        const available = found.filter(p => !p.alreadyImported);
        setSelectedProducts(new Set(available.map(p => p.sourceUrl)));
        setStep('select');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProduct = (sourceUrl: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(sourceUrl)) next.delete(sourceUrl);
      else next.add(sourceUrl);
      return next;
    });
  };

  const notImported = products.filter(p => !p.alreadyImported);
  const alreadyImportedCount = products.length - notImported.length;

  const toggleAll = () => {
    if (selectedProducts.size === notImported.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(notImported.map(p => p.sourceUrl)));
    }
  };

  const filteredProducts = products.filter(p =>
    !searchFilter || p.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleImport = async () => {
    const urls = Array.from(selectedProducts);
    if (urls.length === 0) return;

    setStep('importing');
    setIsImporting(true);
    setImportResults([]);
    setImportProgress(0);

    try {
      if (urls.length === 1) {
        // Single product
        const detailResult = await productImportApi.getProductDetails(urls[0], downloadImages);
        const productName = products.find(p => p.sourceUrl === urls[0])?.name || 'Product';
        
        if (detailResult.success && detailResult.product) {
          setImportResults([{ url: urls[0], name: productName, success: true }]);
          setImportProgress(100);
        } else {
          setImportResults([{ url: urls[0], name: productName, success: false, error: detailResult.error }]);
          setImportProgress(100);
        }
      } else {
        // Bulk import
        const result = await productImportApi.bulkImport(urls, downloadImages);
        
        if (result.success && result.results) {
          const mapped = result.results.map(r => ({
            url: r.url,
            name: r.product?.name || products.find(p => p.sourceUrl === r.url)?.name || 'Unknown',
            success: r.success,
            error: r.error,
          }));
          setImportResults(mapped);
        } else {
          setImportResults(urls.map(url => ({
            url,
            name: products.find(p => p.sourceUrl === url)?.name || 'Unknown',
            success: false,
            error: result.error || 'Import failed',
          })));
        }
        setImportProgress(100);
      }
      
      loadHistory();
      setStep('complete');
    } catch (err) {
      setImportResults(urls.map(url => ({
        url,
        name: products.find(p => p.sourceUrl === url)?.name || 'Unknown',
        success: false,
        error: 'Unexpected error',
      })));
      setStep('complete');
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setStep('setup');
    setProducts([]);
    setSelectedProducts(new Set());
    setImportResults([]);
    setImportProgress(0);
    setError(null);
    setStoreUrl('');
    setSearchFilter('');
    setOwnershipConfirmed(false);
  };

  const successCount = importResults.filter(r => r.success).length;
  const failCount = importResults.filter(r => !r.success).length;

  const platformLabel = platform === 'clearlydev' ? 'ClearlyDev' : platform === 'builtbybit' ? 'BuiltByBit' : platform;

  return (
    <SellerLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Import Products</h1>
            <p className="text-muted-foreground">
              Bring your existing products from other platforms
            </p>
          </div>
          {step !== 'setup' && step !== 'importing' && (
            <Button variant="outline" size="sm" onClick={resetImport} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              New Import
            </Button>
          )}
        </div>

        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import" className="gap-2">
              <Download className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
              {history.length > 0 && (
                <Badge variant="secondary" className="ml-1">{history.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            {/* Progress Steps Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {(['setup', 'select', 'importing', 'complete'] as ImportStep[]).map((s, i) => {
                const labels = ['Setup', 'Select', 'Importing', 'Done'];
                const isCurrent = s === step;
                const isPast = ['setup', 'select', 'importing', 'complete'].indexOf(step) > i;
                return (
                  <div key={s} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isCurrent ? 'bg-primary text-primary-foreground' 
                      : isPast ? 'bg-primary/10 text-primary' 
                      : 'bg-muted text-muted-foreground'
                    }`}>
                      {isPast && !isCurrent && <CheckCircle className="h-3 w-3" />}
                      {labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Setup */}
              {step === 'setup' && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  {/* Ownership Confirmation */}
                  <Card className={`border-2 transition-colors ${ownershipConfirmed ? 'border-primary/30 bg-primary/5' : 'border-dashed'}`}>
                    <CardContent className="pt-5">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="ownership-confirm"
                          checked={ownershipConfirmed}
                          onCheckedChange={(checked) => setOwnershipConfirmed(checked === true)}
                          className="mt-0.5"
                        />
                        <div className="space-y-1.5">
                          <Label htmlFor="ownership-confirm" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            I confirm ownership of this content
                          </Label>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            By checking this box, I confirm that I am the rightful owner of the products I am importing 
                            and have the legal right to use all associated names, descriptions, and images.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* URL Input */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Enter your store URL
                      </CardTitle>
                      <CardDescription>
                        We support ClearlyDev and BuiltByBit stores
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Platform chips */}
                      <div className="flex gap-2">
                        {supportedPlatforms.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setStoreUrl(p.baseUrl);
                              setOwnershipConfirmed(ownershipConfirmed);
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                          >
                            <span className="text-sm font-medium">{p.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {p.id === 'clearlydev' ? 'Full' : 'Beta'}
                            </Badge>
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="https://clearlydev.com/store/your-store"
                          value={storeUrl}
                          onChange={(e) => setStoreUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && ownershipConfirmed && handleSearch()}
                          disabled={isLoading || !ownershipConfirmed}
                          className="font-mono text-sm"
                        />
                        <Button 
                          onClick={handleSearch} 
                          disabled={isLoading || !ownershipConfirmed || !storeUrl.trim()}
                          className="gap-2 shrink-0"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Scanning…
                            </>
                          ) : (
                            <>
                              <Search className="h-4 w-4" />
                              Find Products
                            </>
                          )}
                        </Button>
                      </div>

                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {!ownershipConfirmed && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Info className="h-3 w-3" />
                          Confirm ownership above to proceed
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* How it works */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: Search, title: 'Scan', desc: 'We scan your store page to find all products' },
                      { icon: Package, title: 'Select', desc: 'Choose which products to import' },
                      { icon: CheckCircle, title: 'Import', desc: 'Products are created with metadata & images' },
                    ].map(({ icon: Icon, title, desc }) => (
                      <div key={title} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{title}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Select Products */}
              {step === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
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
                          <span className="text-warning ml-1">
                            ({alreadyImportedCount} already imported)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="download-images"
                        checked={downloadImages}
                        onCheckedChange={setDownloadImages}
                      />
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
                                <p className="text-sm font-medium truncate">{product.name}</p>
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
                                    ${product.price.toFixed(2)}
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
                    <Button variant="ghost" onClick={() => setStep('setup')} className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {selectedProducts.size} selected
                      </span>
                      <Button 
                        onClick={handleImport} 
                        disabled={selectedProducts.size === 0}
                        className="gap-2"
                      >
                        Import {selectedProducts.size > 0 ? `(${selectedProducts.size})` : ''}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Importing */}
              {step === 'importing' && (
                <motion.div
                  key="importing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card>
                    <CardContent className="py-16 text-center space-y-6">
                      <div className="relative mx-auto w-16 h-16">
                        <Loader2 className="h-16 w-16 animate-spin text-primary/30" />
                        <Download className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Importing products…</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          Scraping product details{downloadImages ? ', downloading images,' : ''} and creating product listings. This may take a moment.
                        </p>
                      </div>
                      <div className="max-w-xs mx-auto">
                        <Progress value={importProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 4: Complete */}
              {step === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Summary card */}
                  <Card className={successCount > 0 ? 'border-success/30' : 'border-destructive/30'}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        {successCount > 0 ? (
                          <div className="p-3 rounded-full bg-success/10">
                            <CheckCircle className="h-8 w-8 text-success" />
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
                              : 'Import failed'
                            }
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
                  {importResults.length > 1 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Import Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {importResults.map((result, i) => (
                            <div key={i} className="flex items-center gap-3 py-2">
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              )}
                              <span className="text-sm truncate flex-1">{result.name}</span>
                              {result.error && (
                                <span className="text-xs text-destructive truncate max-w-[200px]">
                                  {result.error}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={resetImport} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Import More
                    </Button>
                    {successCount > 0 && (
                      <Button onClick={() => navigate('/seller/products')} className="gap-2">
                        <Package className="h-4 w-4" />
                        View My Products
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Import History
                    </CardTitle>
                    <CardDescription>
                      Products you've previously imported
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadHistory} disabled={loadingHistory}>
                    <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
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
                            <CheckCircle className="h-4 w-4 text-success shrink-0" />
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
                                  <span>${item.source_price.toFixed(2)}</span>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
}
