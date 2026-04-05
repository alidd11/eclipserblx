

## Remove Border from Free Assets Teaser

Remove the outlined container styling from the Free Assets section so it flows naturally with the rest of the homepage.

### Change

**File: `src/components/landing/FreeAssetsTeaser.tsx`** (line ~53)

Current wrapper div:
```
className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6"
```

Replace with borderless, no-background version:
```
className="p-0"
```

This removes the rounded border, tinted background, and internal padding — letting the section sit flush like every other homepage section. The outer `<section>` already has the correct `max-w-[1400px]` padding.

Single line change, one file.

