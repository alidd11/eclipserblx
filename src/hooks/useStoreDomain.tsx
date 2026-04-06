import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreDomainData {
  store_id: string;
  domain: string;
  domain_type: string;
  is_primary: boolean;
  stores: {
    slug: string;
    name: string;
    logo_url: string | null;
    accent_color: string | null;
    banner_url: string | null;
  };
}

interface StoreDomainContextType {
  isCustomStoreDomain: boolean;
  storeDomainData: StoreDomainData | null;
  loading: boolean;
}

const StoreDomainContext = createContext<StoreDomainContextType>({
  isCustomStoreDomain: false,
  storeDomainData: null,
  loading: true,
});

const MAIN_DOMAINS = [
  'eclipserblx.com',
  'www.eclipserblx.com',
  'localhost',
];

const RESERVED_SUBDOMAINS = ['guard', 'www', 'api', 'admin', 'mail', 'stores', 'staff', 'tracker', 'forms'];

function isStoreDomainHostname(hostname: string): boolean {
  // Not a lovable preview/dev domain
  if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) return false;
  // Not a main domain
  if (MAIN_DOMAINS.includes(hostname)) return false;
  // If it's a subdomain of eclipserblx.com, check it's not reserved
  if (hostname.endsWith('.eclipserblx.com')) {
    const sub = hostname.replace('.eclipserblx.com', '');
    if (RESERVED_SUBDOMAINS.includes(sub)) return false;
    return true;
  }
  // Any other domain = potential custom domain
  return true;
}

export function StoreDomainProvider({ children }: { children: ReactNode }) {
  const [storeDomainData, setStoreDomainData] = useState<StoreDomainData | null>(null);
  const [loading, setLoading] = useState(true);
  const hostname = window.location.hostname;
  const isCustomStoreDomain = isStoreDomainHostname(hostname);

  useEffect(() => {
    if (!isCustomStoreDomain) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      const hn = hostname.toLowerCase();
      console.debug('[StoreDomain] Resolving hostname:', hn);

      // ── Attempt 1: Direct Supabase client query ──
      try {
        const { data, error } = await supabase
          .from('store_domains')
          .select('store_id, domain, domain_type, is_primary, stores!inner(slug, name, logo_url, accent_color, banner_url)')
          .eq('domain', hn)
          .eq('status', 'active')
          .maybeSingle();

        console.debug('[StoreDomain] Direct query:', { data, error: error?.message });

        if (!cancelled && data?.store_id) {
          setStoreDomainData(data as unknown as StoreDomainData);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('[StoreDomain] Direct query exception:', e);
      }

      // ── Attempt 2: Edge function ──
      try {
        const { data, error } = await supabase.functions.invoke('store-domain-manager', {
          body: { action: 'resolve-hostname', hostname: hn },
        });
        console.debug('[StoreDomain] Edge fn:', { data, error: error?.message, type: typeof data });

        let parsed = data;
        if (typeof data === 'string') {
          try { parsed = JSON.parse(data); } catch { /* ignore */ }
        }
        if (!cancelled && parsed?.store_id) {
          setStoreDomainData(parsed as StoreDomainData);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('[StoreDomain] Edge fn exception:', e);
      }

      // ── Attempt 3: Raw fetch to REST API ──
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const restUrl = `${supabaseUrl}/rest/v1/store_domains?select=store_id,domain,domain_type,is_primary,stores!inner(slug,name,logo_url,accent_color,banner_url)&domain=eq.${encodeURIComponent(hn)}&status=eq.active`;
        const res = await fetch(restUrl, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Accept: 'application/json',
          },
        });
        const arr = await res.json();
        console.debug('[StoreDomain] Raw fetch:', arr);
        if (!cancelled && Array.isArray(arr) && arr.length > 0 && arr[0].store_id) {
          setStoreDomainData(arr[0] as unknown as StoreDomainData);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('[StoreDomain] Raw fetch exception:', e);
      }

      console.error('[StoreDomain] All resolution methods failed for:', hn);
      if (!cancelled) setLoading(false);
    };

    resolve();
    return () => { cancelled = true; };
  }, [hostname, isCustomStoreDomain]);

  return (
    <StoreDomainContext.Provider value={{ isCustomStoreDomain, storeDomainData, loading }}>
      {children}
    </StoreDomainContext.Provider>
  );
}

export function useStoreDomain() {
  return useContext(StoreDomainContext);
}
