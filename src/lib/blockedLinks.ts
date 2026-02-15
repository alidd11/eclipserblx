/**
 * Blocked marketplace domains — competitor links are stripped from product descriptions.
 * Add new domains here to extend the blocklist.
 */
const BLOCKED_DOMAINS = [
  'clearlydev.com',
  'builtbybit.com',
  'scriptblox.com',
  'v3rmillion.net',
  'robloxscripts.com',
];

/**
 * Build a regex that matches any URL containing a blocked domain.
 * Used for raw-text detection (not HTML-aware).
 */
const blockedDomainPattern = new RegExp(
  BLOCKED_DOMAINS.map(d => d.replace(/\./g, '\\.')).join('|'),
  'i'
);

/**
 * Strips `<a>` tags whose `href` points to a blocked domain.
 * The link text is preserved (only the wrapping anchor is removed).
 */
export function stripBlockedLinks(html: string): string {
  if (!html) return '';

  // Match <a ...href="...">...</a> and check href against blocklist
  return html.replace(
    /<a\s+[^>]*href\s*=\s*["']([^"']*)["'][^>]*>(.*?)<\/a>/gi,
    (fullMatch, href: string, innerText: string) => {
      if (blockedDomainPattern.test(href)) {
        // Return inner text only — link is removed
        return innerText;
      }
      return fullMatch;
    }
  );
}

/**
 * Checks whether raw text or HTML contains URLs pointing to blocked domains.
 * Useful for showing warnings to sellers before save.
 */
export function containsBlockedLinks(text: string): boolean {
  if (!text) return false;

  // Check href attributes
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(text)) !== null) {
    if (blockedDomainPattern.test(match[1])) return true;
  }

  // Check plain-text URLs (https://domain.com/...)
  const urlRegex = /https?:\/\/[^\s<>"']+/gi;
  while ((match = urlRegex.exec(text)) !== null) {
    if (blockedDomainPattern.test(match[0])) return true;
  }

  return false;
}
