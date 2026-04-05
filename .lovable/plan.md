

## Enterprise File Security for Seller Products

### What's Already in Place
Your current system has solid foundations: one-time download tokens (5-min expiry), rate limiting (5/day per product, 15/hr global), Lua watermarking with traceable hashes, purchase verification, IP logging, atomic token claiming, and file security scanning. These cover the basics well.

### Gaps at Enterprise Level

1. **Non-Lua files have zero watermarking** — .rbxm, .rbxl, images, and other assets are served as raw originals. If a buyer leaks them, there's no way to trace the source.
2. **Signed URL sharing** — Within the 5-minute window, a buyer can share the download URL with anyone (no IP or session binding).
3. **No download fingerprinting** — Beyond the Lua watermark hash, there's no invisible metadata embedded in binary files to trace leaks.
4. **No proactive leak detection** — The platform doesn't scan external sources for leaked assets.

### Proposed Enhancements (3 changes)

**1. IP-Bound Token Redemption**
Lock each download token to the IP that generated it. When the token is redeemed via GET, verify the requester's IP matches the IP recorded at token creation. This prevents URL sharing — even within the 5-minute window.

- Add `creator_ip` column to `download_tokens`
- Record IP at token creation time
- Verify IP match at redemption (with a configurable toggle per store for sellers who want strict vs relaxed)

**2. Binary File Fingerprinting (Steganographic Metadata)**
For non-Lua files (.rbxm, .rbxl, images, zip archives), inject an invisible buyer fingerprint before serving:

- **Images**: Embed a unique buyer hash in EXIF metadata and LSB (least-significant-bit) steganography
- **Roblox binary files (.rbxm/.rbxl)**: Append a trailing metadata block with an encoded buyer hash (Roblox Studio ignores trailing data)
- **ZIP/archive files**: Add a hidden file (`.eclipse-license`) containing the buyer's watermark ID inside the archive
- All fingerprints use the same `ECL-XXXXXXXX` format already used for Lua watermarking, linking to the `download_logs` audit trail

Implementation: Extend the `download-asset` edge function with format-specific fingerprinting handlers that run before the signed URL is generated.

**3. Leak Detection Registry & Seller Alerts**
Allow sellers to submit file hashes of suspected leaked copies. The system cross-references the embedded fingerprint to identify the buyer:

- New `leak_reports` table: `id, store_id, product_id, reported_file_hash, extracted_fingerprint, matched_user_id, status, created_at`
- New edge function `report-leak` that accepts a file upload, extracts the embedded fingerprint, and resolves it to a buyer
- Seller dashboard panel showing leak reports with matched buyer info (anonymized until confirmed)
- Auto-flag buyers with multiple confirmed leaks

### Database Changes

```sql
-- Add IP binding to download tokens
ALTER TABLE download_tokens ADD COLUMN creator_ip text;

-- Leak detection registry
CREATE TABLE leak_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  reported_by uuid REFERENCES auth.users(id) NOT NULL,
  file_hash text,
  extracted_fingerprint text,
  matched_user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','dismissed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leak_reports ENABLE ROW LEVEL SECURITY;
```

### Files Changed
- `supabase/functions/download-asset/index.ts` — Add `creator_ip` recording, IP verification on redemption, binary fingerprinting for images/rbxm/zip
- `src/pages/seller/SellerOrders.tsx` or similar — Add leak report submission UI
- New `supabase/functions/report-leak/index.ts` — Accept file, extract fingerprint, resolve buyer
- Migration for `creator_ip` column and `leak_reports` table

### What This Achieves
- **Traceability**: Every downloaded file (not just Lua) carries an invisible, unique buyer fingerprint
- **Prevention**: IP-bound tokens stop casual URL sharing
- **Detection**: Sellers can identify exactly which buyer leaked their assets
- **Deterrence**: Buyers know their identity is embedded in every download

