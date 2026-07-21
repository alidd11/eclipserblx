import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import {
  ChevronDown,
  MessageCircle,
  Users,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

export interface Article {
  question: string;
  answer: string;
}

export interface HelpCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  articles: Article[];
}

// ── Components ─────────────────────────────────────────

export function AccordionItem({ article, isOpen, onToggle }: { article: Article; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-4 text-left hover:text-primary transition-colors"
      >
        <span className="font-medium pr-4">{article.question}</span>
        <ChevronDown className={cn(
          "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[32rem] pb-4" : "max-h-0"
      )}>
        <p className="text-muted-foreground leading-relaxed">{article.answer}</p>
      </div>
    </div>
  );
}

export function CategorySection({ category, searchQuery }: { category: HelpCategory; searchQuery: string }) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const filtered = category.articles.filter(
    (a) =>
      a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) return null;

  const toggleItem = (i: number) => {
    setOpenItems((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i); else s.add(i);
      return s;
    });
  };

  const Icon = category.icon;

  return (
    <section id={category.id} className="scroll-mt-24">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-muted/30">
          <div className={cn("p-2.5 rounded-lg bg-background", category.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{category.title}</h2>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
        </div>
        <div className="px-5">
          {filtered.map((article, i) => (
            <AccordionItem key={i} article={article} isOpen={openItems.has(i)} onToggle={() => toggleItem(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function QuickNav({ categories, searchQuery }: { categories: HelpCategory[]; searchQuery: string }) {
  const visible = categories.filter((c) =>
    c.articles.some(
      (a) =>
        a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (visible.length === 0) return null;

  return (
    <nav className="hidden lg:block sticky top-24 space-y-1" aria-label="Help Center navigation">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</p>
      {visible.map((c) => {
        const Icon = c.icon;
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Icon className="h-4 w-4" />
            {c.title}
          </a>
        );
      })}
    </nav>
  );
}

export function ContactCTA() {
  const { discordUrl } = useDiscordUrl();

  return (
    <div className="bg-muted/30 rounded-xl p-8">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-semibold mb-2">Still need help?</h2>
        <p className="text-muted-foreground">Our support team is ready to assist you.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => {
            const btn = document.querySelector('[data-chat-widget]');
            if (btn instanceof HTMLElement) btn.click();
          }}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">Live Chat</span>
          <span className="text-xs text-muted-foreground">Available 24 / 7</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
          <a href={discordUrl} target="_blank" rel="noopener noreferrer">
            <Users className="h-5 w-5" />
            <span className="font-medium">Discord</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              Community support <ExternalLink className="h-3 w-3" />
            </span>
          </a>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
          <Link to="/contact">
            <ChevronRight className="h-5 w-5" />
            <span className="font-medium">Contact Us</span>
            <span className="text-xs text-muted-foreground">Send us a message</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
