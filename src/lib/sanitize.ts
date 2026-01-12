import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Only allows safe tags commonly used in rich text editors.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 
      'h2', 'h3', 'ul', 'ol', 'li', 'hr'
    ],
    ALLOWED_ATTR: [],
    // Strip dangerous protocols
    ALLOW_DATA_ATTR: false,
  });
}
