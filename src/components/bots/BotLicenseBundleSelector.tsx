import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { Check, Package, Percent } from 'lucide-react';

interface Bundle {
  id: string;
  quantity: number;
  price_gbp: number;
  savings_percent: number;
  label: string;
}

interface BotLicenseBundleSelectorProps {
  productId: string;
  onBundleSelect: (bundle: Bundle | null) => void;
  selectedBundleId?: string | null;
}

export function BotLicenseBundleSelector({
  productId,
  onBundleSelect,
  selectedBundleId,
}: BotLicenseBundleSelectorProps) {
  const { formatPrice } = useCurrency();

  const { data: bundles, isLoading } = useQuery({
    queryKey: ['bot-license-bundles', productId],
    queryFn: async () => {
      // First get the bot_product_id for this product
      const { data: botProduct, error: botError } = await supabase
        .from('bot_products')
        .select('id')
        .eq('product_id', productId)
        .maybeSingle();

      if (botError || !botProduct) {
        console.log('No bot product found for:', productId);
        return [];
      }

      // Then get the bundles for this bot product
      const { data, error } = await supabase
        .from('bot_license_bundles')
        .select('*')
        .eq('bot_product_id', botProduct.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching bundles:', error);
        return [];
      }

      return data as Bundle[];
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Loading bundles...</div>
      </div>
    );
  }

  if (!bundles || bundles.length === 0) {
    return null;
  }

  const selectedBundle = bundles.find(b => b.id === selectedBundleId) || bundles[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Select License Bundle</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {bundles.map((bundle) => {
          const isSelected = bundle.id === selectedBundle.id;
          const pricePerLicense = bundle.price_gbp / bundle.quantity;
          
          return (
            <Card
              key={bundle.id}
              onClick={() => onBundleSelect(bundle)}
              className={cn(
                "cursor-pointer transition-all relative overflow-hidden p-3",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{bundle.label}</span>
                  {bundle.savings_percent > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] px-1.5 py-0"
                    >
                      -{bundle.savings_percent}%
                    </Badge>
                  )}
                </div>
                
                <div className="text-lg font-bold">
                  {formatPrice(bundle.price_gbp)}
                </div>
                
                {bundle.quantity > 1 && (
                  <div className="text-[11px] text-muted-foreground">
                    {formatPrice(pricePerLicense)} per license
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  {bundle.quantity} {bundle.quantity === 1 ? 'server' : 'servers'}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {selectedBundle.quantity > 1 && (
        <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 rounded-lg px-3 py-2">
          <Percent className="h-4 w-4" />
          <span>
            You save {formatPrice((bundles[0].price_gbp * selectedBundle.quantity) - selectedBundle.price_gbp)} with this bundle!
          </span>
        </div>
      )}
    </div>
  );
}
