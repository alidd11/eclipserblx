import { cn } from '@/lib/utils';
import { renderMessageWithMentions } from './chatHelpers';

interface RichMessageContentProps {
  message: string;
  isOwn: boolean;
}

/** Parse code blocks (``` ... ```) and inline code (` ... `) */
function parseCodeBlocks(text: string): Array<{ type: 'text' | 'code-block' | 'inline-code'; content: string; language?: string }> {
  const parts: Array<{ type: 'text' | 'code-block' | 'inline-code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code-block', content: match[2].trim(), language: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // Now parse inline code within text parts
  const result: typeof parts = [];
  for (const part of parts) {
    if (part.type !== 'text') {
      result.push(part);
      continue;
    }
    const inlineRegex = /`([^`]+)`/g;
    let idx = 0;
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineRegex.exec(part.content)) !== null) {
      if (inlineMatch.index > idx) {
        result.push({ type: 'text', content: part.content.slice(idx, inlineMatch.index) });
      }
      result.push({ type: 'inline-code', content: inlineMatch[1] });
      idx = inlineMatch.index + inlineMatch[0].length;
    }
    if (idx < part.content.length) {
      result.push({ type: 'text', content: part.content.slice(idx) });
    }
  }

  return result;
}

export function RichMessageContent({ message, isOwn }: RichMessageContentProps) {
  const parts = parseCodeBlocks(message);
  const hasCodeBlocks = parts.some(p => p.type === 'code-block');

  if (!hasCodeBlocks && parts.every(p => p.type === 'text')) {
    // Simple message — use existing mention renderer
    return (
      <span className="whitespace-pre-wrap break-words">
        {renderMessageWithMentions(message, { isOwn })}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        if (part.type === 'code-block') {
          return (
            <div key={i} className="relative group">
              {part.language && (
                <div className="text-[10px] text-muted-foreground px-3 pt-2 pb-0 font-mono uppercase tracking-wider">
                  {part.language}
                </div>
              )}
              <pre
                className={cn(
                  'text-xs font-mono p-3 rounded-lg overflow-x-auto',
                  isOwn
                    ? 'bg-primary-foreground/10 text-primary-foreground'
                    : 'bg-background text-foreground border border-border'
                )}
              >
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }
        if (part.type === 'inline-code') {
          return (
            <code
              key={i}
              className={cn(
                'text-xs font-mono px-1.5 py-0.5 rounded',
                isOwn
                  ? 'bg-primary-foreground/15 text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {part.content}
            </code>
          );
        }
        return (
          <span key={i} className="whitespace-pre-wrap break-words">
            {renderMessageWithMentions(part.content, { isOwn })}
          </span>
        );
      })}
    </div>
  );
}
