
# Make Region Cards Horizontally Longer

## Current State
The region selection cards currently use a **3:4 portrait aspect ratio** (`aspect-[3/4]`), making them taller than they are wide.

## Proposed Change
Change the cards to a **landscape aspect ratio** so they become horizontally longer. The flag images will automatically scale and reposition with the new dimensions since they use `object-cover`.

## Technical Details

### File to Modify
`src/pages/RegionSelect.tsx`

### Changes

**1. Update card aspect ratio (line 211)**
- Change from `aspect-[3/4]` (portrait) to `aspect-[4/3]` (landscape)
- This makes cards wider than they are tall

**2. Update loading skeleton aspect ratio (line 146)**
- Update the skeleton placeholder to match: `aspect-[4/3]`

### Visual Comparison

```text
BEFORE (3:4 portrait):          AFTER (4/3 landscape):
┌─────────┐                     ┌───────────────┐
│         │                     │               │
│  🇬🇧     │                     │      🇬🇧       │
│         │                     │  UK • 24      │
│  UK     │                     └───────────────┘
│  24     │
└─────────┘
```

### How It Works
- The `object-cover` CSS property on the flag images ensures they fill the entire card area
- When the aspect ratio changes, the image automatically repositions to best fill the new dimensions
- No changes needed to the actual flag image files
