

## Fix: Admin Discount Codes RLS Policies

### Problem
The `discount_codes` table has Row-Level Security (RLS) enabled but **zero policies** defined. This means no one -- not even admins -- can create, read, update, or delete discount codes. The error message "new row violates row-level security policy" confirms this.

### Solution
Add RLS policies to the `discount_codes` table that:
- Allow **public read access** for active codes (needed at checkout and on the homepage offers card)
- Allow **staff members** (any user with a role) to create, update, and delete discount codes

### Database Migration

A single migration will add 4 policies:

1. **SELECT** -- public (anonymous + authenticated) can read discount codes (already needed by checkout and homepage)
2. **INSERT** -- authenticated staff can create codes
3. **UPDATE** -- authenticated staff can update codes
4. **DELETE** -- authenticated staff can delete codes

Staff access is verified using the existing `is_staff(auth.uid())` security definer function, which checks the `user_roles` table.

### Technical Details

```sql
-- Public can read discount codes (checkout, homepage offers)
CREATE POLICY "Anyone can view discount codes"
  ON public.discount_codes FOR SELECT
  USING (true);

-- Staff can create discount codes
CREATE POLICY "Staff can create discount codes"
  ON public.discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- Staff can update discount codes
CREATE POLICY "Staff can update discount codes"
  ON public.discount_codes FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Staff can delete discount codes
CREATE POLICY "Staff can delete discount codes"
  ON public.discount_codes FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));
```

### No Code Changes Needed
The frontend code in `Promotions.tsx` is already correct -- it just needs the database policies to allow the operations through.
