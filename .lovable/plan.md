
# Role Permissions Page Enhancement Plan

## Overview
This plan addresses two requests:
1. Replace the role selection grid with a dropdown list
2. Enable admins to create custom roles with permissions

## Current State
- Roles are stored as a PostgreSQL enum (`app_role`) with fixed values: admin, product_manager, order_manager, support_agent, analyst, recruiter, seller
- Role selection on the permissions page uses a grid of clickable cards
- Permissions are managed via `permissions` and `role_permissions` tables

---

## Part 1: Role Selection Dropdown

### Changes Required
**File: `src/pages/admin/RolePermissions.tsx`**

Replace the grid of role buttons with a Select dropdown component:
- Import the Select components from `@/components/ui/select`
- Replace the card grid (lines 167-191) with a single dropdown
- Display the selected role icon, name, and permission count in the trigger
- Show all roles in dropdown items with their icon, color badge, and permission count

### UI Design
The dropdown will show:
- **Trigger**: Selected role icon + name + permission badge
- **Items**: Each role with colored icon badge, label, and permission count
- Admin role will still show a lock icon indicating it cannot be modified

---

## Part 2: Custom Role Creation System

This is a significant architectural change because roles are currently stored as a PostgreSQL enum, which cannot be dynamically modified at runtime.

### Database Architecture Changes

**New Table: `custom_roles`**
```text
id: UUID (primary key)
name: TEXT (unique, role identifier e.g. "content_moderator")
display_name: TEXT (human-readable e.g. "Content Moderator")
color: TEXT (hex color for badge e.g. "#10B981")
icon: TEXT (icon name e.g. "shield")
description: TEXT (optional)
is_system: BOOLEAN (default false - system roles cannot be deleted)
hierarchy_level: INTEGER (for ordering, higher = more privileged)
created_at: TIMESTAMP
created_by: UUID (references auth.users)
```

**Modify `role_permissions` table**
- Add column: `custom_role_id UUID REFERENCES custom_roles(id)`
- Make `role` column nullable
- Add check constraint: either `role` OR `custom_role_id` must be set

**Modify `user_roles` table**
- Add column: `custom_role_id UUID REFERENCES custom_roles(id)`
- Make `role` column nullable
- Add check constraint: either `role` OR `custom_role_id` must be set

**New Functions**
- `has_custom_role(_user_id uuid, _custom_role_id uuid)` - check if user has a custom role
- `user_has_permission(_user_id uuid, _permission_name text)` - updated to check both system and custom roles

**RLS Policies**
- Only admins can create, update, or delete custom roles
- Only admins can modify is_system roles
- Anyone authenticated can read roles

### Seed System Roles
Migrate existing enum roles to the `custom_roles` table as system roles (is_system = true), ensuring backwards compatibility.

### Frontend Changes

**File: `src/pages/admin/RolePermissions.tsx`**

1. **Add role creation UI**
   - "Create Role" button at top of page
   - Dialog form with fields: name, display name, color picker, icon selector, description
   
2. **Unified role list**
   - Fetch both system roles and custom roles
   - Display all in the dropdown with visual distinction for system vs custom
   - Custom roles show edit/delete actions
   
3. **Role editing**
   - Edit dialog for custom roles (name, color, icon, description)
   - Cannot edit system roles

4. **Role deletion**
   - Confirmation dialog
   - Check if role is assigned to any users first
   - Cannot delete system roles

**New Components**
- `CreateRoleDialog.tsx` - Form for creating new roles
- `EditRoleDialog.tsx` - Form for editing custom roles
- `DeleteRoleDialog.tsx` - Confirmation with user assignment check

### Visual Design for Custom Roles
- Color picker with preset palette + custom hex input
- Icon selector with common admin icons (Shield, Users, Package, etc.)
- Badge preview showing how the role will appear

---

## Technical Details

### Database Migration SQL (Summary)
```text
1. Create custom_roles table
2. Add custom_role_id to role_permissions
3. Add custom_role_id to user_roles  
4. Create helper functions
5. Seed system roles from enum
6. Add RLS policies
```

### Icon Options for Role Creation
Using Lucide icons already in the project:
- Shield, ShieldCheck
- Users, UserCog
- Package, Boxes
- MessageCircle, MessageSquare
- BarChart3, TrendingUp
- FileText, FolderOpen
- Settings, Cog
- Eye, Lock
- Store, ShoppingBag
- Star, Award

### Color Palette Options
Preset colors matching existing role badges:
- Red (#EF4444) - Admin/High privilege
- Blue (#3B82F6) - Management
- Green (#22C55E) - Operations
- Purple (#A855F7) - Support
- Amber (#F59E0B) - Analytics
- Cyan (#06B6D4) - Recruitment
- Emerald (#10B981) - Sales/Seller

---

## Implementation Order

1. **Phase 1: Dropdown UI** (Quick win)
   - Replace role selection grid with dropdown
   - No database changes required

2. **Phase 2: Database Schema**
   - Create custom_roles table
   - Add custom_role_id columns
   - Create helper functions
   - Seed system roles

3. **Phase 3: Role CRUD UI**
   - Create role dialog
   - Edit role dialog
   - Delete role confirmation
   - Integration with permissions page

4. **Phase 4: User Assignment**
   - Update Users page to support custom role assignment
   - Update has_role/has_permission checks throughout app

---

## Security Considerations
- Only admins can create/modify/delete roles
- System roles (admin, etc.) cannot be modified or deleted
- Admin role always has all permissions and cannot be restricted
- Custom role creation logged to audit table
- Primary admin email protection maintained for admin role assignment
