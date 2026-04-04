## Eclipse Roblox-Style Permission System Upgrade

### Phase 1: Scoped Role Management
- Add `manage_role:{role_name}` permissions to the `permissions` table for each existing custom role
- Update the Staff Profile role assignment UI to check scoped permissions (not just hierarchy)
- Staff can only assign/remove roles they have explicit `manage_role:X` permission for (unless admin)

### Phase 2: Bounded Role Creation
- Add database validation function `can_create_role()` that ensures:
  - New role's hierarchy_level ≤ creator's max hierarchy
  - New role's permissions are a subset of the creator's own permissions
- Update Role Permissions page to enforce these constraints in the UI

### Phase 3: Default Member Role
- Add `is_default` boolean column to `custom_roles` table
- Create trigger to auto-assign default role(s) to new users on signup
- Add UI toggle on Role Permissions page to mark a role as default

### Phase 4: Permission Stacking UI
- Build an "Effective Permissions" viewer component
- Shows the merged/union of all permissions from all assigned roles
- Display on Staff Profile page so admins can see what a user can actually do

### Phase 5: Database Functions & Security
- Create `can_create_role()` security definer function
- Update RLS policies to use scoped permission checks where applicable
- Add audit logging for role creation and permission changes
