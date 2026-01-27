import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Tag, Clock, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { SectionWrapper } from './SectionWrapper';

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
  // Fetch active promotions
  const { data: promotions = [] } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('id, name, description, promotion_type, eclipse_plus_days, ends_at, new_users_only')
        .eq('is_active', true)
        .or('ends_at.is.null,ends_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as Promotion[];
    },
  });

  // Fetch active discount codes
  const { data: discountCodes = [] } = useQuery({
    queryKey: ['active-discount-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('id, code, discount_type, discount_value, expires_at, min_order_amount')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as DiscountCode[];
    },
  });

  const hasOffers = promotions.length > 0 || discountCodes.length > 0;

  if (!hasOffers) return null;

  const getPromotionIcon = (type: string) => {
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
              <Badge variant="secondary" className="ml-auto text-xs">
                {promotions.length + discountCodes.length} Available
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {/* Promotions */}
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
                    {getPromotionIcon(promo.promotion_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{promo.name}</span>
                      {promo.new_users_only && (
                        <Badge variant="outline" className="text-[10px] py-0">New Users</Badge>
                      )}
                    </div>
                    {promo.eclipse_plus_days && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {promo.eclipse_plus_days} days of Eclipse+ membership
                      </p>
                    )}
                    {promo.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {promo.description}
                      </p>
                    )}
                    {promo.ends_at && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Ends {format(new Date(promo.ends_at), 'MMM d')}
                      </div>
                    )}
                  </div>
                </div>
              ))}

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
