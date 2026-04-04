# Memory: auth/access-control/roblox-style-permissions-v1
Updated: just now

## Implemented Roblox-Style Permission Features

### Phase 1: Scoped Role Management
- Added `manage_role:{role_name}` permissions to `permissions` table for each staff role
- Admin role auto-granted all `manage_role:*` permissions
- StaffProfile now checks `manage_role:X` permissions before allowing role assignment/removal
- Non-admin staff can only assign roles they have explicit `manage_role:X` permission for

### Phase 2: Bounded Role Creation
- `can_create_role(_creator_id, _new_hierarchy_level, _new_permission_ids[])` function validates:
  - New role hierarchy ≤ creator's max hierarchy
  - Requested permissions are a subset of creator's own permissions
- `can_manage_specific_role(_user_id, _target_role)` checks admin OR `manage_role:X`

### Phase 3: Default Member Role
- Added `is_default` boolean column to `custom_roles` table
- `customer` role set as default
- Trigger `assign_default_roles_on_profile` auto-assigns default roles to new users on signup
- Toggle in Role Management UI (admin-only) to mark any role as default

### Phase 4: Permission Stacking UI
- `EffectivePermissions` component on Staff Profile page
- Shows merged/union of all permissions from all assigned roles
- Groups by category, shows which roles grant each permission
- Badge count shows multiplicity when multiple roles grant same permission

### Database Functions Added
- `can_create_role()` - Bounded role creation validation
- `can_manage_specific_role()` - Scoped role management check
- `assign_default_roles()` - Trigger function for auto-assignment
