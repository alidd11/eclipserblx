import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';

interface SearchFiltersProps {
  minPrice: string;
  maxPrice: string;
  freeOnly: boolean;
  onMinPriceChange: (val: string) => void;
  onMaxPriceChange: (val: string) => void;
  onFreeOnlyChange: (val: boolean) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function SearchFilters({
  minPrice,
  maxPrice,
  freeOnly,
  onMinPriceChange,
  onMaxPriceChange,
  onFreeOnlyChange,
  onReset,
  activeFilterCount,
}: SearchFiltersProps) {
  const [open, setOpen] = useState(false);

  const content = (
    <div className="space-y-5">
      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Price Range
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="pl-7 h-9 text-sm"
              min={0}
            />
          </div>
          <span className="text-muted-foreground text-xs">—</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="pl-7 h-9 text-sm"
              min={0}
            />
          </div>
        </div>
      </div>

      {/* Free Only */}
      <div className="flex items-center justify-between">
        <Label htmlFor="free-only" className="text-sm">Free only</Label>
        <Switch
          id="free-only"
          checked={freeOnly}
          onCheckedChange={onFreeOnlyChange}
        />
      </div>

      {/* Reset */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onReset();
            setOpen(false);
          }}
          className="w-full text-xs text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 relative">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[340px]">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Refine your search results</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
