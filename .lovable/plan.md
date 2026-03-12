

# Making Eclipse a Production-Ready Website

Based on your selections, here is a prioritized roadmap across the five areas. I will tackle them in order of impact.

---

## Phase 1: Performance & Core Web Vitals (Immediate)

Profile the live site to identify the actual bottlenecks (LCP element, INP offenders, CLS shifts), then fix:

- **LCP**: Audit hero image loading strategy; ensure critical-path CSS is truly minimal; verify font `preload` is effective and not competing with hero image bandwidth.
- **INP**: Identify heavy event handlers (search, filters, modals) and defer non-critical work with `requestIdleCallback` or `startTransition`.
- **CLS**: Add explicit `width`/`height` to all dynamic content containers (product cards, store logos, ad banners) to prevent layout shifts during load.
- **Bundle audit**: Check if `framer-motion` is leaking into the critical path despite lazy-loading config; verify tree-shaking of `lucide-react` icons.

I will use the browser performance profiler on the live homepage to get concrete numbers before making changes.

---

## Phase 2: Notifications — Email + Push (High Impact)

### Transactional Emails
Set up branded transactional emails for key events:
- Order confirmation (buyer receives)
- New order alert (seller receives)
- Dispute filed notification
- Payout processed confirmation

This uses the existing email domain infrastructure with `scaffold_transactional_email`.

### Push Notifications
The push infrastructure (`custom-sw.js`, Capacitor push plugin) already exists. Complete the pipeline:
- Wire up server-side push triggers for: new orders, new messages, dispute updates, support ticket replies
- Add a notification preferences page (already exists at `/notification-preferences`) to control which events trigger push vs email

---

## Phase 3: Seller Onboarding Flow (Medium Impact)

Create a guided setup wizard at `/seller/onboarding` that walks new sellers through:
1. Store name, description, logo upload
2. Payment setup (Stripe Connect)
3. First product upload with validation guidance
4. Domain setup (optional)

Track progress in a `store_onboarding_progress` table. Show a progress bar in the seller dashboard until all steps are complete.

---

## Phase 4: Mobile App Polish (Ongoing)

- Fix iOS PWA-specific issues: keyboard avoidance on chat inputs, pull-to-refresh conflicts with scroll containers, safe-area inset gaps on newer iPhones
- Improve touch targets to meet 48px minimum on all interactive elements
- Add haptic feedback patterns for key actions (add to cart, purchase complete)
- Audit the installed PWA experience: splash screen timing, app switching behavior, deep link handling

---

## Phase 5: Admin Tools & Moderation (Foundation)

- **Content moderation queue**: Unified view for pending products, reported reviews, flagged users with bulk actions
- **User management**: Search users, view purchase history, manage bans, impersonate (read-only) for support
- **Dispute resolution**: Structured workflow with evidence timeline, one-click refund/reject, seller notification

Much of the admin infrastructure already exists. This phase is about consolidating scattered tools into a cohesive dashboard.

---

## Recommended Starting Point

I suggest starting with **Phase 1 (Performance)** since it directly impacts SEO ranking and user retention. I will profile the homepage, identify the top 3 bottlenecks, and fix them. After that we move to notifications.

Shall I begin with the performance profiling?

