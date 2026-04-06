/**
 * Escape PostgreSQL LIKE/ILIKE special characters in user input.
 * Prevents wildcard injection and expensive pattern queries.
 */
export function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

/**
 * Sanitize and clamp search input for safe database queries.
 * - Trims whitespace
 * - Limits length to prevent performance abuse
 * - Escapes LIKE wildcards
 */
export function sanitizeSearch(input: string, maxLength = 100): string {
  const trimmed = input.trim().slice(0, maxLength);
  return escapeLike(trimmed);
}
