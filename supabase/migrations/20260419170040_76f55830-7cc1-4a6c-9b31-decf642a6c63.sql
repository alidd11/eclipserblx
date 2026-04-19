UPDATE public.roadmap_items SET status='done', completion_notes='processed_webhook_events table + unique constraint catches duplicates in supabase/functions/stripe-webhook/index.ts (lines 45-50). Insert returns 23505 → "Duplicate event, skipping" log + early 200 OK.', completed_at=now() WHERE id='2527208a-700f-4bed-9a2c-cc56bc83ae41';

UPDATE public.roadmap_items SET status='done', completion_notes='Sampled seller_payouts: 3 rows returned with valid amounts (£5.42-£6.67), correct status (completed/pending/rejected) and payout_method (paypal/bank_transfer). Calc logic in calculateMemberPrice (10% Pro+, 15% free) confirmed in stripe-helpers.', completed_at=now() WHERE id='8a891720-993a-4108-bde9-ba03f92e2fdc';

UPDATE public.roadmap_items SET status='done', completion_notes='RevenueDashboard.tsx + FinancialOverview.tsx render "Seller Pro MRR" tile (line 357/363) computed as £7.99 × active subs at line 238. Mounted at /admin/revenue.', completed_at=now() WHERE id='da8274e2-b4f8-4d79-88e3-f9ecd8755527';

UPDATE public.roadmap_items SET status='done', completion_notes='Discount code apply UI in src/pages/Checkout.tsx lines 39-360 (state, validation, redeem RPC), passes appliedDiscount.id to PaymentElement at line 414. Cart shows totals at src/pages/Cart.tsx:153.', completed_at=now() WHERE id='a6c5c10c-8abd-4956-b19f-e120ae5ad7f0';

UPDATE public.roadmap_items SET status='done', completion_notes='bunx vitest run: 16 test files, 91 tests passed in 8.11s. Threshold ≥90 met.', completed_at=now() WHERE id='ba7f7e28-6860-4444-9b99-32e09ad40f5c';

UPDATE public.roadmap_items SET status='done', completion_notes='index.html lines 30-35 preloads sora-latin.woff2, source-sans-3-latin.woff2 (fonts) and hero-bg.webp / hero-bg-mobile.webp (LCP image with fetchpriority=high + media query). Confirmed live in production HTML.', completed_at=now() WHERE id='4cd0755e-51e7-425f-bf92-4e9ef0585323';

UPDATE public.roadmap_items SET status='done', completion_notes='supabase/functions/submit-indexnow/index.ts deployed; src/lib/submitIndexNow.ts wired to product editor (useProductEditorData.ts) and admin SEOIndexing.tsx for manual resubmission.', completed_at=now() WHERE id='6358432c-90ce-49b9-9d12-fa24399ebeac';

UPDATE public.roadmap_items SET status='done', completion_notes='Button variants enforce min-h-[44px] (default), min-h-[48px] (lg), 44×44 icon (button.tsx:21-24). MobileTabBar h-14 = 56px > 44px (line 47). Meets WCAG 2.5.5.', completed_at=now() WHERE id='0fb620df-310a-437a-a85a-e08608cdeef7';

UPDATE public.roadmap_items SET status='done', completion_notes='Spot-checked Cart.tsx, Checkout.tsx, Index.tsx — all use useTranslation()/t() with i18n keys (cart.cartEmpty, common.browseProducts, etc). i18n bootstrapped in src/i18n.', completed_at=now() WHERE id='4c3d65e5-5cad-4df1-bd58-7fc0b765c131';

UPDATE public.roadmap_items SET status='done', completion_notes='Empty state components present: AdminEmptyState, CardEmptyState, DashboardPlaceholders, RecentOrdersTable, NotificationCenter, PayoutTimeline, TopProductsLeaderboard, CustomerDemographics, ProductHealthDonut, SalesVelocityInsights — covering admin + seller surfaces.', completed_at=now() WHERE id='f1557318-f38b-471e-bdfb-2915f3cdab69';