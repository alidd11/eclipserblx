import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Crown, Clock, Users, Heart, Link2, Copy, Check, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

export type EarlyAccessStrategy = 'timed' | 'followers' | 'repeat_buyers' | 'private_link';

interface LaunchStrategyCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  strategy: EarlyAccessStrategy;
  onStrategyChange: (strategy: EarlyAccessStrategy) => void;
  customHours: string;
  onCustomHoursChange: (hours: string) => void;
  minOrders: string;
  onMinOrdersChange: (orders: string) => void;
  linkToken: string;
  onLinkTokenChange: (token: string) => void;
  scheduleEnabled: boolean;
  productSlug?: string;
}

const strategies: { value: EarlyAccessStrategy; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'timed', label: 'Timed Window', icon: Clock, description: 'Everyone gets access X hours before public release' },
  { value: 'followers', label: 'Followers Only', icon: Heart, description: 'Only customers who follow your store' },
  { value: 'repeat_buyers', label: 'Repeat Buyers', icon: Users, description: 'Customers with multiple orders from your store' },
  { value: 'private_link', label: 'Private Link', icon: Link2, description: 'Generate a secret URL to share with VIPs' },
];

export function LaunchStrategyCard({
  enabled,
  onEnabledChange,
  strategy,
  onStrategyChange,
  customHours,
  onCustomHoursChange,
  minOrders,
  onMinOrdersChange,
  linkToken,
  onLinkTokenChange,
  scheduleEnabled,
  productSlug,
}: LaunchStrategyCardProps) {
  const [copied, setCopied] = useState(false);

  const { data: defaultHours } = useQuery({
    queryKey: ['default-early-access-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'default_early_access_hours')
        .maybeSingle();
      if (error) throw error;
      return data?.value ? parseInt(String(data.value).replace(/^"|"$/g, '')) : 24;
    },
  });

  if (!scheduleEnabled) return null;

  const generateToken = () => {
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    onLinkTokenChange(token);
  };

  const privateLink = linkToken
    ? `${window.location.origin}/products/${productSlug || 'product'}?early=${linkToken}`
    : '';

  const handleCopy = () => {
    if (!privateLink) return;
    copyToClipboard(privateLink, 'Link copied!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden border-amber-500/30">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Launch Strategy</h3>
            <p className="text-xs text-muted-foreground">
              Control how customers get early access
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Early Access</Label>
            <p className="text-xs text-muted-foreground">
              Let eligible customers access this product before public release
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>

        {enabled && (
          <div className="space-y-4 pt-3 border-t border-amber-500/20">
            {/* Strategy Picker */}
            <div className="grid grid-cols-2 gap-2">
              {strategies.map((s) => {
                const Icon = s.icon;
                const isActive = strategy === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onStrategyChange(s.value)}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                        : 'border-border bg-muted/30 hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[10px] leading-tight text-muted-foreground">{s.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Strategy-specific config */}
            {strategy === 'timed' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      The default early access window is <strong>{defaultHours || 24} hours</strong>.
                      Customise below if needed.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="early-access-hours" className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Access Window
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="early-access-hours"
                      type="number"
                      min="1"
                      max="168"
                      value={customHours}
                      onChange={(e) => onCustomHoursChange(e.target.value)}
                      placeholder={String(defaultHours || 24)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">hours before release</span>
                  </div>
                </div>
              </div>
            )}

            {strategy === 'followers' && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Heart className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Only customers who follow your store will see and be able to purchase this product during the early access window. Others will see a countdown.
                  </p>
                </div>
              </div>
            )}

            {strategy === 'repeat_buyers' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Reward loyal customers by giving them early access based on their purchase history with your store.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-orders" className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Minimum Orders
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="min-orders"
                      type="number"
                      min="1"
                      max="100"
                      value={minOrders}
                      onChange={(e) => onMinOrdersChange(e.target.value)}
                      placeholder="2"
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">previous orders required</span>
                  </div>
                </div>
              </div>
            )}

            {strategy === 'private_link' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <Link2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Share a private link with specific customers, influencers, or communities. Only people with this link can access the product early.
                    </p>
                  </div>
                </div>
                {!linkToken ? (
                  <Button type="button" variant="outline" size="sm" onClick={generateToken} className="w-full">
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate Private Link
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm">Your Private Link</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={privateLink}
                        readOnly
                        className="text-xs font-mono bg-muted/50"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateToken}
                      className="text-xs text-muted-foreground"
                    >
                      Regenerate link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
