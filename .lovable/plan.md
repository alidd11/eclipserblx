
# Combine Hero Text and Description into One Section

## Overview

Group the headline and description into a single animated section to create a more unified visual appearance.

## Current Structure

Currently, the badge, headline, and description are each wrapped in separate `motion.div` elements with individual animations:

```text
├── motion.div (Badge)
├── motion.h1 (Headline)
├── motion.p (Description)
├── motion.div (CTAs)
```

## Proposed Change

Wrap the headline and description together in a single `motion.div` container:

```text
├── motion.div (Badge)
├── motion.div (Text Section - NEW wrapper)
│   ├── h1 (Headline)
│   └── p (Description)
├── motion.div (CTAs)
```

## What Changes

| Element | Before | After |
|---------|--------|-------|
| Headline | Separate `motion.h1` with own animation | Inside shared `motion.div` container |
| Description | Separate `motion.p` with own animation | Inside shared `motion.div` container |
| Animation | Staggered (0.1s and 0.2s delays) | Single animation for both together |

## File to Modify

**`src/components/landing/LandingHero.tsx`**
- Remove individual motion wrappers from `h1` and `p`
- Create one `motion.div` containing both headline and description
- Keep the same styling for each element
- Apply a single shared animation to the container
