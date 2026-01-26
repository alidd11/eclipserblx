

# Reorganize Sidebar: Merge "Shop" and "Categories" Sections

## Current Problem

The sidebar currently has:
- A **"Shop"** section containing only "All Products"
- A separate **"Categories"** section with individual categories

This creates redundancy since both relate to product browsing, and having a section with just one item feels incomplete.

## Proposed Solution

Merge these into a single **"Browse"** (or "Products") section with this structure:

```text
▾ BROWSE
   All Products        ← Top-level entry point
   ▾ Categories
      Vehicle Liveries
      Scripts & Systems
      3D Models
      ...
```

## Changes Overview

### 1. Remove the "Shop" Group
- Delete the separate "Shop" section from the `navGroups` array
- "All Products" will move into the categories section

### 2. Rename "Categories" to "Browse" 
- The section header becomes "Browse" (cleaner, action-oriented)
- "All Products" becomes the first item in this section
- Individual categories follow below

### 3. Visual Hierarchy
- "All Products" will appear with a `Package` icon as the primary entry
- "All Categories" link will be removed (redundant with individual categories)
- The section flows naturally: Browse All → or pick a category

## Visual Preview

**Before:**
```text
▾ SHOP
   All Products
▾ CATEGORIES  
   All Categories
   Vehicle Liveries
   Scripts & Systems
   ...
```

**After:**
```text
▾ BROWSE
   All Products
   Vehicle Liveries
   Scripts & Systems
   3D Models
   ...
```

---

## Technical Details

### File: `src/components/layout/CustomerSidebar.tsx`

**Change 1: Remove "Shop" from navGroups (lines 238-246)**
- Delete the entire "shop" group object

**Change 2: Update renderCategoriesSection function (lines 725-877)**
- Rename section header from "Categories" to "Browse"
- Change icon from `FolderOpen` to `Package` 
- Replace "All Categories" link with "All Products" link pointing to `/products`
- Remove the dedicated `/categories` link (users can access it from the categories page if needed)

**Change 3: Update group state key**
- Change `openGroups['categories']` to `openGroups['browse']` for state persistence

### Key Code Changes

```tsx
// Section header change
<span className="flex-1 text-left truncate text-xs uppercase tracking-wider">
  Browse
</span>

// First item becomes All Products
<NavLink
  to="/products"
  onClick={handleNavClick}
  className={...}
>
  <Package className="h-4 w-4 shrink-0" />
  <span>All Products</span>
</NavLink>

// Then individual categories follow...
```

---

## Benefits

1. **Cleaner hierarchy** - One unified browsing section instead of two
2. **Logical flow** - "All Products" at the top serves as the broadest filter
3. **Reduced redundancy** - Eliminates single-item "Shop" section
4. **Better UX** - Users intuitively understand "Browse" contains all shopping options
5. **Consistent patterns** - Matches e-commerce best practices

