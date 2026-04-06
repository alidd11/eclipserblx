import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitize';

describe('sanitizeHtml', () => {
  it('strips script tags', () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain('script');
    expect(result).toContain('Hello');
  });

  it('preserves safe HTML', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<strong>');
    expect(result).toContain('Hello');
  });

  it('handles empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
