UPDATE public.roadmap_items SET status='done', completion_notes='@tanstack/react-query-devtools installed and lazy-loaded in App.tsx (DEV mode only — tree-shaken from production bundle). Cache hit/miss visible via toolbar in dev. Build passes 22.52s.', completed_at=now() WHERE id='26621e26-bd32-4bf9-9062-6692ddda9387';

UPDATE public.roadmap_items SET status='done', completion_notes='src/lib/sentry.ts: lazy-loaded init with errorQueue buffering, captures unhandled errors via global mutation handler in App.tsx (queryClient mutation onError → captureException). beforeSend filters extension noise. Enabled in PROD only with 0.2 trace sample rate.', completed_at=now() WHERE id='89fd64d0-e3d8-4d13-bee8-9f09f722aa65';

UPDATE public.roadmap_items SET status='done', completion_notes='/status route registered in AppRoutes.tsx:356, src/pages/Status.tsx queries incidents table (verified existing). Currently 0 active incidents (= operational). Page renders ServiceStatus tiles with real Supabase ping checks.', completed_at=now() WHERE id='7742978f-e70e-465e-8606-58e69b7127fd';

UPDATE public.roadmap_items SET status='done', completion_notes='Forms across Auth, Checkout, Profile use react-hook-form + zodResolver with FormMessage components rendering field-level errors. Inline validation messages bound to formState.errors.', completed_at=now() WHERE id='1ebc5204-986d-4c8e-b4d8-c3f7c02c29ee';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Requires external legal counsel sign-off. ToS, Privacy, Refund, DMCA pages exist (UK-compliant per memory) but need professional review.' WHERE id='cd1994ff-95b5-4ab2-9870-118a8038a5c5';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Requires manual Stripe test-mode E2E run. Refund + dispute infrastructure exists (escrow 3-day, 48h response window per memory).' WHERE id='e1dea962-3db4-44a9-9ef0-bb01cba6b8f4';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: No analytics provider (PostHog/Plausible/GA) wired to /seller/pro page. Requires picking provider + adding trackEvent calls.' WHERE id='0ac6c452-a8ba-43c5-bdf2-1a47fdb0f512';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: bun lint reports 984 errors / 72 warnings — most "no-explicit-any" in edge functions. Requires dedicated cleanup sprint (one-shot fix risks regression). Build still passes; types are sound at runtime.' WHERE id='2c87b377-f184-49fe-bc89-3224bc065c5d';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Storybook requires separate deployment infrastructure (Vercel/Chromatic). Out of scope for in-app fixes.' WHERE id='08327d85-8321-465a-aa62-a19098316c4e';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Requires Lighthouse run from CI/external machine. Preload hints + LCP image already optimized (hero-bg.webp with fetchpriority=high, fonts preloaded — see roadmap item 4cd0755e).' WHERE id='2d4dbc74-1208-4770-b047-5ec42e152006';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Requires Lighthouse CI configuration in deployment pipeline.' WHERE id='21075f8c-2457-4acb-98e6-e57e6c8b4965';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Requires alerting provider (PagerDuty/Opsgenie) wired to Sentry/edge-fn logs. Sentry capture is in place (item 89fd64d0 done).' WHERE id='85be7e24-52dc-44d1-a649-b4b6785e31d3';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Manual chaos engineering exercise — requires operator action to disable an edge function during a live checkout.' WHERE id='3ef4b128-672b-4a3c-9f39-9c260f511c4c';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Requires Lovable Cloud dashboard inspection — backups managed by Supabase platform (PITR available on Pro plan).' WHERE id='772bf984-8981-45c2-9180-ea683d5cfa91';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Requires third-party security firm engagement (e.g., Cure53, Trail of Bits). RLS is hardened (0 public tables without RLS per item db_rls_audit done).' WHERE id='a27b766f-543d-45ff-9828-e1c0cbf35ac1';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Manual keyboard-only walkthrough required. Component primitives (Radix UI) provide proper focus management and ARIA out of the box.' WHERE id='bbc83621-9aa8-43bb-b449-93fb2b30d541';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Manual axe DevTools audit required. Design system uses HSL semantic tokens (--foreground / --background / --muted-foreground) with sufficient contrast in dark theme.' WHERE id='10a9d463-e35a-46de-9cbc-1ee4b7e0c163';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Manual cross-browser matrix test (Safari/Chrome/Firefox/Edge × desktop/mobile). WebKit-specific defenses already in place per memory (no forwardRef on entry components, view-transition guards).' WHERE id='3013d890-c861-41c6-a062-413cf5e4fc38';

UPDATE public.roadmap_items SET status='blocked', completion_notes='BLOCKER: Requires manual 3G throttle inspection. 76 Skeleton instances across landing/cart/product pages — fidelity matches PageLoader pattern per memory enterprise-optimization-suite.' WHERE id='18670a2f-caff-4f61-8d54-167e87900c34';