The landing page still looks cropped because not every landing section uses the global `ProductCard` image path.

Key cause:
- `ProductCard` now uses `object-contain` and requests `resize=contain`.
- The landing hero still renders product images directly in `LandingHero.tsx` with `object-cover` on both the main featured image and the side rail.
- Some secondary landing widgets also still use direct `object-cover` thumbnails instead of the shared product-card media helper.

Plan:
1. Update the landing hero image path
   - Convert `LandingHero.tsx` main featured image from `object-cover` to `object-contain`.
   - Convert the side rail thumbnails from `object-cover` to `object-contain`.
   - Use the existing image optimization helper with explicit `resize=contain` dimensions so the image source itself is not server-cropped.

2. Remove crop-style hover transforms on product imagery
   - Remove tiny hover scale effects from landing product images where they make contained images appear clipped.
   - Keep simple border/color hover states only, matching the project’s no physical animation rule.

3. Sweep landing-only product/image widgets
   - Check landing sections that render their own thumbnails instead of `ProductCard`, especially free assets, PWA landing variants, featured cards, and home marketplace snippets.
   - Change product thumbnails to `object-contain` + `resize=contain` where the image represents a product/asset.
   - Leave avatars, store logos, and decorative hero/background images alone where cropping is intentional.

4. Verify visually
   - Inspect `/` at desktop and mobile widths.
   - Confirm hero, rail, trending, recent releases, and lower landing product thumbnails show the full product image instead of clipped edges.