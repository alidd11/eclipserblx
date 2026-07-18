import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
 Coins, ArrowLeft, ArrowRight, Check, Megaphone, Target, Users,
 Wallet, Image as ImageIcon, FileCheck, Monitor, Smartphone, Tablet,
 MousePointerClick, Eye, ShoppingCart, LayoutGrid, Search, Tag, Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatGBP } from '@/lib/formatters';

const STEPS = ['Product', 'Goal', 'Audience', 'Budget', 'Creative', 'Review'] as const;
type Step = typeof STEPS[number];

const STEP_ICONS = [Megaphone, Target, Users, Wallet, ImageIcon, FileCheck];

const GOALS = [
 { id: 'clicks', label: 'Clicks', icon: MousePointerClick, desc: 'Drive traffic to your product page' },
 { id: 'impressions', label: 'Impressions', icon: Eye, desc: 'Maximise visibility across the marketplace' },
 { id: 'sales', label: 'Sales', icon: ShoppingCart, desc: 'Optimise for purchases and conversions' },
] as const;

const DEVICES = [
 { id: 'desktop', label: 'Desktop', icon: Monitor },
 { id: 'mobile', label: 'Mobile', icon: Smartphone },
 { id: 'tablet', label: 'Tablet', icon: Tablet },
] as const;

const COUNTRIES = [
 'United Kingdom', 'United States', 'Canada', 'Australia', 'Germany',
 'France', 'Netherlands', 'Brazil', 'Mexico', 'India',
];

const PLACEMENT_ZONES = [
 { id: 'homepage', label: 'Homepage Hero', icon: Home, desc: 'Featured banner on the homepage' },
 { id: 'products_listing', label: 'Products Page', icon: LayoutGrid, desc: 'Injected into product grid at position 3' },
 { id: 'search_results', label: 'Search Results', icon: Search, desc: 'Shown at position 2 in search results' },
 { id: 'product_detail', label: 'Product Detail', icon: Tag, desc: 'Sponsored recommendation on product pages' },
 { id: 'category', label: 'Category Pages', icon: LayoutGrid, desc: 'Top of category-filtered results' },
] as const;

interface CreateCampaignWizardProps {
 onClose: () => void;
}

