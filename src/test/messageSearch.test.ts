import { describe, it, expect } from 'vitest';

// Test search logic extracted from useMessageSearch
interface ChatMessage {
  id: string;
  message: string | null;
}

function searchMessages(messages: ChatMessage[], query: string): ChatMessage[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return messages.filter(m => m.message?.toLowerCase().includes(q));
}

describe('Message Search', () => {
  const messages: ChatMessage[] = [
    { id: '1', message: 'Hello there!' },
    { id: '2', message: 'How can I help you?' },
    { id: '3', message: null },
    { id: '4', message: 'Your order #1234 is ready' },
    { id: '5', message: 'hello again' },
  ];

  it('finds messages matching query', () => {
    const results = searchMessages(messages, 'hello');
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('1');
    expect(results[1].id).toBe('5');
  });

  it('is case insensitive', () => {
    const results = searchMessages(messages, 'HELLO');
    expect(results).toHaveLength(2);
  });

  it('returns empty for blank query', () => {
    expect(searchMessages(messages, '')).toHaveLength(0);
    expect(searchMessages(messages, '   ')).toHaveLength(0);
  });

  it('handles null messages gracefully', () => {
    const results = searchMessages(messages, 'null');
    expect(results).toHaveLength(0);
  });

  it('finds partial matches', () => {
    const results = searchMessages(messages, 'order');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('4');
  });

  it('returns empty when nothing matches', () => {
    expect(searchMessages(messages, 'xyz123')).toHaveLength(0);
  });
});
