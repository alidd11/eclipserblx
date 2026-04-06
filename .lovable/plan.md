
# Enterprise Careers Page Overhaul

## Changes

### 1. `src/pages/Jobs.tsx` — Full page rebuild

**Header**
- Left-aligned header matching enterprise standard (`text-2xl font-display font-bold`)
- Subtitle as single-line description, no centered layout
- Add open positions count badge next to heading

**Layout restructure**
- Move Application Status Check below job listings (secondary action, not primary)
- Job listings in a single-column list layout (not 2-col grid) — each role as a clean row with title, type, location, and "Apply" button inline
- Clicking a job expands inline to show description + requirements (accordion pattern) rather than cards with everything visible
- Remove the "Why Work With Us?" benefits section entirely — enterprise companies don't sell themselves on the careers page with generic cards

**Application form polish**
- Keep the Dialog modal but increase max-width to `max-w-2xl`
- Add field validation feedback inline (red border on invalid)
- Cleaner spacing, proper section grouping

**Empty state**
- Remove decorative Briefcase icon from empty state
- Clean text-only empty state

### 2. `src/components/layout/Footer.tsx` — Rename link
- Change "Jobs" label to "Careers" for professional branding

### 3. Route remains `/jobs` (standard enterprise pattern)
