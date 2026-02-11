import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeStorage } from '@/lib/safeStorage';

type EventType = 'store_view' | 'product_view' | 'add_to_cart' | 'checkout' | 'purchase';

interface TrackEventOptions {
  storeId: string;
  productId?: string;
  eventType: EventType;
}

// Generate or get persistent visitor ID
const getVisitorId = (): string => {
  const key = 'eclipse_visitor_id';
  let visitorId = safeStorage.getItem(key);
  
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    safeStorage.setItem(key, visitorId);
  }
  
  return visitorId;
};

// Get visitor country via free geo-IP API (cached per session)
let countryPromise: Promise<string | null> | null = null;

const getVisitorCountry = (): Promise<string | null> => {
  if (countryPromise) return countryPromise;
  
  const cached = safeStorage.getItem('eclipse_visitor_country');
  if (cached) {
    countryPromise = Promise.resolve(cached);
    return countryPromise;
  }

  countryPromise = fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      const country = data.country_name || null;
      if (country) safeStorage.setItem('eclipse_visitor_country', country);
      return country;
    })
    .catch(() => null);
  
  return countryPromise;
};

// Get device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export function useSellerAnalytics(storeId: string | undefined) {
  const trackedEvents = useRef<Set<string>>(new Set());

  const trackEvent = useCallback(async (options: Omit<TrackEventOptions, 'storeId'>) => {
    if (!storeId) return;

    // Create unique key for deduplication
    const eventKey = `${storeId}_${options.productId || 'store'}_${options.eventType}`;
    
    // Prevent duplicate tracking within the same session for views
    if (['store_view', 'product_view'].includes(options.eventType)) {
      if (trackedEvents.current.has(eventKey)) {
        return;
      }
      trackedEvents.current.add(eventKey);
    }

    try {
      const country = await getVisitorCountry();
      await supabase
        .from('seller_analytics')
        .insert({
          store_id: storeId,
          product_id: options.productId || null,
          event_type: options.eventType,
          visitor_id: getVisitorId(),
          referrer: document.referrer || null,
          device_type: getDeviceType(),
          country,
        });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, [storeId]);

  // Track store view on mount
  useEffect(() => {
    if (storeId) {
      trackEvent({ eventType: 'store_view' });
    }
  }, [storeId, trackEvent]);

  return {
    trackEvent,
    trackProductView: (productId: string) => trackEvent({ eventType: 'product_view', productId }),
    trackAddToCart: (productId: string) => trackEvent({ eventType: 'add_to_cart', productId }),
    trackCheckout: () => trackEvent({ eventType: 'checkout' }),
    trackPurchase: (productId?: string) => trackEvent({ eventType: 'purchase', productId }),
  };
}