export function CreateCampaignWizard({ onClose }: CreateCampaignWizardProps) {
 const { user } = useAuth();
 const { store } = useSellerStatus();
 const { balance } = useCredits();
 const queryClient = useQueryClient();

 const [step, setStep] = useState(0);
 const [campaignName, setCampaignName] = useState('');
 const [productId, setProductId] = useState('');
 const [goal, setGoal] = useState<string>('clicks');
 const [targetDevices, setTargetDevices] = useState<string[]>(['desktop', 'mobile', 'tablet']);
 const [targetCountries, setTargetCountries] = useState<string[]>([]);
 const [pricingModel, setPricingModel] = useState<'cpc' | 'cpm'>('cpc');
 const [cpcBid, setCpcBid] = useState(0.05);
 const [cpmBid, setCpmBid] = useState(1.00);
 const [totalBudget, setTotalBudget] = useState(10);
 const [dailyBudgetLimit, setDailyBudgetLimit] = useState<number | null>(null);
 const [durationDays, setDurationDays] = useState(7);
 const [selectedImages, setSelectedImages] = useState<string[]>([]);
 const [placementZones, setPlacementZones] = useState<string[]>(['homepage']);

 const { data: products } = useQuery({
 queryKey: ['seller-products-for-campaign', store?.id],
 queryFn: async () => {
 if (!store?.id) return [];
 const { data, error } = await supabase
 .from('products')
 .select('id, name, images, category_id, moderation_status')
 .eq('store_id', store.id)
 .eq('is_active', true)
 .eq('moderation_status', 'approved')
 .order('name');
 if (error) throw error;
 return data || [];
 },
 enabled: !!store?.id,
 });

 const selectedProduct = products?.find(p => p.id === productId);
 const insufficientBalance = totalBudget > balance;

 // Estimated metrics
 const estimatedImpressions = pricingModel === 'cpm'
 ? Math.floor((totalBudget / cpmBid) * 1000)
 : Math.floor(totalBudget / cpcBid * 20); // rough estimate: 20 impressions per click
 const estimatedClicks = pricingModel === 'cpc'
 ? Math.floor(totalBudget / cpcBid)
 : Math.floor(estimatedImpressions * 0.02); // 2% CTR estimate

 const createCampaign = useMutation({
 mutationFn: async () => {
 if (!user || !store) throw new Error('Not authenticated');
 if (!productId) throw new Error('Select a product');
 if (totalBudget < 5) throw new Error('Minimum budget is 5 credits');
 if (insufficientBalance) throw new Error('Insufficient credits');
 if (placementZones.length === 0) throw new Error('Select at least one placement zone');

 const { error } = await supabase.from('product_promotions').insert({
 store_id: store.id,
 product_id: productId,
 user_id: user.id,
 slot_type: 'featured', // backward compat
 max_bid: pricingModel === 'cpc' ? cpcBid : cpmBid,
 current_bid: pricingModel === 'cpc' ? cpcBid : cpmBid,
 category_id: selectedProduct?.category_id || null,
 status: 'active',
 campaign_name: campaignName || selectedProduct?.name || 'Untitled Campaign',
 goal,
 target_devices: targetDevices,
 target_countries: targetCountries.length > 0 ? targetCountries : null,
 duration_days: durationDays,
 creative_images: selectedImages.length > 0 ? selectedImages : null,
 pricing_model: pricingModel,
 cpc_bid: pricingModel === 'cpc' ? cpcBid : null,
 cpm_bid: pricingModel === 'cpm' ? cpmBid : null,
 total_budget: totalBudget,
 daily_budget_limit: dailyBudgetLimit,
 placement_zones: placementZones,
 });
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['seller-promotions'] });
 toast.success('Campaign is now live! Your ads will start appearing immediately.');
 onClose();
 },
 onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create campaign'),
 });

 const toggleDevice = (id: string) => {
 setTargetDevices(prev =>
 prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
 );
 };

 const toggleCountry = (c: string) => {
 setTargetCountries(prev =>
 prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
 );
 };

 const toggleZone = (id: string) => {
 setPlacementZones(prev =>
 prev.includes(id) ? prev.filter(z => z !== id) : [...prev, id]
 );
 };

 const canProceed = () => {
 switch (step) {
 case 0: return !!productId;
 case 1: return !!goal;
 case 2: return targetDevices.length > 0;
 case 3: return totalBudget >= 5 && !insufficientBalance && placementZones.length > 0;
 case 4: return true;
 case 5: return true;
 default: return false;
 }
 };

 return (
 <div className="space-y-5">
 {/* Step indicator */}
 <div className="flex items-center gap-1 overflow-x-auto pb-2">
 {STEPS.map((s, i) => {
 const Icon = STEP_ICONS[i];
 const isActive = i === step;
 const isDone = i < step;
 return (
 <button
 key={s}
 onClick={() => i < step && setStep(i)}
 className={cn(
 "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
 isActive && "bg-primary text-primary-foreground",
 isDone && "bg-primary/10 text-primary cursor-pointer",
 !isActive && !isDone && "bg-muted text-muted-foreground"
 )}
 >
 {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
 <span className="hidden sm:inline">{s}</span>
 <span className="sm:hidden">{i + 1}</span>
 </button>
 );
 })}
 </div>

 {/* Step content */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 p-5 space-y-4">
 {/* Step 0: Product */}
 {step === 0 && (
 <>
 <div>
 <h2 className="text-lg font-semibold">Select a Product</h2>
 <p className="text-sm text-muted-foreground">Choose the product you want to promote</p>
 </div>
 <div className="space-y-2">
 <Label>Campaign Name (optional)</Label>
 <Input
 value={campaignName}
 onChange={e => setCampaignName(e.target.value)}
 placeholder="e.g. Summer Sale Push"
 className="max-w-sm"
 />
 </div>
 <div className="space-y-2">
 <Label>Product</Label>
 <div className="grid gap-2 max-h-64 overflow-y-auto">
 {products?.map(p => (
 <button
 key={p.id}
 onClick={() => {
 setProductId(p.id);
 if (p.images?.length && selectedImages.length === 0) {
 setSelectedImages([p.images[0]]);
 }
 }}
 className={cn(
 "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
 productId === p.id
 ? "border-primary bg-primary/5"
 : "border-border hover:border-primary/30 hover:bg-muted/50"
 )}
 >
 <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0">
 {p.images?.[0] ? (
 <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
 ) : (
 <div className="h-full w-full flex items-center justify-center">
 <Megaphone className="h-4 w-4 text-muted-foreground/30" />
 </div>
 )}
 </div>
 <span className="text-sm font-medium truncate">{p.name}</span>
 {productId === p.id && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
 </button>
 ))}
 {(!products || products.length === 0) && (
 <p className="text-sm text-muted-foreground py-4 text-center">
 No approved products found. Products must be approved before promoting.
 </p>
 )}
 </div>
 </div>
 </>
 )}

 {/* Step 1: Goal */}
 {step === 1 && (
 <>
 <div>
 <h2 className="text-lg font-semibold">Campaign Goal</h2>
 <p className="text-sm text-muted-foreground">What do you want to achieve?</p>
 </div>
 <div className="grid gap-3 sm:grid-cols-3">
 {GOALS.map(g => (
 <button
 key={g.id}
 onClick={() => setGoal(g.id)}
 className={cn(
 "flex flex-col items-center gap-3 p-5 rounded-xl border text-center transition-all",
 goal === g.id
 ? "border-primary bg-primary/5 shadow-sm"
 : "border-border hover:border-primary/30 hover:bg-muted/50"
 )}
 >
 <div className={cn(
 "p-3 rounded-full",
 goal === g.id ? "bg-primary/10" : "bg-muted"
 )}>
 <g.icon className={cn("h-6 w-6", goal === g.id ? "text-primary" : "text-muted-foreground")} />
 </div>
 <div>
 <p className="text-sm font-semibold">{g.label}</p>
 <p className="text-[11px] text-muted-foreground mt-0.5">{g.desc}</p>
 </div>
 </button>
 ))}
 </div>
 </>
 )}

 {/* Step 2: Audience */}
 {step === 2 && (
 <>
 <div>
 <h2 className="text-lg font-semibold">Target Audience</h2>
 <p className="text-sm text-muted-foreground">Choose who sees your ad</p>
 </div>
 <div className="space-y-2">
 <Label>Devices</Label>
 <div className="flex gap-2">
 {DEVICES.map(d => (
 <button
 key={d.id}
 onClick={() => toggleDevice(d.id)}
 className={cn(
 "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all",
 targetDevices.includes(d.id)
 ? "border-primary bg-primary/5 text-foreground"
 : "border-border text-muted-foreground hover:border-primary/30"
 )}
 >
 <d.icon className="h-4 w-4" />
 <span className="text-sm font-medium">{d.label}</span>
 </button>
 ))}
 </div>
 </div>
 <div className="space-y-2">
 <Label>Countries (optional — leave empty for worldwide)</Label>
 <div className="flex flex-wrap gap-1.5">
 {COUNTRIES.map(c => (
 <button
 key={c}
 onClick={() => toggleCountry(c)}
 className={cn(
 "px-3 py-1 rounded-full text-xs font-medium border transition-all",
 targetCountries.includes(c)
 ? "border-primary bg-primary/10 text-primary"
 : "border-border text-muted-foreground hover:border-primary/30"
 )}
 >
 {c}
 </button>
 ))}
 </div>
 {targetCountries.length === 0 && (
 <p className="text-[11px] text-muted-foreground">🌍 Targeting all countries</p>
 )}
 </div>
 </>
 )}

 {/* Step 3: Budget & Placements */}
 {step === 3 && (
 <>
 <div>
 <h2 className="text-lg font-semibold">Budget & Placements</h2>
 <p className="text-sm text-muted-foreground">Set your pricing, budget, and where ads appear</p>
 </div>

 {/* Credit balance */}
 <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
 <Coins className="h-4 w-4 text-amber-500" />
 <span className="text-sm text-muted-foreground">Credit Balance</span>
 <span className="ml-auto font-bold">{formatGBP(balance)}</span>
 {balance < 5 && (
 <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
 <Link to="/credits">Top up</Link>
 </Button>
 )}
 </div>

 {/* Pricing model */}
 <div className="space-y-2">
 <Label>Pricing Model</Label>
 <div className="grid gap-2 sm:grid-cols-2">
 <button
 onClick={() => setPricingModel('cpc')}
 className={cn(
 "p-3 rounded-lg border text-left transition-all",
 pricingModel === 'cpc'
 ? "border-primary bg-primary/5"
 : "border-border hover:border-primary/30"
 )}
 >
 <p className="text-sm font-semibold flex items-center gap-1.5">
 <MousePointerClick className="h-4 w-4" />
 Cost Per Click (CPC)
 </p>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 Pay only when someone clicks your ad
 </p>
 </button>
 <button
 onClick={() => setPricingModel('cpm')}
 className={cn(
 "p-3 rounded-lg border text-left transition-all",
 pricingModel === 'cpm'
 ? "border-primary bg-primary/5"
 : "border-border hover:border-primary/30"
 )}
 >
 <p className="text-sm font-semibold flex items-center gap-1.5">
 <Eye className="h-4 w-4" />
 Cost Per 1000 Impressions (CPM)
 </p>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 Pay per 1,000 times your ad is shown
 </p>
 </button>
 </div>
 </div>

 {/* Bid amount */}
 <div className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-2">
 <Label>{pricingModel === 'cpc' ? 'Cost Per Click (£)' : 'Cost Per 1000 Impressions (£)'}</Label>
 <Input
 type="number"
 min={0.01}
 max={10}
 step={0.01}
 value={pricingModel === 'cpc' ? cpcBid : cpmBid}
 onChange={e => {
 const val = Math.max(0.01, parseFloat(e.target.value) || 0.01);
 pricingModel === 'cpc' ? setCpcBid(val) : setCpmBid(val);
 }}
 />
 <p className="text-[11px] text-muted-foreground">
 Higher bids = more visibility. You only pay what you bid.
 </p>
 </div>
 <div className="space-y-2">
 <Label>Total Budget (£)</Label>
 <Input
 type="number"
 min={5}
 max={5000}
 step={1}
 value={totalBudget}
 onChange={e => setTotalBudget(Math.max(5, parseInt(e.target.value) || 5))}
 />
 <p className="text-[11px] text-muted-foreground">Min £5. Campaign pauses when budget is spent.</p>
 </div>
 </div>

 {/* Daily cap */}
 <div className="space-y-2">
 <Label>Daily Budget Cap (optional)</Label>
 <Input
 type="number"
 min={1}
 max={totalBudget}
 placeholder="No daily limit"
 value={dailyBudgetLimit ?? ''}
 onChange={e => {
 const val = e.target.value ? parseInt(e.target.value) : null;
 setDailyBudgetLimit(val);
 }}
 className="max-w-48"
 />
 </div>

 {/* Duration */}
 <div className="space-y-2">
 <Label>Duration</Label>
 <div className="flex gap-2">
 {[7, 14, 30, 0].map(d => (
 <button
 key={d}
 onClick={() => setDurationDays(d)}
 className={cn(
 "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
 durationDays === d
 ? "border-primary bg-primary/5"
 : "border-border hover:border-primary/30"
 )}
 >
 {d === 0 ? 'Until budget spent' : `${d} days`}
 </button>
 ))}
 </div>
 </div>

 {/* Placement zones */}
 <div className="space-y-2">
 <Label>Ad Placements</Label>
 <p className="text-[11px] text-muted-foreground mb-1">Select where your ad appears. More placements = more exposure.</p>
 <div className="grid gap-2 sm:grid-cols-2">
 {PLACEMENT_ZONES.map(z => (
 <button
 key={z.id}
 onClick={() => toggleZone(z.id)}
 className={cn(
 "flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all",
 placementZones.includes(z.id)
 ? "border-primary bg-primary/5"
 : "border-border hover:border-primary/30"
 )}
 >
 <div className={cn(
 "p-1.5 rounded-md mt-0.5",
 placementZones.includes(z.id) ? "bg-primary/10" : "bg-muted"
 )}>
 <z.icon className={cn("h-3.5 w-3.5", placementZones.includes(z.id) ? "text-primary" : "text-muted-foreground")} />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium">{z.label}</p>
 <p className="text-[10px] text-muted-foreground">{z.desc}</p>
 </div>
 {placementZones.includes(z.id) && <Check className="h-4 w-4 text-primary ml-auto shrink-0 mt-0.5" />}
 </button>
 ))}
 </div>
 </div>

 {/* Summary card */}
 <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">Total Budget</span>
 <span className={cn("font-bold", insufficientBalance && "text-destructive")}>
 £{totalBudget.toFixed(0)}
 </span>
 </div>
 <div className="flex justify-between text-xs text-muted-foreground">
 <span>Est. {pricingModel === 'cpc' ? 'clicks' : 'impressions'}</span>
 <span>~{pricingModel === 'cpc' ? estimatedClicks.toLocaleString() : estimatedImpressions.toLocaleString()}</span>
 </div>
 {insufficientBalance && (
 <p className="text-[11px] text-destructive mt-1">
 Insufficient credits. <Link to="/credits" className="underline font-medium">Top up</Link>
 </p>
 )}
 </div>
 </>
 )}

 {/* Step 4: Creative */}
 {step === 4 && (
 <>
 <div>
 <h2 className="text-lg font-semibold">Creative</h2>
 <p className="text-sm text-muted-foreground">Select images for your ad (up to 3)</p>
 </div>
 {selectedProduct?.images && selectedProduct.images.length > 0 ? (
 <div className="grid grid-cols-3 gap-3">
 {selectedProduct.images.map((img, idx) => (
 <button
 key={idx}
 onClick={() => {
 setSelectedImages(prev => {
 if (prev.includes(img)) return prev.filter(i => i !== img);
 if (prev.length >= 3) return prev;
 return [...prev, img];
 });
 }}
 className={cn(
 "relative aspect-square rounded-lg border-2 overflow-hidden transition-all",
 selectedImages.includes(img)
 ? "border-primary shadow-md"
 : "border-border hover:border-primary/30"
 )}
 >
 <img src={img} alt="" className="w-full h-full object-cover" />
 {selectedImages.includes(img) && (
 <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
 <Check className="h-3 w-3 text-primary-foreground" />
 </div>
 )}
 </button>
 ))}
 </div>
 ) : (
 <p className="text-sm text-muted-foreground text-center py-8">
 No product images available. The default product thumbnail will be used.
 </p>
 )}
 </>
 )}

 {/* Step 5: Review */}
 {step === 5 && (
 <>
 <div>
 <h2 className="text-lg font-semibold">Review & Launch</h2>
 <p className="text-sm text-muted-foreground">Your campaign will go live immediately after publishing</p>
 </div>
 <div className="space-y-3">
 {[
 { label: 'Campaign', value: campaignName || selectedProduct?.name || '—' },
 { label: 'Product', value: selectedProduct?.name || '—' },
 { label: 'Goal', value: goal },
 { label: 'Pricing', value: pricingModel === 'cpc' ? `CPC — ${formatGBP(cpcBid)}/click` : `CPM — ${formatGBP(cpmBid)}/1K views` },
 { label: 'Total Budget', value: `£${totalBudget}` },
 { label: 'Daily Cap', value: dailyBudgetLimit ? `£${dailyBudgetLimit}/day` : 'No limit' },
 { label: 'Placements', value: placementZones.map(z => PLACEMENT_ZONES.find(pz => pz.id === z)?.label || z).join(', ') },
 { label: 'Devices', value: targetDevices.join(', ') },
 { label: 'Countries', value: targetCountries.length > 0 ? targetCountries.join(', ') : 'Worldwide' },
 { label: 'Duration', value: durationDays === 0 ? 'Until budget spent' : `${durationDays} days` },
 ].map(row => (
 <div key={row.label} className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
 <span className="text-sm text-muted-foreground">{row.label}</span>
 <span className="text-sm font-medium capitalize text-right max-w-[60%]">{row.value}</span>
 </div>
 ))}
 </div>

 {/* Estimated performance */}
 <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
 <p className="text-xs font-semibold text-primary mb-1">Estimated Performance</p>
 <div className="flex gap-6 text-sm">
 <div>
 <p className="font-bold">{estimatedImpressions.toLocaleString()}</p>
 <p className="text-[10px] text-muted-foreground">Impressions</p>
 </div>
 <div>
 <p className="font-bold">{estimatedClicks.toLocaleString()}</p>
 <p className="text-[10px] text-muted-foreground">Clicks</p>
 </div>
 </div>
 </div>

 {selectedImages.length > 0 && (
 <div className="flex gap-2">
 {selectedImages.map((img, i) => (
 <div key={i} className="h-16 w-16 rounded-md overflow-hidden border border-border">
 <img src={img} alt="" className="h-full w-full object-cover" />
 </div>
 ))}
 </div>
 )}
 </>
 )}
 </div>
 </div>

 {/* Navigation */}
 <div className="flex items-center justify-between">
 <Button
 variant="outline"
 onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
 size="sm"
 >
 <ArrowLeft className="h-4 w-4 mr-1" />
 {step === 0 ? 'Cancel' : 'Back'}
 </Button>
 {step < STEPS.length - 1 ? (
 <Button
 onClick={() => setStep(s => s + 1)}
 disabled={!canProceed()}
 size="sm"
 >
 Next
 <ArrowRight className="h-4 w-4 ml-1" />
 </Button>
 ) : (
 <Button
 onClick={() => createCampaign.mutate()}
 disabled={createCampaign.isPending || insufficientBalance}
 size="sm"
 >
 {createCampaign.isPending ? 'Launching...' : 'Launch Campaign'}
 <Check className="h-4 w-4 ml-1" />
 </Button>
 )}
 </div>
 </div>
 );
}
