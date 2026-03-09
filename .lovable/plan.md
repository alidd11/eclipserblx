
# Fix: White Blank Page on iOS Safari/PWA

## Root Cause Identified

**Primary Issue**: `AppRoutes` is wrapped in `forwardRef` but never uses the ref (line 224: `forwardRef<HTMLDivElement>(function AppRoutes(_, _ref)`). This triggers the "Function components cannot be given refs" error that can break React's rendering on iOS Safari.

**Secondary Issues**:
1. Service worker only shows offline page when network *fails completely* — HTTP 522 responses (which you're receiving) are treated as valid responses, resulting in blank screen
2. `useAppVersionCheck` may cause reload loops if iOS blocks localStorage (common in PWA/private mode)

---

## Implementation Plan

### 1. Remove unnecessary `forwardRef` from AppRoutes
**File**: `src/components/AppRoutes.tsx`
- Convert from `forwardRef<HTMLDivElement>(function AppRoutes(_, _ref) {...})` 
- To: simple `export function AppRoutes() {...}`
- The ref is never used, so removing it eliminates the warning and potential crash

### 2. Service worker: Handle 5xx/522 as failures
**File**: `public/custom-sw.js`
- In the fetch handler, check `response.ok` or `response.status < 500`
- If server returns 5xx, treat it like network failure → show offline page
- This prevents blank white screens when origin is unreachable

### 3. Harden version check for iOS storage issues  
**File**: `src/hooks/useAppVersionCheck.ts`
- Add a reload-attempt counter stored in URL params
- If storage keeps failing and we've reloaded 2+ times, abort the update loop
- Prevents infinite reload cycle on iOS PWA

---

## Files Changed
| File | Change |
|------|--------|
| `src/components/AppRoutes.tsx` | Remove `forwardRef` wrapper |
| `public/custom-sw.js` | Treat 5xx responses as network failures |
| `src/hooks/useAppVersionCheck.ts` | Add reload loop protection |

---

## Expected Result
- ✅ No more "Function components cannot be given refs" error
- ✅ 522 errors show offline page instead of blank white
- ✅ iOS PWA won't get stuck in reload loops
