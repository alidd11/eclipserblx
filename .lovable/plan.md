

# Frontend Role Hierarchy Filtering Implementation

## Overview
Update the frontend to filter roles based on the current user's hierarchy level, so staff only see roles they can actually assign. The backend RLS policies will remain in place as a security safety net.

## Current Problem
- The `availableRoles` function in `src/pages/admin/Users.tsx` only has a hardcoded check for the admin role
- Any staff member sees all other roles (Product Manager, Order Manager, etc.) regardless of their own rank
- When they try to assign a higher role, the database blocks it with a generic error
- The `StaffDirectory.tsx` uses a separate hardcoded `ROLE_HIERARCHY` for sorting (inconsistent with database)

## Solution

### 1. Fetch Role Hierarchy from Database

**Add a new query in `src/pages/admin/Users.tsx`:**
- Fetch the `role_hierarchy` table to get hierarchy levels for all roles
- Fetch the current user's max hierarchy level using an RPC call to `get_user_max_hierarchy`

```typescript
// Fetch role hierarchy levels
const { data: roleHierarchy } = useQuery({
  queryKey: ['role-hierarchy'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('role_hierarchy')
      .select('role, hierarchy_level');
    if (error) throw error;
    return data;
  },
});

// Fetch current user's max hierarchy level
const { data: currentUserHierarchy } = useQuery({
  queryKey: ['current-user-hierarchy', user?.id],
  queryFn: async () => {
    if (!user?.id) return 0;
    const { data, error } = await supabase
      .rpc('get_user_max_hierarchy', { _user_id: user.id });
    if (error) throw error;
    return data ?? 0;
  },
  enabled: !!user?.id,
});
```

### 2. Update `availableRoles` Function

**Modify the filtering logic:**
```typescript
const availableRoles = (userId: string) => {
  const existing = getUserRoles(userId).map(r => r.role);
  
  return ROLES.filter(r => {
    // Exclude roles the user already has
    if (existing.includes(r.value)) return false;
    
    // Get the target role's hierarchy level
    const targetLevel = roleHierarchy?.find(h => h.role === r.value)?.hierarchy_level ?? 999;
    
    // Only show roles at or below current user's hierarchy level
    if ((currentUserHierarchy ?? 0) < targetLevel) return false;
    
    // Special case: Only primary admin can assign admin role (extra protection)
    if (r.value === 'admin' && !isPrimaryAdmin) return false;
    
    return true;
  });
};
```

### 3. Check if User Can Be Managed

**Add helper to check if current user can manage target user:**
```typescript
const { data: manageableUsers } = useQuery({
  queryKey: ['manageable-users', user?.id, profiles],
  queryFn: async () => {
    if (!user?.id || !profiles) return new Set<string>();
    
    // Get hierarchy level for each user with roles
    const checks = await Promise.all(
      profiles.map(async (profile) => {
        const { data } = await supabase
          .rpc('can_manage_user_roles', { 
            _assigner_id: user.id, 
            _target_user_id: profile.user_id 
          });
        return { userId: profile.user_id, canManage: data ?? false };
      })
    );
    
    return new Set(checks.filter(c => c.canManage).map(c => c.userId));
  },
  enabled: !!user?.id && !!profiles?.length,
});
```

### 4. Disable Actions for Higher-Ranked Users

**In the UI, disable role management buttons for users you cannot manage:**
- Grey out the "Roles" button
- Show a tooltip explaining why ("Requires higher privilege level")
- Prevent opening the role management dialog

### 5. Update StaffDirectory.tsx

**Replace hardcoded hierarchy with database values:**
- Fetch from `role_hierarchy` table instead of using `ROLE_HIERARCHY` constant
- Sort staff members using the database hierarchy levels
- This ensures consistency across the application

### 6. Improve Error Messages

**Update the `addRoleMutation` error handler:**
- Detect hierarchy-related errors
- Show a user-friendly message like "You don't have permission to assign this role"

## Files to Modify

1. **`src/pages/admin/Users.tsx`**
   - Add queries for `role_hierarchy` and `get_user_max_hierarchy`
   - Update `availableRoles` function to filter by hierarchy
   - Add query for `can_manage_user_roles` checks
   - Disable "Roles" button for users that cannot be managed
   - Update error handling for better messages

2. **`src/pages/admin/StaffDirectory.tsx`**
   - Fetch `role_hierarchy` from database
   - Replace hardcoded `ROLE_HIERARCHY` with fetched data
   - Update sorting logic

## Visual Changes

### Before
- Staff sees all roles in dropdown regardless of their rank
- Clicking assign on a higher role shows generic database error

### After
- Dropdown only shows roles at or below user's level
- "Roles" button is disabled/hidden for users with higher rank
- Clear visual indication when you cannot manage someone
- Informative tooltip explaining hierarchy restrictions

## Security Notes
- Frontend filtering is for UX only - the RLS policies remain the true security boundary
- Backend will still reject any unauthorized role assignments
- This change prevents user confusion, not security bypasses

