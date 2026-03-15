

## Plan: BotGhost Setup Guide Admin Page

### What
Create a dedicated admin page at `/admin/botghost-setup` accessible only to the primary admin (alicanimir1@gmail.com). The page will contain comprehensive, step-by-step instructions for setting up each BotGhost custom command with copy-paste configs, screenshots descriptions, and clear walkthrough steps based on BotGhost's actual Custom Command → HTTP Request workflow.

### Why
The existing `BotGhostCommandReference` component only shows raw JSON/headers but lacks the actual BotGhost UI walkthrough. This new page will be a self-contained guide you can follow without needing to reference external docs.

### Files to create/modify

1. **`src/pages/admin/BotGhostSetup.tsx`** (new) — Full setup guide page with:
   - Primary admin email gate (same pattern as GDPR Compliance page)
   - Step-by-step walkthrough sections:
     - **Prerequisites**: What you need before starting (BotGhost account, bot token, API key from Eclipse)
     - **Step 1**: Go to BotGhost Dashboard → Custom Commands → Create New
     - **Step 2**: Set command name and description
     - **Step 3**: Add an "API Request" action — configure Request Builder:
       - URL (with copy button)
       - Method: POST
       - Headers: Content-Type + x-api-key
       - Body: JSON with variables
       - Enable "Replace variables in body" and "Replace variables in HTTP Headers"
     - **Step 4**: Set response — use the variable name to build the reply embed
     - **Step 5**: Add Link Buttons where needed
   - Individual command cards for each of the 5 commands (/link, /verify, /profile, /purchases, /retrieve) with:
     - Exact JSON body (copy button)
     - Response variable name (copy button)
     - Which command options to add (e.g. 'code' for /verify, 'product' for /retrieve)
     - Embed configuration tips (thumbnail URL variable, button URL variable)
     - Whether to send as DM or channel reply
   - Troubleshooting section (common issues: missing headers, variable replacement not enabled, wrong API key)
   - API key reference (where to find/set the BOTGHOST_API_KEY)

2. **`src/components/AppRoutes.tsx`** — Add route and lazy import for the new page

3. **`src/components/admin/AdminSidebar.tsx`** — Optionally add a sidebar link (only visible to primary admin), or keep it unlisted and accessed via direct URL

### Access control
- Uses the same `user?.email === 'alicanimir1@gmail.com'` pattern used in GDPRCompliance
- Wrapped in `AdminLayout` for consistent look
- Redirects non-admin users to `/admin`

### Technical details
- Reuses the existing `CopyButton` pattern from `BotGhostCommandReference`
- Uses numbered stepper UI with cards for each step
- All endpoint URLs, headers, and JSON bodies are copy-pasteable
- Response variable naming follows BotGhost's `{requestName.response.field}` convention
- Includes the BotGhost Request Builder field mapping (URL field, Method dropdown, Headers tab, Body tab, Options checkboxes)

