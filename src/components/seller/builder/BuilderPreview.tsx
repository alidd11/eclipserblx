import { cn } from '@/lib/utils';
import type { StoreSection } from './SectionList';
import {
  Image, LayoutTemplate, TrendingUp, Package,
  ShieldCheck, LayoutGrid, Star, Sparkles, Megaphone
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const SECTION_ICONS: Record<string, LucideIcon> = {
  banner: Image,
  header: LayoutTemplate,
  best_sellers: TrendingUp,
  products: Package,
  trust_signals: ShieldCheck,
  custom_sections: LayoutGrid,
  reviews: Star,
  recommendations: Sparkles,
  announcement: Megaphone,
};

const SECTION_HEIGHTS: Record<string, string> = {
  banner: 'h-20',
  header: 'h-16',
  best_sellers: 'h-28',
  products: 'h-36',
  trust_signals: 'h-12',
  custom_sections: 'h-24',
  reviews: 'h-24',
  recommendations: 'h-28',
  announcement: 'h-8',
};

interface BuilderPreviewProps {
  sections: StoreSection[];
  storeName?: string;
  accentColor?: string;
}

export function BuilderPreview({ sections, storeName = 'Your Store', accentColor = '#6366f1' }: BuilderPreviewProps) {
  const visibleSections = sections.filter(s => s.visible);

  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-background rounded-md px-3 py-1 text-[10px] text-muted-foreground text-center truncate border border-border/50">
            eclipse.store/{storeName.toLowerCase().replace(/\s+/g, '-')}
          </div>
        </div>
      </div>

      {/* Preview content */}
      <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
        {visibleSections.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            All sections are hidden. Toggle some sections on to preview your store.
          </div>
        ) : (
          visibleSections.map((section) => {
            const Icon = SECTION_ICONS[section.type] || Package;
            const height = SECTION_HEIGHTS[section.type] || 'h-20';

            return (
              <div
                key={section.id}
                className={cn(
                  "rounded-lg border border-dashed border-border/60 flex items-center justify-center gap-2 transition-all",
                  height,
                  section.type === 'banner' && "bg-gradient-to-r from-primary/10 to-primary/5",
                  section.type === 'header' && "bg-muted/30",
                  section.type === 'products' && "bg-muted/20",
                  !['banner', 'header', 'products'].includes(section.type) && "bg-muted/10"
                )}
                style={section.type === 'banner' ? {
                  background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`
                } : undefined}
              >
                <Icon className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground/80 font-medium">{section.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
