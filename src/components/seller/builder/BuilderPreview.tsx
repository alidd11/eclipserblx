import { cn } from '@/lib/utils';
import type { StoreSection } from './SectionList';
import {
  Image, LayoutTemplate, TrendingUp, Package,
  ShieldCheck, LayoutGrid, Star, Sparkles, Megaphone,
  Zap, RefreshCw, Users
} from 'lucide-react';

interface BuilderPreviewProps {
  sections: StoreSection[];
  storeName?: string;
  accentColor?: string;
  selectedId?: string | null;
}

/* ── Mini section renderers ── */

function BannerPreview({ storeName, accentColor }: { storeName: string; accentColor: string }) {
  return (
    <div
      className="h-20 rounded-lg flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)` }}
    >
      <span className="text-sm font-bold text-foreground/70">{storeName}</span>
    </div>
  );
}

function HeaderPreview({ storeName }: { storeName: string }) {
  return (
    <div className="h-14 rounded-lg bg-muted/30 flex items-center gap-2.5 px-4">
      <div className="w-8 h-8 rounded-full bg-muted" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold truncate">{storeName}</div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Users className="h-2.5 w-2.5" /> 128 followers
        </div>
      </div>
    </div>
  );
}

function ProductGridPreview({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded bg-muted/40 flex flex-col overflow-hidden">
          <div className="aspect-[4/3] bg-muted/60" />
          <div className="p-1 space-y-0.5">
            <div className="h-1 w-3/4 rounded-full bg-muted/60" />
            <div className="h-1 w-1/2 rounded-full bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrustSignalsPreview({ accentColor }: { accentColor: string }) {
  const items = [
    { icon: ShieldCheck, label: 'Secure' },
    { icon: Zap, label: 'Instant' },
    { icon: RefreshCw, label: 'Updates' },
  ];
  return (
    <div className="flex gap-2 justify-center">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1 px-2 py-1 rounded bg-muted/20 border border-border/40">
          <item.icon className="h-3 w-3" style={{ color: accentColor }} />
          <span className="text-[9px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewsPreview() {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn("h-3 w-3", i < 4 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30")} />
        ))}
      </div>
      <span className="text-[9px] text-muted-foreground">4.0 · 24 reviews</span>
    </div>
  );
}

function AnnouncementPreview({ config, accentColor }: { config?: Record<string, any>; accentColor: string }) {
  const text = config?.text || 'Your announcement here...';
  return (
    <div
      className="h-7 rounded flex items-center justify-center text-[10px] font-medium"
      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
    >
      <Megaphone className="h-3 w-3 mr-1.5 shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function CustomSectionsPreview() {
  return (
    <div className="h-16 rounded-lg border border-dashed border-border/40 bg-muted/10 flex items-center justify-center gap-1.5">
      <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="text-[10px] text-muted-foreground/60">Custom Sections</span>
    </div>
  );
}

function RecommendationsPreview() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground/60 font-medium">Recommended</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

/* ── Main Preview ── */

export function BuilderPreview({ sections, storeName = 'Your Store', accentColor = '#6366f1', selectedId }: BuilderPreviewProps) {
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
          visibleSections.map((section) => (
            <div
              key={section.id}
              className={cn(
                "rounded-lg p-2 transition-all border",
                selectedId === section.id
                  ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                  : "border-transparent"
              )}
            >
              {section.type === 'banner' && <BannerPreview storeName={storeName} accentColor={accentColor} />}
              {section.type === 'header' && <HeaderPreview storeName={storeName} />}
              {section.type === 'best_sellers' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground/60 font-medium">Best Sellers</span>
                  </div>
                  <ProductGridPreview count={section.config?.limit ?? 4} />
                </div>
              )}
              {section.type === 'products' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground/60 font-medium">All Products</span>
                  </div>
                  <ProductGridPreview count={8} />
                </div>
              )}
              {section.type === 'trust_signals' && <TrustSignalsPreview accentColor={accentColor} />}
              {section.type === 'reviews' && <ReviewsPreview />}
              {section.type === 'announcement' && <AnnouncementPreview config={section.config} accentColor={accentColor} />}
              {section.type === 'custom_sections' && <CustomSectionsPreview />}
              {section.type === 'recommendations' && <RecommendationsPreview />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
