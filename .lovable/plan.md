

# Mobile Tab Bar Redesign (BoostEXA-inspired)

Redesign the bottom navigation to match the BoostEXA style with Eclipse theming: rounded icon backgrounds for active state, a raised/elevated center Cart button, 5 tabs, and an underline indicator.

## Changes

### Tab Structure (5 tabs instead of 4)
1. **Home** (Home icon)
2. **Browse** (Compass icon) → `/products`
3. **Cart** (ShoppingCart icon) → raised/elevated center button
4. **Orders** (Package icon) → `/account?section=purchases`
5. **Hub** (Grid3X3 icon) → `/account`

### Visual Style
- **Active state**: Icon wrapped in a rounded `bg-primary/15` pill with purple text + bold underline bar beneath the label
- **Cart center button**: Raised above the bar with a larger rounded-xl background (`bg-muted/80`), slightly bigger icon, floating above other tabs
- **Icons**: Larger (`h-6 w-6`), with active icons using `stroke-[2.5]`
- **Bar**: Taller (`h-16`), subtle top border, `bg-card/95 backdrop-blur-md`
- **Labels**: `text-[11px]`, active = primary color + semibold

### Cart Badge
- Stays as-is but positioned on the raised button

## File Modified
- `src/components/layout/MobileTabBar.tsx` -- full rewrite with new 5-tab layout, raised center cart, active pill backgrounds, underline indicators

