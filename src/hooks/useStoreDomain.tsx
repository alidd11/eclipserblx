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

const RESERVED_SUBDOMAINS = ['guard', 'www', 'api', 'admin', 'mail', 'stores'];

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

    const resolve = async () => {
      try {
        const { data } = await supabase.functions.invoke('store-domain-manager', {
          body: { action: 'resolve-hostname', hostname },
        });
        if (data && data.store_id) {
          setStoreDomainData(data as StoreDomainData);
        }
      } catch (e) {
        console.error('Failed to resolve store domain:', e);
      } finally {
        setLoading(false);
      }
    };

    resolve();
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
