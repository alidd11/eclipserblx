import { useState } from 'react';
import { Crown, Zap, Server, FileText, Plus, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeBannerProps {
  currentServers?: number;
  maxServers?: number | null;
  variant?: 'compact' | 'full';
}

export function UpgradeBanner({ currentServers = 0, maxServers = 2, variant = 'full' }: UpgradeBannerProps) {
  const [additionalServers, setAdditionalServers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { isSubscribed } = useSubscription();
  
  const isAtLimit = maxServers !== null && currentServers >= maxServers;
  const basePrice = 2.99;
  // Eclipse+ members get £1.00/server, non-members pay £1.50/server
  const additionalPrice = isSubscribed ? 1.00 : 1.50;
  const totalPrice = basePrice + (additionalServers * additionalPrice);
  const totalServers = 2 + additionalServers;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-global-guard-checkout', {
        body: {
          billingPeriod: 'monthly',
          additionalServers,
          isEclipsePlus: isSubscribed,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">
            {isAtLimit ? 'Server limit reached' : 'Free tier: 1 server max'}
          </span>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleSubscribe}
          disabled={isLoading}
          className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Upgrade'}
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-transparent overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-blue-400" />
          Global Guard Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isAtLimit 
            ? "You've reached the 2 server limit on the free tier. Subscribe to sync bans across more servers."
            : "Get premium features including unlimited ban syncing, templates, and priority support."
          }
        </p>
        
        {/* Pricing calculator */}
        <div className="p-4 rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Base Plan</span>
              <span className="text-xs text-muted-foreground ml-2">(2 servers included)</span>
            </div>
            <span className="font-semibold">£{basePrice.toFixed(2)}/mo</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Additional Servers</span>
              <span className="text-xs text-muted-foreground">
                (£{additionalPrice.toFixed(2)} each{isSubscribed && ' - Eclipse+ discount'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="outline" 
                className="h-7 w-7"
                onClick={() => setAdditionalServers(Math.max(0, additionalServers - 1))}
                disabled={additionalServers === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-mono">{additionalServers}</span>
              <Button 
                size="icon" 
                variant="outline" 
                className="h-7 w-7"
                onClick={() => setAdditionalServers(additionalServers + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="border-t border-border/50 pt-3 flex items-center justify-between">
            <div>
              <span className="font-semibold">Total</span>
              <span className="text-xs text-muted-foreground ml-2">({totalServers} servers)</span>
            </div>
            <span className="text-lg font-bold text-blue-400">£{totalPrice.toFixed(2)}/mo</span>
          </div>
        </div>
        
        {/* Features */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Server className="h-3.5 w-3.5 text-blue-400" />
            <span>Cross-server sync</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            <span>Ban templates</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-blue-400" />
            <span>Priority sync</span>
          </div>
        </div>
        
        <Button 
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="h-4 w-4 mr-2" />
              Subscribe Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
