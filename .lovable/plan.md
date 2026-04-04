
# Visually Improve the Existing Homepage

Based on the current desktop screenshot and comparing with ClearlyDev's polished look, here are targeted visual improvements:

## 1. Hero Section Polish
- **Larger, bolder heading** on desktop — currently `text-5xl`, bump to `text-6xl` with tighter tracking
- **More generous vertical padding** — the hero feels compact, give it `lg:py-20` to fill the viewport better
- **Subtler subtitle** — increase max-width so the description text doesn't wrap as tightly
- **Stronger CTA glow** — enhance the Browse Marketplace button shadow

## 2. Discord Community Banner
- Add a subtle gradient border or glow effect to the Discord CTA card so it pops more
- Make the "JOIN →" button more prominent (primary variant instead of text link)

## 3. Top Creators Section
- Add subtle hover cards with elevation on hover
- Show store logos larger with a soft border ring

## 4. Section Headers
- Make section titles larger on desktop (`lg:text-xl`)
- Add a subtle divider line or left border accent to section headers for visual hierarchy

## 5. Trending Tags
- Give the trending tag pills slightly more contrast — currently they blend into the background
- Add hover elevation/shadow effect

## 6. Category Bar Polish
- Increase pill size on desktop (`lg:text-sm lg:px-4 lg:py-2`)
- Add active indicator bar (bottom border) instead of just background color change

## 7. Footer Alignment
- Ensure footer content respects the same `max-w-[1400px]` container

---

## Files to Modify
| File | Change |
|------|--------|
| `LandingHero.tsx` | Larger heading, more padding, stronger CTA |
| `GlobalCategoryBar.tsx` | Larger pills on desktop, active indicator |
| `DiscordCTA.tsx` | More prominent design |
| `TopSellers.tsx` | Better hover effects, larger logos |
| `WhyEclipse.tsx` | Bigger badge pills on desktop |
| `Footer.tsx` | Max-width container |

## Technical Notes
- No database changes
- No new dependencies
- Pure CSS/Tailwind visual refinements
- ~6 files modified
