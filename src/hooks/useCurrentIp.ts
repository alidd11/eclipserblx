import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IpInfo {
  ip: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useCurrentIp(): IpInfo {
  const [ip, setIp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIp = async () => {
      try {
        // Reuse cached IP ban check result from IpBanCheck to avoid duplicate edge function calls
        const cached = sessionStorage.getItem('ip-ban-check');
        if (cached) {
          const { data: cachedData, ts } = JSON.parse(cached);
          if (Date.now() - ts < 10 * 60 * 1000) {
            setIp(cachedData?.ip || null);
            setIsLoading(false);
            return;
          }
        }

        const { data, error: fnError } = await supabase.functions.invoke('check-ip-ban');
        
        if (fnError) {
          setError('Failed to fetch IP');
          return;
        }
        
        setIp(data?.ip || null);
        // Cache for other consumers
        sessionStorage.setItem('ip-ban-check', JSON.stringify({ data, ts: Date.now() }));
      } catch (err) {
        setError('Failed to fetch IP');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIp();
  }, []);

  return { ip, isLoading, error };
}
