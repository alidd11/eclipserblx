

# Automated E2E Testing with Playwright

## Overview
Set up Playwright end-to-end testing against the live preview URL to validate critical user journeys automatically. This runs as a script in the sandbox — no changes to the React codebase itself.

## What Gets Tested
Key customer-facing flows:

1. **Homepage** — loads, hero visible, navigation works
2. **Products page** — grid renders, filters visible
3. **Product detail** — clicking a product loads detail page with images/price/buy button
4. **Cart** — empty cart state, add-to-cart flow
5. **Auth** — login/signup forms render, validation works
6. **Search** — search bar functional, results display
7. **Footer** — social links (Discord, X) present and correct
8. **Help Center / FAQ** — pages load with content
9. **Responsive** — all above at mobile (390px) and desktop (1366px) viewports

## Technical Approach

1. **Install Playwright** in the sandbox (`npx playwright install --with-deps chromium`)
2. **Create test suite** at `/tmp/e2e/` with a `playwright.config.ts` pointing at the preview URL (`https://id-preview--d330fb3c-8e4c-4ae9-8517-806e609eff0f.lovable.app`)
3. **Write test files** covering each flow above — pure read-only tests (no destructive actions since we can't authenticate in the test runner)
4. **Run tests** and report results with pass/fail summary
5. **Save HTML report** to `/mnt/documents/e2e-report.html` for download

## Files Created (all temporary/artifact — no project changes)

| File | Purpose |
|---|---|
| `/tmp/e2e/playwright.config.ts` | Config pointing at preview URL |
| `/tmp/e2e/tests/homepage.spec.ts` | Homepage & navigation tests |
| `/tmp/e2e/tests/products.spec.ts` | Product listing & detail tests |
| `/tmp/e2e/tests/auth.spec.ts` | Auth page form rendering tests |
| `/tmp/e2e/tests/responsive.spec.ts` | Mobile viewport tests |
| `/mnt/documents/e2e-report.html` | Downloadable test report |

## No project code changes required
All Playwright files live in `/tmp/` — the project codebase stays untouched.

