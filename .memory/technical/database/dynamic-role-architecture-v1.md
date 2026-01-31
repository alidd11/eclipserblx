# Memory: technical/database/dynamic-role-architecture-v1
Updated: just now

## Summary
The project has migrated from a fixed Postgres enum ('app_role') to a fully dynamic, text-based role system.

## Database Changes
- **user_roles.role**: Now a text column with a foreign key to `custom_roles(name)` ON DELETE CASCADE
- **role_permissions.role**: Now a text column with a foreign key to `custom_roles(name)` ON DELETE CASCADE  
- **app_role enum**: Dropped entirely
- **role_hierarchy table**: Dropped - hierarchy is now stored directly in `custom_roles.hierarchy_level`

## Updated Functions
All core backend functions have been refactored to work with text-based roles:

- `has_role(_user_id uuid, _role text)` - Checks if user has a specific role
- `is_staff(_user_id uuid)` - Checks if user has any role
- `can_assign_role(_assigner_id uuid, _target_role text)` - Uses custom_roles hierarchy
- `get_user_max_hierarchy(_user_id uuid)` - Calculates from custom_roles table

## Frontend Updates
The following admin pages now fetch roles dynamically from `custom_roles`:

- `StaffProfile.tsx` - Role assignment/removal
- `StaffDirectory.tsx` - Staff listing with role badges
- `StaffMessages.tsx` - Role badges in chat
- `Users.tsx` - Customer role management
- `RolePermissions.tsx` - Role creation/permissions

## Architecture
- `custom_roles` table is the single source of truth for all role definitions
- Roles created in Role Permissions admin page are immediately usable for assignment
- Hierarchy enforcement happens at both RLS policy level and UI level
- Primary admin (alicanimir1@gmail.com) has exclusive authority for admin-level role management
