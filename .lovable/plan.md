

## Auto-Approve Seller Products with Smart Flagging

This plan implements automatic approval for seller products that pass all security checks, while flagging suspicious products for manual review.

### Current Behavior
- All seller products are set to `moderation_status: 'pending'` regardless of security scan results
- Security scans (NSFW image detection, Lua script analysis) happen during file upload but don't affect the moderation workflow
- Every product requires manual admin approval

### Proposed Behavior
- Products that pass all security checks are **auto-approved** and immediately announced to Discord
- Products with security flags (NSFW detected, suspicious Lua code) remain in **pending status** for manual review
- Admins can still override any decision

---

## Implementation Steps

### 1. Track Security Flags During Product Creation
Add a `moderation_flags` column to the `products` table to store any concerns detected during upload.

**Database Changes:**
- Add `moderation_flags JSONB DEFAULT NULL` column to products table

### 2. Update Product Editor to Track Security Results
Modify `SellerProductEditor.tsx` to:
- Accumulate security scan results (NSFW flags, Lua risk level, concerns)
- Store these flags in the product record when saving
- Set `moderation_status` based on whether any flags exist:
  - No flags → `approved` + `is_active: true`
  - Has flags → `pending` + `is_active: false`

### 3. Auto-Announce Approved Products
When a product is auto-approved:
- Trigger the `send-product-drop-webhook` edge function automatically
- This happens in the save mutation's `onSuccess` handler

### 4. Update Admin View to Show Flags
Modify `SellerProducts.tsx` to:
- Display detected flags for pending products
- Show why a product was flagged (NSFW concern, Lua risk, etc.)

---

## Technical Details

### Product Save Logic Flow

```text
+------------------+     +-------------------+     +------------------+
|  Upload Files    | --> | Security Scans    | --> | Track Results    |
|  (Images/Assets) |     | (NSFW + Lua)      |     | (Store flags)    |
+------------------+     +-------------------+     +------------------+
                                                           |
                                                           v
                         +-------------------+     +------------------+
                         | Auto-Approved     | <-- | Any Flags?       |
                         | + Discord Announce|     | NO               |
                         +-------------------+     +------------------+
                                                           |
                                                           v (YES)
                         +-------------------+
                         | Pending Review    |
                         | (Manual Approval) |
                         +-------------------+
```

### Files to Modify
1. **Database Migration** - Add `moderation_flags` column
2. `src/pages/seller/SellerProductEditor.tsx` - Track flags and auto-approve logic
3. `src/pages/seller/SellerProducts.tsx` - Similar changes for the alternate product creation flow
4. `src/pages/admin/SellerProducts.tsx` - Display flagged reasons for pending products

### Edge Cases Handled
- If Discord announcement fails, product is still approved (non-blocking)
- Products with medium-risk Lua (warnings) go to pending for review
- High-risk Lua blocks the upload entirely (existing behavior)
- Failed security scans default to pending for safety

