

# Seller File Privacy: Consent-Based Admin Access

## Overview

Currently, Eclipse staff have unrestricted access to all files in the `product-assets` storage bucket. This plan implements a "sealed envelope" model where seller files are inaccessible to staff unless:

1. The product is **flagged** by the automated security scan
2. The seller is **notified** of the flag
3. The seller **acknowledges** and consents to the file being reviewed

Until the seller consents, even admins cannot view/download the flagged file.

---

## How It Works

```text
Seller uploads product
        |
   [Auto-scan runs]
        |
   +----+-----+
   |           |
 Clean      Flagged
   |           |
 Auto-       Set moderation_status = 'pending'
 approved    Store flag details
   |           |
   Done      Notify seller (in-app + email)
               |
          Seller sees notification
               |
          Seller acknowledges
          ("I consent to file review")
               |
          file_review_consented_at = NOW()
               |
          Admin can now view/download file
               |
          Admin approves or rejects
```

---

## Database Changes

**Add columns to `products` table:**
- `file_review_consented_at` (timestamptz, nullable) -- when seller agreed to let staff view the file
- `file_review_requested_at` (timestamptz, nullable) -- when the flag notification was sent

**Create a `seller_notifications` table** for in-app notifications:
- `id`, `user_id`, `type`, `title`, `message`, `product_id`, `action_url`, `read_at`, `acknowledged_at`, `created_at`

---

## Storage Policy Changes

1. **Remove** the broad "Staff can manage product assets" policy that gives admins unrestricted access
2. **Replace** with a conditional policy that only allows admin SELECT on `product-assets` when:
   - The file belongs to a product where `file_review_consented_at IS NOT NULL`
   - OR the file belongs to the requesting user's own store (seller managing their own files)
3. Keep the service role access for the download edge function (it uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS)

---

## Frontend Changes

### 1. Seller Dashboard -- Notification Banner
- When a product is flagged, show a prominent notification on the seller dashboard
- Include a clear explanation: "Your product [name] has been flagged for security review. To proceed, you must consent to Eclipse staff reviewing the file."
- Consent button that sets `file_review_consented_at`
- Until consent is given, the product remains in "pending" but the file is sealed from admin access

### 2. Admin Seller Products Page
- For flagged products where `file_review_consented_at IS NULL`:
  - Show a "Waiting for Seller Consent" badge
  - Disable the file download/preview button
  - Show when the notification was sent
- For flagged products where `file_review_consented_at IS NOT NULL`:
  - Enable file review as normal
  - Show consent timestamp for audit trail

### 3. Seller Notification Component
- New component in the seller dashboard for managing review consent requests
- Displays the specific flags that triggered the review
- Clear legal language about what consenting means

---

## Email Notification

- When a product is flagged, send an email to the seller via the existing Resend integration
- Subject: "Action Required: Product Review for [Product Name]"
- Body explains the flag reason (without exposing scan internals) and links to the consent page

---

## Edge Function Changes

- Update the `analyze-lua-script` / security scan flow to set `file_review_requested_at` when flagging a product
- Create a new edge function `notify-seller-review` that sends the email notification

---

## What This Does NOT Change

- Seller upload flow remains identical
- Auto-approval of clean products is unaffected
- Customer downloads are unaffected (uses service role key)
- Discord bot downloads are unaffected
- Product images (public bucket) remain accessible -- this only applies to downloadable asset files
- The existing moderation approval/rejection workflow stays the same, it just can't start until consent is given

---

## Technical Details

**New DB function for storage policy:**
```sql
CREATE OR REPLACE FUNCTION public.product_file_review_consented(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products
    WHERE asset_file_url = file_path
      AND file_review_consented_at IS NOT NULL
  )
$$;
```

**Updated storage policy (replaces current admin access):**
```sql
CREATE POLICY "Staff can access consented product assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'product_manager')
  )
  AND public.product_file_review_consented(name)
);
```

**Seller consent API call:**
```typescript
await supabase.from('products')
  .update({ file_review_consented_at: new Date().toISOString() })
  .eq('id', productId)
  .eq('stores.owner_id', user.id); // RLS ensures only the seller can consent
```

