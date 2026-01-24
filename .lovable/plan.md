

# Admin Categories Management Page

## Overview
Create a new admin page where you can add, edit, reorder, and delete product categories with a simple, user-friendly interface.

## What You'll Be Able To Do

| Action | Description |
|--------|-------------|
| **Add** | Create new categories with name, description, and icon |
| **Edit** | Update any category's details |
| **Reorder** | Drag and drop to change display order |
| **Delete** | Remove categories (with safety check for products) |

## How It Will Look

The page will display a simple table/list of all categories with:
- **Drag handle** on the left for reordering
- **Icon** preview
- **Name** and **slug** (auto-generated from name)
- **Description** (optional)
- **Product count** showing how many products use this category
- **Edit** and **Delete** buttons

### Add/Edit Dialog
When adding or editing a category:
- **Name** - The display name (e.g., "Vehicle Liveries")
- **Slug** - Auto-generated from name (e.g., "vehicle-liveries"), but editable
- **Description** - Optional description text
- **Icon** - Dropdown to select from available Lucide icons (Car, Code, Box, Layout, Percent, Bot, etc.)

## Safety Features

### Delete Protection
- If a category has products assigned, you'll see a warning
- Option to either reassign products to another category or proceed anyway (products become "Uncategorized")

### Slug Validation
- Slugs must be unique
- System prevents duplicate slugs

## Navigation
The page will be added to the admin sidebar under **Store** section:
- Products
- **Categories** (new)
- Orders
- Reviews
- Discounts

---

## Technical Implementation

### New Files
| File | Purpose |
|------|---------|
| `src/pages/admin/Categories.tsx` | Main categories management page |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add "Categories" nav item under Store |
| `src/App.tsx` | Add route for `/admin/categories` |

### Database Changes
None required - the `categories` table already has all needed columns:
- `id`, `name`, `slug`, `description`, `icon`, `display_order`, `parent_id`

### Features
1. **CRUD Operations**: Create, read, update, delete categories via Supabase
2. **Drag-and-Drop Reordering**: Using `@dnd-kit` (already installed) to reorder categories
3. **Product Count Display**: Shows number of products in each category
4. **Icon Picker**: Dropdown of common Lucide icons to choose from
5. **Auto-slug Generation**: Automatically creates URL-safe slug from category name

