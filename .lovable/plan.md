

## Resource Hints and forwardRef Fix

### 1. Add preconnect hints for third-party origins

In `index.html`, add `dns-prefetch` hints for origins used on the site but not needed immediately on page load (Stripe is lazy-loaded, Discord CDN for avatars):

- `js.stripe.com` — dns-prefetch only (Stripe SDK loads lazily on checkout pages, not worth full preconnect on every page)
- `cdn.discordapp.com` — dns-prefetch only (used for Discord server icons/avatars on landing page)

### 2. Fix the forwardRef console warning

The `next-themes` `ThemeProvider` is trying to pass a ref to the `App` component, which is a plain function component. Fix: wrap `App` with `React.forwardRef` in `App.tsx` so the ref passes through cleanly. This eliminates the repeated console warnings.

| Change | File | Impact |
|--------|------|--------|
| Add dns-prefetch for Stripe and Discord CDN | `index.html` | ~50-100ms DNS savings on checkout/avatar loads |
| Wrap App with forwardRef | `src/App.tsx` | Eliminates 3 console warnings |

