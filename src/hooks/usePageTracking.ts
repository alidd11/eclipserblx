import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Generate or retrieve a persistent visitor ID
const getVisitorId = (): string => {
  const storageKey = 'eclipse_visitor_id';
  let visitorId = localStorage.getItem(storageKey);
  
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(storageKey, visitorId);
  }
  
  return visitorId;
};

// Check if this visitor has been seen before
const isNewVisitor = (): boolean => {
  const storageKey = 'eclipse_visitor_seen';
  const seen = localStorage.getItem(storageKey);
  
  if (!seen) {
    localStorage.setItem(storageKey, 'true');
    return true;
  }
  
  return false;
};

// Parse user agent for device/browser info
const parseUserAgent = (ua: string) => {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const isTablet = /iPad|Tablet/.test(ua);
  
  let deviceType = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';
  
  let browser = 'unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  return { deviceType, browser };
};

interface UsePageTrackingOptions {
  pagePath: string;
}

export function usePageTracking({ pagePath }: UsePageTrackingOptions) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (hasTracked.current) return;
    hasTracked.current = true;

    const trackVisit = async () => {
      try {
        const visitorId = getVisitorId();
        const isNew = isNewVisitor();
        const userAgent = navigator.userAgent;
        const referrer = document.referrer || null;
        const { deviceType, browser } = parseUserAgent(userAgent);

        await supabase.from('page_visits').insert({
          page_path: pagePath,
          visitor_id: visitorId,
          is_new_visitor: isNew,
          user_agent: userAgent,
          referrer: referrer,
          device_type: deviceType,
          browser: browser,
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error('Failed to track page visit:', error);
      }
    };

    trackVisit();
  }, [pagePath]);
}
