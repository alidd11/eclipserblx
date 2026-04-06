import { useState } from 'react';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
 Loader2, AlertCircle, Info, Search, Shield, Globe, CheckCircle, Package
} from 'lucide-react';
import { productImportApi, ExternalProduct } from '@/lib/api/productImport';

interface ImportSetupStepProps {
 onProductsFound: (products: ExternalProduct[], platform: string | null) => void;
}

const URL_PATTERNS = [
 { pattern: /clearlydev\.com\/store\/.+/i, platform: 'clearlydev' },
 { pattern: /builtbybit\.com\/members\/.+/i, platform: 'builtbybit' },
 { pattern: /payhip\.com\/[A-Za-z0-9]/i, platform: 'payhip' },
];

function validateStoreUrl(url: string): { valid: boolean; error?: string } {
 const trimmed = url.trim();
 if (!trimmed) return { valid: false, error: 'Please enter a store URL' };

 try {
 const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
 const matchesPlatform = URL_PATTERNS.some(({ pattern }) => pattern.test(parsed.href));
 if (!matchesPlatform) {
 return {
 valid: false,
 error: 'URL doesn\'t match a supported platform. Use a ClearlyDev, BuiltByBit, or Payhip store URL.',
 };
 }
 return { valid: true };
 } catch {
 return { valid: false, error: 'Please enter a valid URL' };
 }
}

export function ImportSetupStep({ onProductsFound }: ImportSetupStepProps) {
 const { activeStoreId } = useActiveStore();
 const [storeUrl, setStoreUrl] = useState('');
 const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const supportedPlatforms = productImportApi.getSupportedPlatforms();

 const handleSearch = async () => {
 const validation = validateStoreUrl(storeUrl);
 if (!validation.valid) {
 setError(validation.error!);
 return;
 }

 setIsLoading(true);
 setError(null);

 try {
 const result = await productImportApi.listProducts(storeUrl, activeStoreId ?? undefined);

 if (!result.success) {
 setError(result.error || 'Failed to fetch products');
 return;
 }

 const found = result.products || [];
 if (!found.length) {
 setError('No products found. Make sure you entered a valid store page URL.');
 } else {
 onProductsFound(found, result.platform || null);
 }
 } catch {
 setError('An unexpected error occurred. Please try again.');
 } finally {
 setIsLoading(false);
 }
 };

 // Live URL hint
 const urlHint = storeUrl.trim()
 ? validateStoreUrl(storeUrl).valid
 ? null
 : validateStoreUrl(storeUrl).error
 : null;

 return (
 <div className="space-y-5">
 {/* Ownership Confirmation */}
 <div className={cn("border border-border rounded-xl overflow-hidden", `border-2 transition-colors ${ownershipConfirmed ? 'border-primary/30 bg-primary/5' : 'border-dashed'}`}>
 <div className="p-4 pt-5">
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
 </div>
 </div>

 {/* URL Input */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
 <h3 className="font-semibold text-sm text-base flex items-center gap-2">
 <Globe className="h-4 w-4" />
 Enter your store URL
 </h3>
 <p className="text-sm text-muted-foreground">We support ClearlyDev, BuiltByBit, and Payhip stores</p>
 </div>
 <div className="p-4 space-y-4">
 <div className="flex gap-2">
 {supportedPlatforms.map(p => (
 <button
 key={p.id}
 type="button"
 onClick={() => setStoreUrl(p.baseUrl)}
 className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-left"
 >
 <span className="text-sm font-medium">{p.name}</span>
 <Badge variant="outline" className="text-[10px] px-1.5">
 {p.id === 'clearlydev' ? 'Full' : p.id === 'payhip' ? 'New' : 'Beta'}
 </Badge>
 </button>
 ))}
 </div>

 <div className="space-y-1.5">
 <div className="flex gap-2">
 <Input
 placeholder="https://clearlydev.com/store/your-store or https://payhip.com/YourStore"
 value={storeUrl}
 onChange={(e) => { setStoreUrl(e.target.value); setError(null); }}
 onKeyDown={(e) => e.key === 'Enter' && ownershipConfirmed && handleSearch()}
 disabled={isLoading || !ownershipConfirmed}
 className={`font-mono text-sm ${urlHint && storeUrl.length > 10 ? 'border-warning focus-visible:ring-warning' : ''}`}
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
 {urlHint && storeUrl.length > 10 && !error && (
 <p className="text-xs text-warning flex items-center gap-1">
 <AlertCircle className="h-3 w-3" />
 {urlHint}
 </p>
 )}
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
 </div>
 </div>

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
 </div>
 );
}
