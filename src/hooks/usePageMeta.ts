import { useEffect } from 'react';

const DEFAULT_TITLE = 'Eclipse - Roblox Asset Marketplace';
const DEFAULT_DESCRIPTION =
  'Eclipse is the best Roblox asset marketplace alternative. Buy premium UK roleplay scripts, vehicles, maps & game assets. Lower fees than competitors, instant delivery.';
const DEFAULT_OG_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1770521924890-IMG_4300.png';

interface PageMetaOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  /** Override OG image for this page (e.g. product thumbnail) */
  ogImage?: string;
}

/**
 * Sets document title, meta description, OG tags, Twitter tags,
 * and canonical URL for the current page. Resets to defaults on unmount.
 */
export function usePageMeta({ title, description, canonicalPath, ogImage }: PageMetaOptions = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = title ? `${title} | Eclipse` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const image = ogImage || DEFAULT_OG_IMAGE;

    // Title
    document.title = fullTitle;

    // Meta description
    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = metaDesc?.content;
    if (metaDesc) metaDesc.content = desc;

    // OG tags
    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.content = value;
    };

    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[property="og:url"]', canonicalPath ? `https://eclipserblx.com${canonicalPath}` : 'https://eclipserblx.com/');

    // Twitter tags
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', desc);
    setMeta('meta[name="twitter:image"]', image);

    // Canonical
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical && canonicalPath) {
      canonical.href = `https://eclipserblx.com${canonicalPath}`;
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.content = prevDesc;
      // Reset OG/Twitter to defaults
      setMeta('meta[property="og:title"]', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:image"]', DEFAULT_OG_IMAGE);
      setMeta('meta[name="twitter:title"]', DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[name="twitter:image"]', DEFAULT_OG_IMAGE);
    };
  }, [title, description, canonicalPath, ogImage]);
}
