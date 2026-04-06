import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/haptics';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface SearchCategoryChipsProps {
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export function SearchCategoryChips({ selected, onSelect }: SearchCategoryChipsProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug')
      .is('parent_id', null)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => {
            hapticTap();
            onSelect(selected === cat.slug ? null : cat.slug);
          }}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
            " touch-manipulation",
            selected === cat.slug
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
