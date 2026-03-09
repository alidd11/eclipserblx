

## Plan: Restore Hero Background Image

The uploaded image will replace the current hero backgrounds. Since the site references `.webp` files for both desktop and mobile, and there's also a `.jpeg` fallback:

### Steps
1. **Copy uploaded image** to `public/hero-bg.webp` (desktop) — this replaces the corrupted/re-processed version
2. **Copy uploaded image** to `public/hero-bg-mobile.webp` (mobile) — same image, used on smaller screens
3. **Copy uploaded image** to `public/hero-bg.jpeg` (existing JPEG fallback)

The `HeroBanner.tsx` component is already correctly set up with `<picture>`, `fetchPriority="high"`, and `decoding="async"` — no code changes needed. This is purely an asset restoration.

> Note: Ideally the mobile version would be a smaller crop/resolution for faster loading on phones, but I'll use the same image for both since that's what you've provided. If you have a separate mobile-optimized version, share it and I'll swap it in.

