import DOMPurify from 'dompurify';

/**
 * Converts markdown-style links [text](url) to HTML anchor tags.
 * Only converts links with http/https protocols for security.
 */
function convertMarkdownLinks(text: string): string {
  if (!text) return '';
  
  // Match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  
  return text.replace(markdownLinkRegex, (_, linkText, url) => {
    // Escape HTML entities in link text to prevent XSS
    const escapedText = linkText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;
  });
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Only allows safe tags commonly used in rich text editors.
 * Also converts markdown-style links to clickable HTML links.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // First convert markdown links to HTML
  const withLinks = convertMarkdownLinks(html);
  
  return DOMPurify.sanitize(withLinks, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 
      'h2', 'h3', 'ul', 'ol', 'li', 'hr', 'a'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    // Strip dangerous protocols
    ALLOW_DATA_ATTR: false,
  });
}
