

## Fix Trending Search Tags to Load Correct Products

### Problem
The trending tags on the landing hero ("scripts", "maps", "ui", "weapons", "vehicles", "admin", "tools") all navigate to `/search?q=term`, which does a free-text `ilike` search on product names/descriptions. This misses products that are properly categorized but don't contain the exact term in their text. For example, searching "ui" won't reliably find products under the "Roblox UI" category.

### Database Categories (current)
| Slug | Name |
|------|------|
| scripts-systems | Scripts & Systems |
| maps | Maps |
| roblox-ui | Roblox UI |
| civilian-vehicles, marked-police-vehicles, etc. | Various vehicle categories |
| No match | weapons, admin, tools |

### Solution
Replace the flat `POPULAR_SEARCHES` string array with a structured array that maps each tag to either a **category slug** (navigates to `/products?category=slug`) or a **search term** (keeps current `/search?q=term` behavior).

**Mapping:**
| Tag | Action | Target |
|-----|--------|--------|
| scripts | Category | `/products?category=scripts-systems` |
| maps | Category | `/products?category=maps` |
| ui | Category | `/products?category=roblox-ui` |
| vehicles | Search | `/search?q=vehicles` (spans multiple categories) |
| weapons | Search | `/search?q=weapons` |
| admin | Search | `/search?q=admin` |
| tools | Search | `/search?q=tools` |

### File Changes

**`src/components/landing/LandingHero.tsx`**
- Replace `POPULAR_SEARCHES` string array with structured array containing `{ label, type, target }` objects
- Update `handleSearchClick` to route to `/products?category=slug` for category tags and `/search?q=term` for search tags
- Update both desktop and mobile tag renderers to use the new structure

No seller-side changes needed — sellers already assign categories when creating products, which is how the category-based tags will find their products.

