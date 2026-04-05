

## Clean Up Duplicate Search & Category Elements on Homepage

### The Problem
The homepage stacks four discovery elements above the fold:
- Header search (global)
- Hero search bar (landing-specific)
- GlobalCategoryBar (global, but hidden on /products)
- CategoryQuickNav (landing-specific)

Two search bars and two category rows are redundant and push actual products further down.

### The Fix

1. **Remove the search bar from LandingHero** — The header already has search, and tapping it opens the full-screen search takeover. The hero should just be headline + CTA buttons. Remove the `<button onClick={() => navigate('/search')}>` block from both desktop and mobile layouts in `LandingHero.tsx`.

2. **Remove CategoryQuickNav from the landing page** — The GlobalCategoryBar in the header already provides category navigation on every page (including the homepage). Remove the `<CategoryQuickNav />` import and usage from `Landing.tsx`.

3. **Ensure GlobalCategoryBar shows on the homepage** — Currently it hides on `/products` but shows everywhere else. Verify it renders on `/` (the landing page). It already does based on the code — no change needed.

### Result
- One search entry point (header)
- One category bar (GlobalCategoryBar below header)
- Hero becomes a tight headline + "Browse" / "Sell" CTA
- Products appear higher on screen, improving engagement

### Files Changed
- `src/components/landing/LandingHero.tsx` — Remove search bar button from both desktop and mobile sections
- `src/pages/Landing.tsx` — Remove `CategoryQuickNav` import and usage

