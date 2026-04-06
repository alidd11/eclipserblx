import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAffiliateConnectStatus } from '@/hooks/useAffiliateConnectStatus';
import { useAffiliateSettings } from '@/hooks/useAffiliateSettings';
import { toast } from 'sonner';

export interface PayoutSettings {
  preferred_method: 'stripe' | 'paypal' | 'bank_transfer';
  paypal_email: string;
  bank_account_holder: string;
  bank_account_number: string;
  bank_swift_bic: string;
  bank_name: string;
  bank_country: string;
  bank_routing_number: string;
}

export function useAffiliateData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { settings: affiliateSettings, isLoading: settingsLoading } = useAffiliateSettings();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>({
    preferred_method: 'stripe',
    paypal_email: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_swift_bic: '',
    bank_name: '',
    bank_country: '',
    bank_routing_number: '',
  });
  const [paypalEmailError, setPaypalEmailError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  useEffect(() => {
    if (searchParams.get('stripe_onboarding') === 'complete') {
      toast.success("Stripe Connected!", { description: "Your Stripe account has been connected successfully." });
      queryClient.invalidateQueries({ queryKey: ['affiliate-connect-status'] });
    }
    if (searchParams.get('stripe_refresh') === 'true') {
      toast.error("Session Expired", { description: "Please try connecting your Stripe account again." });
    }
  }, [searchParams, queryClient]);

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['affiliate-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('affiliate_balances').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: connectStatus, isLoading: connectStatusLoading } = useAffiliateConnectStatus(!!user?.id);

  const { data: commissions } = useQuery({
    queryKey: ['affiliate-commissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('affiliate_commissions').select('*').eq('affiliate_id', user.id).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: pendingPayouts } = useQuery({
    queryKey: ['affiliate-payouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('affiliate_payouts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile-referral', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('referral_code, display_name').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: paymentDetails } = useQuery({
    queryKey: ['user-payment-details', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('user_payment_details').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (paymentDetails) {
      setPayoutSettings({
        preferred_method: (paymentDetails.preferred_payout_method as PayoutSettings['preferred_method']) || 'stripe',
        paypal_email: paymentDetails.paypal_email || '',
        bank_account_holder: paymentDetails.bank_account_holder || '',
        bank_account_number: paymentDetails.bank_account_number || '',
        bank_swift_bic: paymentDetails.bank_swift_bic || '',
        bank_name: paymentDetails.bank_name || '',
        bank_country: paymentDetails.bank_country || '',
        bank_routing_number: paymentDetails.bank_routing_number || '',
      });
    }
  }, [paymentDetails]);

  const connectStripeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-affiliate-connect-account');
      if (error) throw error;
      return data as { url: string; accountId: string };
    },
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (error: Error) => { toast.error("Error", { description: error.message }); setIsConnectingStripe(false); },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const method = payoutSettings.preferred_method === 'stripe' && connectStatus?.canReceivePayments ? 'stripe'
        : payoutSettings.preferred_method === 'bank_transfer' ? 'bank_transfer' : 'paypal';
      const { data, error } = await supabase.functions.invoke('request-affiliate-payout', { body: { amount: Math.round(amount * 100), method } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: Record<string, string>) => {
      toast.success(data.method === 'stripe' ? "Payout Complete!" : "Payout Requested", { description: data.message });
      setPayoutAmount('');
      queryClient.invalidateQueries({ queryKey: ['affiliate-payouts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-balance', user?.id] });
    },
    onError: (error: Error) => { toast.error("Error", { description: error.message }); },
  });

  const updatePayoutSettingsMutation = useMutation({
    mutationFn: async (settings: PayoutSettings) => {
      if (!user?.id) throw new Error('Not authenticated');
      const payload = {
        user_id: user.id,
        preferred_payout_method: settings.preferred_method,
        paypal_email: settings.paypal_email || null,
        bank_account_holder: settings.bank_account_holder || null,
        bank_account_number: settings.bank_account_number || null,
        bank_swift_bic: settings.bank_swift_bic || null,
        bank_name: settings.bank_name || null,
        bank_country: settings.bank_country || null,
        bank_routing_number: settings.bank_routing_number || null,
      };
      const { error } = await supabase.from('user_payment_details').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile-referral', user?.id] }); toast.success("Payout settings updated"); },
    onError: (error: Error) => { toast.error("Error", { description: error.message }); },
  });

  const availableBalance = (balance?.available_balance || 0) / 100;
  const totalEarned = (balance?.total_earned || 0) / 100;
  const totalClicks = balance?.total_clicks || 0;
  const totalSignups = balance?.total_signups || 0;
  const conversionRate = totalClicks > 0 ? ((totalSignups / totalClicks) * 100).toFixed(1) : '0.0';
  const hasPendingPayout = pendingPayouts?.some(p => p.status === 'pending');
  const canUseStripe = connectStatus?.canReceivePayments === true;
  const needsStripeOnboarding = !connectStatus?.canReceivePayments;
  const isLoading = balanceLoading || settingsLoading;

  const handleRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < affiliateSettings.minimumPayout) {
      toast.error("Invalid Amount", { description: `Minimum payout is £${affiliateSettings.minimumPayout}` });
      return;
    }
    requestPayoutMutation.mutate(amount);
  };

  const handleConnectStripe = () => {
    setIsConnectingStripe(true);
    connectStripeMutation.mutate();
  };

  const copyReferralLink = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${profile.referral_code}`);
      toast.success("Copied!", { description: "Referral link copied to clipboard" });
    }
  };

  return {
    user,
    affiliateSettings,
    profile,
    balance,
    commissions,
    pendingPayouts,
    connectStatus,
    connectStatusLoading,
    isLoading,
    availableBalance,
    totalEarned,
    totalClicks,
    totalSignups,
    conversionRate,
    hasPendingPayout,
    canUseStripe,
    needsStripeOnboarding,
    payoutAmount,
    setPayoutAmount,
    payoutSettings,
    setPayoutSettings,
    paypalEmailError,
    setPaypalEmailError,
    validateEmail,
    isConnectingStripe,
    handleRequestPayout,
    handleConnectStripe,
    copyReferralLink,
    requestPayoutMutation,
    connectStripeMutation,
    updatePayoutSettingsMutation,
  };
}
