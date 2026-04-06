

## Enterprise Sign-In Page Refinement

### Current State
The sign-in page works but lacks the polish of enterprise platforms like Stripe, Linear, or Vercel:
- Small "E" logo badge feels generic
- "Back to store" link is misaligned (top-left, no visual hierarchy)
- Form card has low contrast borders that blend into the dark background
- Social login buttons use a cramped 2x2 grid with small text
- No visual hierarchy between primary (email) and secondary (social) auth methods
- "Don't have an account? Sign Up" footer is cut off / below fold
- Overall spacing feels tight and unrefined

### Changes

**AuthLayout.tsx** — Elevate the shell
- Replace the small "E" badge with the Eclipse brand wordmark or a larger, more confident logo lockup
- Remove or restyle "Back to store" as a subtle top-left nav element with proper padding
- Increase `max-w` from `420px` to `440px` for breathing room
- Add a subtle gradient or pattern to the background for depth (like Stripe's auth pages)
- Improve vertical spacing between logo block, form, and footer

**LoginSignupForm.tsx** — Clean up the form
- Increase internal padding from `p-5` to `p-6`
- Add subtle `shadow-lg` or `shadow-xl` to the card for depth and separation
- Make the "Sign In" button taller (`h-12`) with bolder font weight
- Style the divider ("OR CONTINUE WITH") with more whitespace above/below
- Improve label typography (slightly heavier weight, better spacing)
- Ensure "Forgot password?" link aligns cleanly with the Password label

**SocialLoginButtons.tsx** — Enterprise social login layout
- Switch from 2x2 grid to a vertical stack (full-width buttons) — this is what Stripe, Linear, Vercel, and Notion all do
- Increase button height to `h-11` for better touch targets
- Add consistent icon sizing and spacing
- Use outlined/ghost style for all social buttons instead of colored backgrounds (cleaner, more professional)
- Or keep brand colors but use subtle variants (not full saturation)

**Auth.tsx** — Footer refinement
- Ensure the "Don't have an account?" toggle is always visible (not pushed below fold)
- Add more bottom padding so footer text doesn't crowd the card edge

### Files Changed
- `src/components/auth/AuthLayout.tsx` — spacing, logo, background
- `src/components/auth/LoginSignupForm.tsx` — card elevation, button sizing, spacing
- `src/components/auth/SocialLoginButtons.tsx` — vertical stack layout, refined button styles

