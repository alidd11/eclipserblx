import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLLAPSED_HEIGHT = 160; // ~6 lines

interface DescriptionSectionProps {
  html: string;
}

export function DescriptionSection({ html }: DescriptionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollHeight > COLLAPSED_HEIGHT + 40);
    }
  }, [html]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={cn(
          "prose prose-invert prose-sm max-w-none text-muted-foreground transition-[max-height] duration-300 overflow-hidden",
          "[&>p]:leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0 [&>p:empty]:hidden",
          "[&>h2]:text-foreground [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-3",
          "[&>h3]:text-foreground [&>h3]:text-base [&>h3]:font-medium [&>h3]:mt-5 [&>h3]:mb-2",
          "[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4",
          "[&>hr]:border-border [&>hr]:my-6 [&_li]:mb-1 [&_li:empty]:hidden [&_li_br]:hidden",
          "[&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80 [&_a]:transition-colors"
        )}
        style={{
          maxHeight: !needsTruncation || isExpanded ? 'none' : `${COLLAPSED_HEIGHT}px`,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {needsTruncation && !isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      )}

      {needsTruncation && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show less' : 'Read more'}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      )}
    </div>
  );
}
