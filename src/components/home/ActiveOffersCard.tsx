import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Badge } from '@/components/ui/badge';
import { Sparkles, Tag, Clock, Gift, Check, LogIn, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  promotion_type: string;
  eclipse_plus_days: number | null;
  ends_at: string | null;
  new_users_only: boolean;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  min_order_amount: number | null;
}

const PROMO_BENEFITS = [
  "30% off all purchases",
  "Priority support access",
  "Early access to new releases",
  "Exclusive member discounts",
];

export function ActiveOffersCard() {
  const { user, loading: authLoading, session } = useAuth();
  const queryClient = useQueryClient();
  const [claimingPromoId, setClaimingPromoId] = useState<string | null>(null);
  const [benefitIndex, setBenefitIndex] = useState(0);

  // Rotate benefits every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBenefitIndex((prev) => (prev + 1) % PROMO_BENEFITS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch active promotions
  const { data: promotions = [], isLoading: promotionsLoading } = useQuery({
    queryKey: ['active-promotions', user?.id ?? 'anon'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotions')
        .select('id, name, description, promotion_type, eclipse_plus_days, ends_at, new_users_only')
        .eq('is_active', true)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as Promotion[];
    },
    enabled: !authLoading,
    staleTime: 30_000,
  });

  // Fetch user's claimed promotions
  const { data: claimedPromotionIds = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['user-promotion-claims', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('promotion_claims')
        .select('promotion_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(claim => claim.promotion_id);
    },
    enabled: !authLoading && !!user,
    staleTime: 30_000,
  });

  // Fetch active discount codes
  const { data: discountCodes = [], isLoading: discountCodesLoading } = useQuery({
    queryKey: ['active-discount-codes', user?.id ?? 'anon'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('discount_codes')
        .select('id, code, discount_type, discount_value, expires_at, min_order_amount')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as DiscountCode[];
    },
    enabled: !authLoading,
    staleTime: 30_000,
  });

  const handleClaimPromotion = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to claim offers');
      return;
    }

    setClaimingPromoId('claiming');
    try {
      const { data, error } = await supabase.functions.invoke('claim-signup-promotion', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.claimed) {
        toast.success(`Claimed ${data.days} days of Eclipse+!`);
        // Refresh claims and subscription data
        queryClient.invalidateQueries({ queryKey: ['user-promotion-claims'] });
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      } else {
        toast.info(data?.message || 'No eligible promotions to claim');
      }
    } catch (error) {
      console.error('Error claiming promotion:', error);
      toast.error('Failed to claim offer');
    } finally {
      setClaimingPromoId(null);
    }
  };

  const isInitialLoading = authLoading || promotionsLoading || discountCodesLoading;
  const hasOffers = promotions.length > 0 || discountCodes.length > 0;

  if (!hasOffers && !isInitialLoading) return null;

  const getPromotionIcon = (type: string, isClaimed: boolean) => {
    if (isClaimed) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    switch (type) {
      case 'signup_eclipse_plus':
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case 'discount_code':
        return <Tag className="h-4 w-4 text-primary" />;
      default:
        return <Gift className="h-4 w-4 text-primary" />;
    }
  };

  const formatDiscount = (code: DiscountCode) => {
    if (code.discount_type === 'percentage') {
      return `${code.discount_value}% OFF`;
    }
    return `£${code.discount_value.toFixed(2)} OFF`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
        <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Gift className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Offers</span>
          </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {/* Promotions */}
              {promotions.map((promo) => {
                const isClaimed = claimedPromotionIds.includes(promo.id);
                const isClaiming = claimingPromoId === 'claiming';
                
                return (
                  <div
                    key={promo.id}
                    className={`flex flex-col p-3 rounded-lg backdrop-blur-sm transition-colors ${
                      isClaimed 
                        ? 'border border-green-500/30 bg-green-500/5' 
                        : 'bg-muted/30 border border-border/50 hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 p-2 rounded-full ${
                        isClaimed ? 'bg-green-500/10' : 'bg-amber-500/10'
                      }`}>
                        {getPromotionIcon(promo.promotion_type, isClaimed)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isClaimed ? (
                          <span className="font-medium text-sm text-green-600 dark:text-green-400">Offer Claimed!</span>
                        ) : (
                          <>
                            <span className="font-medium text-sm text-amber-600 dark:text-amber-400">
                              🎁 New Member Exclusive
                            </span>
                            {promo.eclipse_plus_days && (
                              <p className="text-xs text-foreground font-medium mt-0.5">
                                {promo.eclipse_plus_days} days of Eclipse+ FREE
                              </p>
                            )}
                            {/* Sliding benefits */}
                            <div className="h-4 mt-1 overflow-hidden">
                              <AnimatePresence mode="wait">
                                <motion.p
                                  key={benefitIndex}
                                  initial={{ y: 10, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  exit={{ y: -10, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="text-[11px] text-muted-foreground flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                  {PROMO_BENEFITS[benefitIndex]}
                                </motion.p>
                              </AnimatePresence>
                            </div>
                            {promo.ends_at && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Ends {format(new Date(promo.ends_at), 'MMM d')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Claim / Claimed Button */}
                    <div className="mt-3">
                      {isClaimed ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-green-500/50 text-green-600 dark:text-green-400 cursor-default"
                          disabled
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Claimed
                        </Button>
                      ) : !user ? (
                        <Link to="/auth" className="block">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          >
                            <LogIn className="h-3.5 w-3.5 mr-1.5" />
                            Sign Up to Claim
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-primary/50 text-primary hover:bg-primary/10"
                          onClick={handleClaimPromotion}
                          disabled={isClaiming || claimsLoading}
                        >
                          {isClaiming ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            <>
                              <Gift className="h-3.5 w-3.5 mr-1.5" />
                              Claim Offer
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Discount Codes */}
              {discountCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/20 backdrop-blur-sm transition-colors"
                >
                  <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono text-xs bg-primary/20 text-primary border-0">
                        {code.code}
                      </Badge>
                      <span className="font-semibold text-sm text-primary">
                        {formatDiscount(code)}
                      </span>
                    </div>
                    {code.min_order_amount && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Min. order £{code.min_order_amount.toFixed(2)}
                      </p>
                    )}
                    {code.expires_at && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Expires {format(new Date(code.expires_at), 'MMM d')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

        </div>
    </motion.div>
  );
}
