import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  GripVertical, Image, LayoutTemplate, TrendingUp, Package,
  ShieldCheck, LayoutGrid, Star, Sparkles, Megaphone
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface StoreSection {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  config?: Record<string, any>;
}

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

interface SortableSectionItemProps {
  section: StoreSection;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

function SortableSectionItem({ section, isSelected, onSelect, onToggleVisibility }: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = SECTION_ICONS[section.type] || Package;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all cursor-pointer select-none",
        isDragging && "opacity-50 z-50 shadow-lg",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-primary/30 hover:bg-muted/40",
        !section.visible && "opacity-50"
      )}
      onClick={() => onSelect(section.id)}
    >
      <button
        className="touch-none cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      
      <span className="flex-1 text-sm font-medium truncate">{section.label}</span>

      <Switch
        checked={section.visible}
        onCheckedChange={() => onToggleVisibility(section.id)}
        onClick={(e) => e.stopPropagation()}
        className="scale-75"
      />
    </div>
  );
}

interface SectionListProps {
  sections: StoreSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

export function SectionList({ sections, selectedId, onSelect, onToggleVisibility }: SectionListProps) {
  return (
    <div className="space-y-1.5">
      {sections.map((section) => (
        <SortableSectionItem
          key={section.id}
          section={section}
          isSelected={selectedId === section.id}
          onSelect={onSelect}
          onToggleVisibility={onToggleVisibility}
        />
      ))}
    </div>
  );
}
