
# Auto-Migrate Users When System Role Name Changes

## Overview
Enable automatic migration of users when a system role's `name` is changed. Currently, the role `name` is used as a foreign key reference in `user_roles`, so changing it would orphan users. This plan implements a database trigger that cascades role name changes to all affected users.

## Current Architecture
- `user_roles.role` → references `custom_roles.name`
- Role name changes are blocked in UI (only display_name can be edited)
- Changing `custom_roles.name` directly would break the FK constraint

## Implementation Plan

### 1. Modify Foreign Key Constraint
Update the foreign key on `user_roles.role` to include `ON UPDATE CASCADE`:
```sql
ALTER TABLE user_roles 
  DROP CONSTRAINT user_roles_role_fkey,
  ADD CONSTRAINT user_roles_role_fkey 
    FOREIGN KEY (role) 
    REFERENCES custom_roles(name) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;
```
This automatically updates all `user_roles` records when a role name changes.

### 2. Update `role_permissions` Table Similarly
```sql
ALTER TABLE role_permissions 
  DROP CONSTRAINT role_permissions_role_fkey,
  ADD CONSTRAINT role_permissions_role_fkey 
    FOREIGN KEY (role) 
    REFERENCES custom_roles(name) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;
```

### 3. Enable Name Editing for System Roles (Primary Admin Only)
Update `CreateRoleDialog.tsx` to allow the primary admin to edit the system name:
- Add a "System Name" field that appears when editing (if primary admin)
- Show a warning that renaming will automatically migrate all users
- Include the `name` field in the update mutation

### 4. Add Audit Logging for Role Renames
Create a trigger that logs role name changes to `audit_logs`:
```sql
CREATE OR REPLACE FUNCTION log_role_rename()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name != NEW.name THEN
    INSERT INTO audit_logs (action, resource, details)
    VALUES (
      'role_renamed',
      'custom_roles',
      jsonb_build_object(
        'old_name', OLD.name,
        'new_name', NEW.name,
        'affected_users', (SELECT COUNT(*) FROM user_roles WHERE role = OLD.name)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_role_rename
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_rename();
```

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Add `ON UPDATE CASCADE` to FK constraints |
| `CreateRoleDialog.tsx` | Allow primary admin to edit system role names |

## Technical Details

### Database Migration SQL
```sql
-- Drop existing constraints
ALTER TABLE user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_role_fkey;
ALTER TABLE role_permissions 
  DROP CONSTRAINT IF EXISTS role_permissions_role_fkey;

-- Re-add with ON UPDATE CASCADE
ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_role_fkey 
    FOREIGN KEY (role) 
    REFERENCES custom_roles(name) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

ALTER TABLE role_permissions 
  ADD CONSTRAINT role_permissions_role_fkey 
    FOREIGN KEY (role) 
    REFERENCES custom_roles(name) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

-- Audit trigger for role renames
CREATE OR REPLACE FUNCTION log_role_rename()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO audit_logs (action, resource, details)
    VALUES (
      'role_renamed',
      'custom_roles',
      jsonb_build_object(
        'old_name', OLD.name,
        'new_name', NEW.name
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_role_rename
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_rename();
```

### Frontend Changes (CreateRoleDialog.tsx)
```tsx
// Add name field for editing (primary admin only)
{isEditing && isPrimaryAdmin && (
  <div className="space-y-2">
    <Label htmlFor="name">System Name</Label>
    <Input
      id="name"
      value={formData.name}
      onChange={(e) => setFormData(prev => ({ 
        ...prev, 
        name: e.target.value.toLowerCase().replace(/\s+/g, '_') 
      }))}
    />
    <p className="text-xs text-muted-foreground">
      ⚠️ Changing this will automatically migrate all users with this role
    </p>
  </div>
)}

// Update mutation to include name
const updateMutation = useMutation({
  mutationFn: async (data: typeof formData) => {
    const { error } = await supabase
      .from('custom_roles')
      .update({
        name: isPrimaryAdmin ? data.name : undefined, // Only primary admin can change name
        display_name: data.display_name,
        color: data.color,
        icon: data.icon,
        hierarchy_level: data.hierarchy_level,
        description: data.description || null,
      })
      .eq('id', editRole!.id);
    if (error) throw error;
  },
  // ...
});
```

## Expected Outcome
1. Primary admin can rename any role's system name
2. All users with that role are automatically migrated via `ON UPDATE CASCADE`
3. All permissions for that role are automatically updated
4. Changes are logged to `audit_logs` for traceability
5. No data loss or broken references when roles are renamed
