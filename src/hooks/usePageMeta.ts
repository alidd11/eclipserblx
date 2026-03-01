import { useEffect } from 'react';

const DEFAULT_TITLE = 'Eclipse - Roblox Asset Marketplace';
const DEFAULT_DESCRIPTION =
  'Eclipse is the best Roblox asset marketplace alternative. Buy premium UK roleplay scripts, vehicles, maps & game assets. Lower fees than competitors, instant delivery.';

interface PageMetaOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
}

/**
 * Sets document title, meta description and canonical URL for the current page.
 * Resets to defaults on unmount.
 */
export function usePageMeta({ title, description, canonicalPath }: PageMetaOptions = {}) {
  useEffect(() => {
    const prevTitle = document.title;

    // Title
    document.title = title ? `${title} | Eclipse` : DEFAULT_TITLE;

    // Meta description
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = metaDesc?.content;
    if (metaDesc) {
      metaDesc.content = description || DEFAULT_DESCRIPTION;
    }

    // OG title
    let ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = title ? `${title} | Eclipse` : DEFAULT_TITLE;

    // OG description
    let ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = description || DEFAULT_DESCRIPTION;

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical && canonicalPath) {
      canonical.href = `https://eclipserblx.com${canonicalPath}`;
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.content = prevDesc;
    };
  }, [title, description, canonicalPath]);
}
