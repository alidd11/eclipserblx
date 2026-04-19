
CREATE TABLE public.roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  pillar TEXT NOT NULL CHECK (pillar IN ('performance','security','ux','seo','reliability','code','business')),
  priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0','P1','P2')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
  verification_probe TEXT,
  completion_notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roadmap_items_pillar ON public.roadmap_items(pillar);
CREATE INDEX idx_roadmap_items_status ON public.roadmap_items(status);

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead admin can view roadmap"
  ON public.roadmap_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Lead admin can insert roadmap"
  ON public.roadmap_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Lead admin can update roadmap"
  ON public.roadmap_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'lead_administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Lead admin can delete roadmap"
  ON public.roadmap_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'lead_administrator'));

CREATE OR REPLACE FUNCTION public.roadmap_items_set_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_roadmap_items_timestamps
  BEFORE INSERT OR UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.roadmap_items_set_timestamps();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;

INSERT INTO public.roadmap_items (pillar, priority, title, description, verification_probe, display_order) VALUES
('performance','P0','Achieve LCP < 2.5s on Landing','LCP must stay under 2.5s on 4G mobile across Landing, ProductDetail, StorePage.','Run Lighthouse on /, /products, /store/:slug.', 1),
('performance','P0','Eliminate forwardRef warning in ForYouSection','Console shows "Function components cannot be given refs" for ForYouSection.','Open DevTools console on /index — expect zero warnings.', 2),
('performance','P0','Bundle size budget < 300KB initial JS','Initial chunk gzipped must be under 300KB.','Run bun run build and inspect dist/ chunk sizes.', 3),
('performance','P1','Image proxy hit-rate > 90%','All product/store images route through optimizeImageUrl with width/quality params.','grep src/ for raw supabase storage URLs in <img> tags.', 4),
('performance','P1','Preload critical fonts + LCP image','Inject <link rel="preload"> for the hero font and above-the-fold image.','curl -I production HTML and check for preload hints.', 5),
('performance','P2','React Query cache hit-rate panel','Devtools-only panel showing cache hits vs network fetches.','Manual inspection in dev mode.', 6),
('security','P0','Supabase linter: zero errors','Database linter must report zero errors and acknowledge every warning.','Run the Supabase linter — record output in completion_notes.', 10),
('security','P0','RLS audit on every public table','Every table in public schema must have RLS enabled with at least one policy.','SELECT tablename FROM pg_tables WHERE schemaname=public AND rowsecurity=false;', 11),
('security','P0','No PII leakage in public views','Audit *_public, *_safe views — no emails/PII exposed to anon role.','SELECT column_name FROM information_schema.columns WHERE table_name LIKE %_public AND column_name ILIKE %email%;', 12),
('security','P0','Edge function JWT validation everywhere','All non-public edge functions validate JWT in code (signing-keys system).','grep functions/*/index.ts for Authorization header validation.', 13),
('security','P1','Rate-limiter coverage 100% on auth/sensitive endpoints','Every login, signup, password reset, payment endpoint enforces rate limits.','grep edge functions for rate-limit middleware imports.', 14),
('security','P1','CSP report-only deployment','Add Content-Security-Policy-Report-Only header to capture violations.','curl -I production URL — verify header present.', 15),
('security','P1','GDPR data-export + deletion endpoints','User can export all data and request account deletion via Account page.','Manual test from Account page.', 16),
('security','P2','Third-party penetration test','Commission a pentest before public launch.','Receive and review pentest report.', 17),
('ux','P0','WCAG AA contrast audit','Every text/background combo meets 4.5:1 (normal) or 3:1 (large) contrast.','Run axe DevTools on Landing, ProductDetail, Cart, Checkout, Account.', 20),
('ux','P0','Keyboard navigation everywhere','Tab through every page — focus rings visible, no traps, logical order.','Manual keyboard-only walkthrough of top 10 pages.', 21),
('ux','P0','Designed empty states everywhere','Every list/grid has a designed empty state.','Visit each major page in a fresh account with no data.', 22),
('ux','P1','Mobile touch targets >= 44px','All buttons, links, inputs are 44x44px minimum on mobile.','Audit ProductCard, MobileTabBar, Cart with DevTools mobile mode.', 23),
('ux','P1','Skeleton fidelity matches real layout','Page skeletons match final layout to prevent CLS.','Throttle network to slow 3G and inspect each skeleton transition.', 24),
('ux','P1','Form validation messages — clear and actionable','Every form (auth, checkout, profile) shows specific helpful errors.','Submit each form with invalid data and review messages.', 25),
('ux','P2','Internationalization audit','All user-visible strings flow through i18n; no hardcoded English in JSX.','grep src/pages for hardcoded strings outside i18n keys.', 26),
('seo','P0','Sitemap.xml generated and submitted','Dynamic sitemap covers all public products, stores, categories, articles.','curl /sitemap.xml — verify 200 + content.', 30),
('seo','P0','Unique title + meta description per page','Every public route has unique title (<60 chars) and description (<160 chars).','Crawl site and dedupe titles/descriptions.', 31),
('seo','P0','JSON-LD on Product, Store, Article pages','Schema.org Product, Organization, BreadcrumbList where applicable.','Use Google Rich Results Test on /products/:slug.', 32),
('seo','P1','Open Graph + Twitter Cards on share-worthy pages','og:title, og:description, og:image set per page.','Use Twitter Card Validator and Facebook Sharing Debugger.', 33),
('seo','P1','Robots.txt + canonical tags audit','Non-canonical domains noindex; canonicals point to eclipserblx.com.','curl HTML from preview domain — verify noindex meta.', 34),
('seo','P2','Submit IndexNow on every publish','IndexNow ping fires when new product/store goes live.','Check edge function logs for indexnow-submit.', 35),
('reliability','P0','Sentry capturing 100% of unhandled errors','Frontend (window.onerror + boundary) and edge functions report to Sentry.','Trigger known error and confirm it appears in Sentry within 60s.', 40),
('reliability','P0','Status page reflects real uptime','/status pulls from real health checks, not hardcoded.','Check /status — verify timestamps update.', 41),
('reliability','P0','Database backup verification','Confirm Supabase PITR enabled + take a test restore to staging.','Supabase dashboard > Database > Backups: verify retention.', 42),
('reliability','P1','Health-check endpoint per critical edge function','Each function exposes /healthz returning 200 + version.','curl each function /healthz.', 43),
('reliability','P1','Alerting on 5xx + payment-failure spike','Alert when error rate > 1% for 5 minutes.','Trigger synthetic 5xx surge and confirm alert fires.', 44),
('reliability','P2','Chaos test — kill an edge function mid-checkout','Verify retry/idempotency keeps order state consistent.','Manually disable function and replay checkout.', 45),
('code','P0','Zero TypeScript errors in build','bun run build completes with zero TS errors.','Run bun run build — expect exit code 0.', 50),
('code','P0','Zero ESLint errors','bun lint reports 0 errors (warnings allowed but tracked).','bun lint exit code 0.', 51),
('code','P0','Test suite >= 90 tests passing','Frontend + edge function tests both green.','Run vitest and supabase test_edge_functions — both pass.', 52),
('code','P1','No file > 1000 lines','Enforced enterprise modularization standard.','find src -name *.tsx -exec wc -l {} + | awk $1>1000', 53),
('code','P1','any count <= 65','Reduce explicit any usage to documented practical floor.','grep -r : any src | wc -l', 54),
('code','P2','Storybook for design system primitives','Catalog of buttons, inputs, cards for visual regression.','Manual inspection of storybook deployment.', 55),
('business','P0','Stripe webhook idempotency verified','Replay a webhook event twice — order/balance must not double-process.','Use Stripe CLI to resend checkout.session.completed.', 60),
('business','P0','Refund + dispute flows end-to-end test','Issue refund and dispute on a real order; verify balances + notifications.','Manual end-to-end test in Stripe test mode.', 61),
('business','P0','Seller payout calculation audit','Verify commission %, fees, VAT applied correctly across 10 sample orders.','Spot-check 10 random completed orders.', 62),
('business','P1','Pricing page conversion analytics','Track pricing-page → signup → first-purchase funnel.','Verify events fire in analytics dashboard.', 63),
('business','P1','Subscription churn & MRR dashboard','Admin Revenue page shows MRR, churn, LTV, ARPU.','Visit /admin/revenue and verify metrics render.', 64),
('business','P2','Promo codes + first-time buyer discount','Implement coupon engine + welcome discount.','Apply test code at checkout.', 65),
('reliability','P0','Lighthouse score >= 90 across all 4 categories','Performance, Accessibility, Best Practices, SEO all >= 90 on top 5 pages.','Run Lighthouse CI on /, /products, /store/:slug, /cart, /account.', 70),
('security','P0','Final secrets audit — no keys in repo','grep entire repo for API keys, tokens, env values.','git grep -E (sk_|pk_live|AIza|eyJ[A-Za-z0-9])', 71),
('ux','P0','Cross-browser smoke test','Run checkout end-to-end in Chrome/Safari/Firefox/Edge + iOS Safari + Android Chrome.','Manual matrix test, capture screenshots.', 72),
('business','P0','Legal review — ToS, Privacy, Refund, DMCA','UK-qualified lawyer reviews all legal pages.','Receive sign-off from legal counsel.', 73);
