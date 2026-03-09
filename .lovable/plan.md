
## Plan: iOS PWA Anti-Zoom Fix + AdminChat Gesture Consistency

### Problem
1. **Missing `data-gesture-exempt`** on AdminChat input pill div (line 1200-1203) — StaffMessages has it, AdminChat doesn't
2. **iOS auto-zoom on input focus** — iOS Safari zooms when inputs have `font-size < 16px`. The base `Input` component uses `text-sm` (~14px) by default, requiring every usage to override via inline `style={{ fontSize: '16px' }}`

### Solution
**Two-part permanent fix:**

1. **Add missing `data-gesture-exempt`** to AdminChat input pill div for consistency with StaffMessages

2. **Fix Input/Textarea components globally** — Change base font size to `16px` to prevent iOS zoom system-wide:
   - `src/components/ui/input.tsx`: Replace `text-sm` with `text-base` (16px)
   - No need to change textarea.tsx — it already uses `text-base`

This eliminates the need for every input instance to manually add `style={{ fontSize: '16px' }}` and prevents iOS auto-zoom across the entire app.

### Files to Edit
| File | Change |
|------|--------|
| `src/components/ui/input.tsx` | Replace `text-sm` with `text-base` |
| `src/pages/admin/AdminChat.tsx` | Add `data-gesture-exempt="true"` to input pill div |

### Technical Note
iOS Safari auto-zooms when a focused input has computed font-size below 16px. By making the base Input component 16px, all forms, search bars, and chat inputs inherit the correct size without per-instance overrides.
