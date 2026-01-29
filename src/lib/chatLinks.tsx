import { Link } from 'react-router-dom';

// Valid routes in the app that should be made clickable
const VALID_ROUTES = [
  '/products',
  '/categories',
  '/featured',
  '/eclipse-plus',
  '/forum',
  '/jobs',
  '/cart',
  '/account',
  '/support',
  '/contact',
  '/faq',
  '/status',
  '/terms',
  '/privacy',
  '/refunds',
  '/downloads',
  '/wishlist',
  '/affiliate',
  '/advertise',
];

// Pattern to match route paths like /products, /eclipse-plus, /categories/vehicles
const ROUTE_PATTERN = /(?<=^|\s)(\/[a-z][-a-z0-9]*(?:\/[a-z][-a-z0-9]*)*)(?=\s|$|[.,!?])/gi;

/**
 * Parse message text and convert route paths to clickable links
 */
export function parseMessageWithLinks(
  text: string, 
  isCustomerMessage: boolean
): React.ReactNode {
  if (!text) return null;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  // Reset regex state
  ROUTE_PATTERN.lastIndex = 0;
  
  while ((match = ROUTE_PATTERN.exec(text)) !== null) {
    const route = match[0];
    const startIndex = match.index;
    
    // Check if this route (or its base) is valid
    const isValid = VALID_ROUTES.some(
      validRoute => route === validRoute || route.startsWith(validRoute + '/')
    );
    
    if (isValid) {
      // Add text before the match
      if (startIndex > lastIndex) {
        parts.push(text.slice(lastIndex, startIndex));
      }
      
      // Add the link
      parts.push(
        <Link
          key={`${startIndex}-${route}`}
          to={route}
          className={`underline hover:opacity-80 transition-opacity ${
            isCustomerMessage ? 'text-primary-foreground' : 'text-primary'
          }`}
        >
          {route}
        </Link>
      );
      
      lastIndex = startIndex + route.length;
    }
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
}
