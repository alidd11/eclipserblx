import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PriceAlertButtonProps {
  productId: string;
  currentPrice: number;
  className?: string;
}

export function PriceAlertButton({ productId, currentPrice, className }: PriceAlertButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alert, isLoading } = useQuery({
    queryKey: ['price-alert', productId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('price_alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const toggleAlert = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      if (alert) {
        await supabase.from('price_alerts').delete().eq('id', alert.id);
      } else {
        const { error } = await supabase.from('price_alerts').insert({
          user_id: user.id,
          product_id: productId,
          original_price: currentPrice,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alert', productId] });
      toast.success(alert ? 'Price alert removed' : 'Price alert set! We\'ll notify you if the price drops.');
    },
    onError: () => {
      toast.error('Failed to update price alert');
    },
  });

  if (!user) return null;

  const isActive = !!alert;
  const Icon = isActive ? BellOff : Bell;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleAlert.mutate()}
      disabled={isLoading || toggleAlert.isPending}
      className={cn(
        "gap-1.5 text-xs",
        isActive && "text-primary",
        className
      )}
      title={isActive ? 'Remove price alert' : 'Alert me when price drops'}
    >
      <Icon className="h-3.5 w-3.5" />
      {isActive ? 'Alert Set' : 'Price Alert'}
    </Button>
  );
}
