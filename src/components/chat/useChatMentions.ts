import { useState, useCallback, useRef, type RefObject } from 'react';
import type { ChatMember, GroupMention } from './chatHelpers';
import { getMentionHandle } from './chatHelpers';

interface MentionSuggestion {
  type: 'group' | 'member';
  id?: string;
  name?: string;
  description?: string;
  user_id?: string;
  display_name?: string | null;
  email?: string;
  roles?: string[];
}

export function useChatMentions(
  allMembers: ChatMember[],
  groupMentions: GroupMention[],
  currentUserId: string | undefined,
  inputRef: RefObject<HTMLInputElement | null>,
) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [message, setMessage] = useState('');

  const filteredGroups = groupMentions.filter(g =>
    g.name.includes(filter.toLowerCase())
  );

  const filteredMembers = allMembers.filter(member => {
    if (member.user_id === currentUserId) return false;
    const display = (member.display_name || (member.email || '').split('@')[0]).toLowerCase();
    const handle = getMentionHandle(member);
    const q = filter.toLowerCase();
    return display.includes(q) || handle.includes(q);
  });

  const allSuggestions: MentionSuggestion[] = [
    ...filteredGroups.map(g => ({ type: 'group' as const, ...g })),
    ...filteredMembers.map(m => ({ type: 'member' as const, ...m })),
  ];

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, onTyping: () => void) => {
    const value = e.target.value;
    setMessage(value);
    onTyping();

    const rawCursorPos = e.target.selectionStart;
    const cursorPos = rawCursorPos == null
      ? value.length
      : rawCursorPos === 0 && value.length > 0
        ? value.length
        : rawCursorPos;

    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (mentionMatch) {
      setShowSuggestions(true);
      setFilter(mentionMatch[1]);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setFilter('');
    }
  }, []);

  const insertMention = useCallback((name: string) => {
    const rawCursorPos = inputRef.current?.selectionStart;
    const cursorPos = rawCursorPos == null
      ? message.length
      : rawCursorPos === 0 && message.length > 0
        ? message.length
        : rawCursorPos;

    const textBeforeCursor = message.slice(0, cursorPos);
    const textAfterCursor = message.slice(cursorPos);
    const atPos = textBeforeCursor.lastIndexOf('@');

    let newText: string;
    if (atPos === -1) {
      const prefix = message.length > 0 && !message.endsWith(' ') ? ' ' : '';
      newText = message + prefix + `@${name} `;
    } else {
      newText = textBeforeCursor.slice(0, atPos) + `@${name} ` + textAfterCursor;
    }

    setMessage(newText);
    setShowSuggestions(false);
    setFilter('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [message, inputRef]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, onSend: () => void) => {
    if (showSuggestions && allSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allSuggestions.length) % allSuggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = allSuggestions[selectedIndex];
        if (selected) {
          const name = selected.type === 'group'
            ? selected.name!
            : getMentionHandle(selected as ChatMember);
          insertMention(name);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [showSuggestions, allSuggestions, selectedIndex, insertMention]);

  return {
    message,
    setMessage,
    showSuggestions,
    setShowSuggestions,
    selectedIndex,
    allSuggestions,
    handleInputChange,
    handleKeyDown,
    insertMention,
  };
}
