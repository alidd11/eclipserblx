import DOMPurify from 'dompurify';
import { stripBlockedLinks } from './blockedLinks';

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
/**
 * Converts basic markdown formatting to HTML for imported descriptions.
 * Handles line breaks, unordered lists, and italic/bold markers.
 */
function convertBasicMarkdown(text: string): string {
  if (!text) return '';

  // If text already contains HTML block tags, skip markdown conversion
  if (/<(p|ul|ol|li|h[1-6]|div|br)\b/i.test(text)) return text;

  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // List item: starts with "- " or "* "
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { result.push('<ul>'); inList = true; }
      let content = line.replace(/^[-*]\s+/, '');
      // Convert _text_ to <em>
      content = content.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');
      result.push(`<li>${content}</li>`);
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      if (line === '') {
        // Skip consecutive empty lines
        continue;
      }
      let content = line;
      content = content.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');
      result.push(`<p>${content}</p>`);
    }
  }
  if (inList) result.push('</ul>');

  return result.join('');
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // First convert markdown links to HTML
  const withLinks = convertMarkdownLinks(html);

  // Then convert basic markdown formatting (for imported descriptions)
  const withMarkdown = convertBasicMarkdown(withLinks);
  
  const sanitized = DOMPurify.sanitize(withMarkdown, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 
      'h2', 'h3', 'ul', 'ol', 'li', 'hr', 'a'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    // Strip dangerous protocols
    ALLOW_DATA_ATTR: false,
  });

  // Strip links to competitor marketplaces
  return stripBlockedLinks(sanitized);
}
