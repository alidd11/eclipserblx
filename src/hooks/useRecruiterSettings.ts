import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecruiterSettings {
  isEnabled: boolean;
  minimumPayout: number;
  commissionTiers: {
    basic: { minMembers: number; maxMembers: number; amount: number };
    standard: { minMembers: number; maxMembers: number; amount: number };
    premium: { minMembers: number; maxMembers: number; amount: number };
    elite: { minMembers: number; maxMembers: number | null; amount: number };
  };
}

const DEFAULT_SETTINGS: RecruiterSettings = {
  isEnabled: true,
  minimumPayout: 10,
  commissionTiers: {
    basic: { minMembers: 0, maxMembers: 499, amount: 5 },
    standard: { minMembers: 500, maxMembers: 1999, amount: 15 },
    premium: { minMembers: 2000, maxMembers: 9999, amount: 35 },
    elite: { minMembers: 10000, maxMembers: null, amount: 80 },
  },
};

export function useRecruiterSettings() {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['recruiter-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['recruiter_program_enabled', 'recruiter_minimum_payout']);

      if (error) throw error;

      const result: RecruiterSettings = { ...DEFAULT_SETTINGS };
      
      data?.forEach((item) => {
        const val = typeof item.value === 'string' 
          ? item.value.replace(/^"|"$/g, '') 
          : item.value;
        
        if (item.key === 'recruiter_program_enabled') {
          result.isEnabled = val === 'true' || val === true;
        } else if (item.key === 'recruiter_minimum_payout') {
          result.minimumPayout = parseFloat(String(val)) || DEFAULT_SETTINGS.minimumPayout;
        }
      });

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
    error,
  };
}

export function getCommissionTier(memberCount: number): { tier: string; amount: number } {
  if (memberCount >= 10000) return { tier: 'elite', amount: 80 };
  if (memberCount >= 2000) return { tier: 'premium', amount: 35 };
  if (memberCount >= 500) return { tier: 'standard', amount: 15 };
  return { tier: 'basic', amount: 5 };
}
