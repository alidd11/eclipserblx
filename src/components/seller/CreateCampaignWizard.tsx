import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Coins, ArrowLeft, ArrowRight, Check, Megaphone, Target, Users,
  Wallet, Image as ImageIcon, FileCheck, Monitor, Smartphone, Tablet,
  MousePointerClick, Eye, ShoppingCart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  const [budgetType, setBudgetType] = useState<'daily' | 'weekly'>('weekly');
  const [budgetAmount, setBudgetAmount] = useState(5);
  const [durationDays, setDurationDays] = useState(7);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [slotType, setSlotType] = useState<'featured' | 'category_spotlight' | 'store_spotlight'>('featured');

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
  const totalBudget = budgetType === 'daily' ? budgetAmount * durationDays : budgetAmount * Math.ceil(durationDays / 7);
  const insufficientBalance = totalBudget > balance;

  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!user || !store) throw new Error('Not authenticated');
      if (!productId) throw new Error('Select a product');
      if (budgetAmount < 5) throw new Error('Minimum budget is 5 credits');
      if (insufficientBalance) throw new Error('Insufficient credits');

      const { error } = await supabase.from('product_promotions').insert({
        store_id: store.id,
        product_id: productId,
        user_id: user.id,
        slot_type: slotType,
        max_bid: budgetType === 'weekly' ? budgetAmount : budgetAmount * 7,
        current_bid: budgetType === 'weekly' ? budgetAmount : budgetAmount * 7,
        category_id: slotType === 'category_spotlight' ? selectedProduct?.category_id : null,
        status: 'pending_auction',
        campaign_name: campaignName || selectedProduct?.name || 'Untitled Campaign',
        goal,
        target_devices: targetDevices,
        target_countries: targetCountries.length > 0 ? targetCountries : null,
        daily_budget: budgetType === 'daily' ? budgetAmount : null,
        budget_type: budgetType,
        duration_days: durationDays,
        creative_images: selectedImages.length > 0 ? selectedImages : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-promotions'] });
      toast.success('Campaign created! It will be processed in the next auction cycle.');
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

  const canProceed = () => {
    switch (step) {
      case 0: return !!productId;
      case 1: return !!goal;
      case 2: return targetDevices.length > 0;
      case 3: return budgetAmount >= 5 && !insufficientBalance;
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
      <Card>
        <CardContent className="p-5 space-y-4">
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
              <div className="space-y-2">
                <Label>Promotion Slot</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: 'featured' as const, label: 'Featured', desc: 'Homepage hero (1 slot)' },
                    { id: 'category_spotlight' as const, label: 'Category', desc: 'Top of category (3 slots)' },
                    { id: 'store_spotlight' as const, label: 'Store', desc: 'Featured store banner (1 slot)' },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSlotType(s.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        slotType === s.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                    </button>
                  ))}
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

          {/* Step 3: Budget */}
          {step === 3 && (
            <>
              <div>
                <h2 className="text-lg font-semibold">Budget & Schedule</h2>
                <p className="text-sm text-muted-foreground">Set your spending limits</p>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Credit Balance</span>
                <span className="ml-auto font-bold">£{balance.toFixed(2)}</span>
                {balance < 5 && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link to="/credits">Top up</Link>
                  </Button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Budget Type</Label>
                  <div className="flex gap-2">
                    {(['daily', 'weekly'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setBudgetType(t)}
                        className={cn(
                          "flex-1 py-2 rounded-lg border text-sm font-medium transition-all capitalize",
                          budgetType === t
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount (credits)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={500}
                    value={budgetAmount}
                    onChange={e => setBudgetAmount(Math.max(5, parseInt(e.target.value) || 5))}
                  />
                  <p className="text-[11px] text-muted-foreground">Minimum 5 credits</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex gap-2">
                  {[7, 14, 30].map(d => (
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
                      {d} days
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated total spend</span>
                  <span className={cn("font-bold", insufficientBalance && "text-destructive")}>
                    £{totalBudget.toFixed(0)}
                  </span>
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
                <h2 className="text-lg font-semibold">Review & Publish</h2>
                <p className="text-sm text-muted-foreground">Confirm your campaign details</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Campaign', value: campaignName || selectedProduct?.name || '—' },
                  { label: 'Product', value: selectedProduct?.name || '—' },
                  { label: 'Slot', value: slotType.replace('_', ' ') },
                  { label: 'Goal', value: goal },
                  { label: 'Devices', value: targetDevices.join(', ') },
                  { label: 'Countries', value: targetCountries.length > 0 ? targetCountries.join(', ') : 'Worldwide' },
                  { label: 'Budget', value: `£${budgetAmount} ${budgetType}` },
                  { label: 'Duration', value: `${durationDays} days` },
                  { label: 'Est. Total', value: `£${totalBudget.toFixed(0)}` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-medium capitalize">{row.value}</span>
                  </div>
                ))}
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
        </CardContent>
      </Card>

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
            {createCampaign.isPending ? 'Publishing...' : 'Publish Campaign'}
            <Check className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
