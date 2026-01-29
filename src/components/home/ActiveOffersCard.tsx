import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Tag, Clock, Gift, Check, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { SectionWrapper } from './SectionWrapper';
import { useAuth } from '@/hooks/useAuth';

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

export function ActiveOffersCard() {
  const { user, loading: authLoading } = useAuth();

  // Fetch active promotions
  const { data: promotions = [], isLoading: promotionsLoading } = useQuery({
    // Include auth state so we don't cache an empty anon result and keep it after login.
    queryKey: ['active-promotions', user?.id ?? 'anon'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotions')
        .select('id, name, description, promotion_type, eclipse_plus_days, ends_at, new_users_only')
        .eq('is_active', true)
        // NOTE: PostgREST filters don't reliably support function calls like `now()` here.
        // Use an explicit timestamp so active offers always load.
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
    // Include auth state so we don't cache an empty anon result and keep it after login.
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

  const isInitialLoading = authLoading || promotionsLoading || discountCodesLoading;
  const hasOffers = promotions.length > 0 || discountCodes.length > 0;

  // Avoid the "card dissolving" effect during initial load.
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
    <SectionWrapper as="div" className="pt-0 pb-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">Active Offers</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {/* Promotions */}
              {promotions.map((promo) => {
                const isClaimed = claimedPromotionIds.includes(promo.id);
                
                return (
                  <div
                    key={promo.id}
                    className={`flex items-start gap-3 p-3 rounded-lg bg-card/50 border transition-colors ${
                      isClaimed 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`flex-shrink-0 p-2 rounded-full ${
                      isClaimed ? 'bg-green-500/10' : 'bg-primary/10'
                    }`}>
                      {getPromotionIcon(promo.promotion_type, isClaimed)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{promo.name}</span>
                        {isClaimed ? (
                          <Badge variant="outline" className="text-[10px] py-0 border-green-500/50 text-green-600 dark:text-green-400">
                            Claimed
                          </Badge>
                        ) : claimsLoading ? null : !user && promo.new_users_only ? (
                          <Link to="/auth">
                            <Badge variant="outline" className="text-[10px] py-0 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer">
                              <LogIn className="h-2.5 w-2.5 mr-1" />
                              Sign Up to Claim
                            </Badge>
                          </Link>
                        ) : promo.new_users_only ? (
                          <Badge variant="outline" className="text-[10px] py-0">New Users</Badge>
                        ) : null}
                      </div>
                      {promo.eclipse_plus_days && !isClaimed && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {promo.eclipse_plus_days} days of Eclipse+ membership
                        </p>
                      )}
                      {isClaimed && (
                        <Link to="/eclipse-plus" className="text-xs text-amber-500 hover:text-amber-400 mt-0.5 inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Get Eclipse+ for 30% off everything
                        </Link>
                      )}
                      {promo.description && !isClaimed && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {promo.description}
                        </p>
                      )}
                      {promo.ends_at && !isClaimed && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Ends {format(new Date(promo.ends_at), 'MMM d')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Discount Codes */}
              {discountCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border hover:border-primary/30 transition-colors"
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

            <div className="mt-4 flex justify-center">
              <Link to="/eclipse-plus">
                <Button variant="outline" size="sm" className="gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
                  <Sparkles className="h-4 w-4" />
                  Get Eclipse+ for 30% Off Everything
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </SectionWrapper>
  );
}
