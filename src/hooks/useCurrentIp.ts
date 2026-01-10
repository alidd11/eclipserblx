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
        const { data, error: fnError } = await supabase.functions.invoke('check-ip-ban');
        
        if (fnError) {
          setError('Failed to fetch IP');
          return;
        }
        
        setIp(data?.ip || null);
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
