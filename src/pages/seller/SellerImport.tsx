import { useState, useEffect } from 'react';
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
import { 
  Loader2, Download, ExternalLink, CheckCircle, AlertCircle, 
  Info, Package, Image, History, AlertTriangle, Sparkles 
} from 'lucide-react';
import { productImportApi, ExternalProduct, ImportHistoryItem } from '@/lib/api/productImport';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useToast } from '@/hooks/use-toast';

export default function SellerImport() {
  const navigate = useNavigate();
  const { store } = useSellerStatus();
  const { toast } = useToast();
  
  const [storeUrl, setStoreUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ExternalProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadImages, setDownloadImages] = useState(true);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);

  const supportedPlatforms = productImportApi.getSupportedPlatforms();

  // Load import history on mount
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

      setProducts(result.products || []);
      setPlatform(result.platform || null);
      
      if (!result.products?.length) {
        setError('No products found. Make sure you entered a valid store page URL.');
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
      if (next.has(sourceUrl)) {
        next.delete(sourceUrl);
      } else {
        next.add(sourceUrl);
      }
      return next;
    });
  };

  const toggleAll = () => {
    const notImported = products.filter(p => !p.alreadyImported);
    if (selectedProducts.size === notImported.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(notImported.map(p => p.sourceUrl)));
    }
  };

  const handleImportSelected = async () => {
    const urls = Array.from(selectedProducts);
    if (urls.length === 0) {
      toast({
        title: 'No products selected',
        description: 'Please select at least one product to import',
        variant: 'destructive',
      });
      return;
    }

    // Single product - go directly to editor
    if (urls.length === 1) {
      setImportProgress({ current: 0, total: 1 });
      
      try {
        const detailResult = await productImportApi.getProductDetails(urls[0], downloadImages);
        
        if (detailResult.success && detailResult.product) {
          navigate('/seller/products/new', {
            state: {
              importedProduct: detailResult.product,
              importSource: platform,
            },
          });
        } else {
          toast({
            title: 'Import failed',
            description: detailResult.error || 'Could not fetch product details',
            variant: 'destructive',
          });
        }
      } catch (err) {
        toast({
          title: 'Import failed',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
      } finally {
        setImportProgress(null);
      }
      return;
    }

    // Multiple products - bulk import
    setImportProgress({ current: 0, total: urls.length });

    try {
      const result = await productImportApi.bulkImport(urls, downloadImages);
      
      if (result.success && result.results) {
        const successful = result.results.filter(r => r.success);
        
        if (successful.length === 1) {
          // Only one succeeded, go to editor
          navigate('/seller/products/new', {
            state: {
              importedProduct: successful[0].product,
              importSource: platform,
            },
          });
        } else if (successful.length > 1) {
          // Multiple succeeded, show summary and option to create
          toast({
            title: `Imported ${successful.length} products`,
            description: `${result.failed} failed. Products are ready to create.`,
          });
          
          // Navigate to first product for now
          navigate('/seller/products/new', {
            state: {
              importedProduct: successful[0].product,
              importSource: platform,
              bulkImportResults: successful.map(r => r.product),
            },
          });
        } else {
          toast({
            title: 'All imports failed',
            description: 'Could not import any products',
            variant: 'destructive',
          });
        }
        
        // Refresh history
        loadHistory();
      } else {
        toast({
          title: 'Import failed',
          description: result.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Import failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setImportProgress(null);
    }
  };

  const notImportedCount = products.filter(p => !p.alreadyImported).length;
  const alreadyImportedCount = products.length - notImportedCount;

  return (
    <SellerLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Import Products</h1>
          <p className="text-muted-foreground">
            Import your existing products from ClearlyDev or BuiltByBit
          </p>
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
            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>How it works:</strong> Enter your store URL from ClearlyDev or BuiltByBit.
                We'll match your Discord username to verify ownership, then let you import product 
                metadata (name, description, price, images). Files must be uploaded separately.
              </AlertDescription>
            </Alert>

            {/* Ownership Confirmation */}
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="ownership-confirm"
                checked={ownershipConfirmed}
                onCheckedChange={(checked) => setOwnershipConfirmed(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="ownership-confirm" className="text-sm font-medium leading-none cursor-pointer">
                  I confirm ownership of this content
                </Label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, I confirm that I am the rightful owner of the products I am importing 
                  and have the legal right to use all associated names, descriptions, and images. I understand 
                  that importing content I do not own may violate intellectual property laws and platform terms of service.
                </p>
              </div>
            </div>

            {/* Supported Platforms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Supported Platforms
                </CardTitle>
                <CardDescription>
                  Enter your store or seller profile URL from one of these platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {supportedPlatforms.map(p => (
                    <div 
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.baseUrl}...</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {p.id === 'clearlydev' ? 'Full Support' : 'Beta'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-url">Store URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="store-url"
                      placeholder="https://clearlydev.com/store/your-store"
                      value={storeUrl}
                      onChange={(e) => setStoreUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && ownershipConfirmed && handleSearch()}
                      disabled={isLoading || !ownershipConfirmed}
                    />
                    <Button onClick={handleSearch} disabled={isLoading || !ownershipConfirmed}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        'Find Products'
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Products List */}
            {products.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Found {products.length} Products
                      </CardTitle>
                      <CardDescription>
                        From {platform === 'clearlydev' ? 'ClearlyDev' : 'BuiltByBit'}
                        {alreadyImportedCount > 0 && (
                          <span className="ml-2 text-warning">
                            ({alreadyImportedCount} already imported)
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="download-images"
                          checked={downloadImages}
                          onCheckedChange={setDownloadImages}
                        />
                        <Label htmlFor="download-images" className="text-sm flex items-center gap-1">
                          <Image className="h-3 w-3" />
                          Auto-download images
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={toggleAll}>
                      {selectedProducts.size === notImportedCount ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button 
                      onClick={handleImportSelected}
                      disabled={selectedProducts.size === 0 || importProgress !== null}
                    >
                      {importProgress !== null ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          Import Selected ({selectedProducts.size})
                        </>
                      )}
                    </Button>
                  </div>
                  {importProgress && (
                    <Progress 
                      value={(importProgress.current / importProgress.total) * 100} 
                      className="mt-2"
                    />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {products.map((product) => (
                      <div
                        key={product.sourceUrl}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          product.alreadyImported 
                            ? 'border-warning/50 bg-warning/5 opacity-60'
                            : selectedProducts.has(product.sourceUrl) 
                              ? 'border-primary bg-primary/5 cursor-pointer' 
                              : 'hover:bg-muted/50 cursor-pointer'
                        }`}
                        onClick={() => !product.alreadyImported && toggleProduct(product.sourceUrl)}
                      >
                        <Checkbox
                          checked={selectedProducts.has(product.sourceUrl)}
                          onCheckedChange={() => toggleProduct(product.sourceUrl)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={product.alreadyImported}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{product.name}</p>
                            {product.alreadyImported && (
                              <Badge variant="outline" className="text-warning border-warning/50">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Already imported
                              </Badge>
                            )}
                            {product.suggestedCategoryId && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Category matched
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {product.sourceUrl}
                          </p>
                        </div>
                        {selectedProducts.has(product.sourceUrl) && (
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <a
                          href={product.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && products.length === 0 && !error && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Download className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-1">No products scanned yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your store URL above to find products to import
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Import History
                </CardTitle>
                <CardDescription>
                  Products you've previously imported
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No imports yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                      >
                        {item.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-success shrink-0" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.source_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.source_platform} • {new Date(item.imported_at).toLocaleDateString()}
                            {item.error_message && (
                              <span className="text-destructive ml-2">{item.error_message}</span>
                            )}
                          </p>
                        </div>
                        <Badge variant={item.status === 'completed' ? 'default' : 'destructive'}>
                          {item.status}
                        </Badge>
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
}
