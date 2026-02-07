import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, ExternalLink, CheckCircle, AlertCircle, Info, Package } from 'lucide-react';
import { productImportApi, ExternalProduct } from '@/lib/api/productImport';
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
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  const supportedPlatforms = productImportApi.getSupportedPlatforms();

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
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.sourceUrl)));
    }
  };

  const handleImportSelected = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'No products selected',
        description: 'Please select at least one product to import',
        variant: 'destructive',
      });
      return;
    }

    // For now, navigate to product editor with pre-fill data
    // In full implementation, we'd fetch details for each and create drafts
    const firstProduct = products.find(p => selectedProducts.has(p.sourceUrl));
    if (firstProduct) {
      setLoadingDetails(new Set([firstProduct.sourceUrl]));
      
      try {
        const detailResult = await productImportApi.getProductDetails(firstProduct.sourceUrl);
        
        if (detailResult.success && detailResult.product) {
          // Navigate to product editor with imported data
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
        setLoadingDetails(new Set());
      }
    }
  };

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

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> Enter your store URL from ClearlyDev or BuiltByBit.
            We'll match your Discord username to verify ownership, then let you import product 
            metadata (name, description, price, images). You'll need to upload the actual files separately.
          </AlertDescription>
        </Alert>

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
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={isLoading}
                />
                <Button onClick={handleSearch} disabled={isLoading}>
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
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button 
                    onClick={handleImportSelected}
                    disabled={selectedProducts.size === 0 || loadingDetails.size > 0}
                  >
                    {loadingDetails.size > 0 ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Import Selected ({selectedProducts.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {products.map((product) => (
                  <div
                    key={product.sourceUrl}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedProducts.has(product.sourceUrl) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleProduct(product.sourceUrl)}
                  >
                    <Checkbox
                      checked={selectedProducts.has(product.sourceUrl)}
                      onCheckedChange={() => toggleProduct(product.sourceUrl)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
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
      </div>
    </SellerLayout>
  );
}
