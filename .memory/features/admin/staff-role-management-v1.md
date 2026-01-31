# Memory: features/admin/staff-role-management-v1
Updated: 2026-01-31

Staff roles can now be managed directly from the Staff Profile page (`/admin/staff/{userId}`). This provides convenience since staff members are filtered out of the main Users/Customers page (which only shows users without roles).

**Role Management Features:**
1. **Add Roles**: Dropdown to select available roles with a "+" button to add. Only roles within the admin's hierarchy level are shown.
2. **Remove Roles**: "X" button on each role badge opens a confirmation dialog. Role removal respects hierarchy (only roles at or below admin's level can be removed).
3. **Hierarchy Enforcement**: 
   - Primary admin (`alicanimir1@gmail.com`) can add/remove any role
   - Other admins can only manage roles at or below their hierarchy level
   - Admin role specifically requires primary admin to assign/remove
4. **Audit Logging**: All role changes are logged to `audit_logs` table

**Data Flow:**
- Staff Directory (`/admin/staff-directory`) → shows all users with roles (read-only view)
- Staff Profile (`/admin/staff/{userId}`) → detailed view with role management
- Users/Customers (`/admin/users`) → only shows users WITHOUT roles (pure customers)
