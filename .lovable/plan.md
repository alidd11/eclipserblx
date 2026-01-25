
# Add More Spacing Between Text Sections in Discord Embed

## Problem
The current description parsing collapses all multiple newlines to single newlines, making the embed text too compact. The user wants more breathing room between major sections (like between "Features List" and "Bundle Includes").

## Solution
Modify the HTML-to-text conversion logic to preserve paragraph-level spacing while keeping list items compact.

### Changes to `supabase/functions/send-product-discord-webhook/index.ts`

**Current logic (too compact):**
```typescript
.replace(/<\/p>/gi, "\n")    // Single newline after paragraphs
.replace(/\n{2,}/g, "\n")    // Collapse ALL double newlines
```

**New logic (balanced spacing):**
```typescript
.replace(/<\/p>/gi, "\n\n")  // Double newline after paragraphs (sections)
.replace(/\n{3,}/g, "\n\n")  // Collapse 3+ newlines to double (not all)
```

This preserves double-spacing between major sections (paragraphs) like:
- "Features List" → gap → "Bundle Includes"
- "Bundle Includes" → gap → "Savers Disclaimer"

While keeping bullet points within a list compact with single spacing.

---

## Technical Details

| Element | Current | New |
|---------|---------|-----|
| End of `</p>` tag | `\n` (single) | `\n\n` (double) |
| End of `</li>` tag | `\n` (single) | `\n` (single) - unchanged |
| End of `<br>` tag | `\n` (single) | `\n` (single) - unchanged |
| Collapse rule | `\n{2,}` → `\n` | `\n{3,}` → `\n\n` |

The collapse rule change means we only reduce 3+ consecutive newlines down to 2, preserving intentional paragraph breaks.
