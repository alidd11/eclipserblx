
# Voice-Narrated Seller Guide Video

## Overview
Create an interactive, voice-narrated video presentation that explains everything sellers need to know about Eclipse. The presentation will feature AI-generated narration (using ElevenLabs TTS) synchronized with animated slides/content.

---

## User Experience

### How It Works
1. Seller visits the **Seller Guide** page (`/seller/documents/guide`)
2. A new prominent **"Watch Video Guide"** button appears at the top
3. Clicking opens a modal with an interactive slideshow presentation
4. Each slide has:
   - Visual content (text, icons, illustrations)
   - AI-narrated audio that auto-plays
   - Play/pause and skip controls
   - Progress indicator
5. Sellers can navigate between slides or let it auto-advance

### Presentation Structure (10 Slides)
1. **Welcome to Eclipse** - Introduction and overview
2. **Why Sell on Eclipse?** - Key benefits
3. **You Own Your Work** - IP ownership promise
4. **Earnings Breakdown** - Commission rates (85-90%)
5. **Payout Options** - Stripe, PayPal, Bank Transfer
6. **Store Customization** - Themes and branding
7. **Seller Tools** - Discord notifications, team management
8. **Security Features** - AI scanning, moderation
9. **Getting Started** - 4-step process
10. **Start Selling Today** - Call to action

---

## Technical Implementation

### Phase 1: Connect ElevenLabs

Connect the ElevenLabs connector to enable text-to-speech capabilities for generating AI narration.

### Phase 2: Create TTS Edge Function

Create a new edge function `elevenlabs-tts` that:
- Accepts text to narrate and voice settings
- Calls ElevenLabs API to generate speech
- Returns audio buffer

```text
supabase/functions/elevenlabs-tts/index.ts
├── Accept POST with { text, voiceId }
├── Call ElevenLabs TTS API
├── Return audio/mpeg stream
└── Handle errors gracefully
```

### Phase 3: Build Video Presentation Component

Create a new component structure:

```text
src/components/seller/
├── SellerVideoGuide.tsx        # Main modal wrapper
├── VideoSlide.tsx              # Individual slide component
└── VideoSlideContent.tsx       # Slide content definitions
```

**SellerVideoGuide.tsx**
- Full-screen modal presentation player
- Slide navigation (next/prev/dots)
- Audio playback controls
- Auto-advance when narration ends
- Loading states for audio generation

**VideoSlide.tsx**
- Animated slide transitions (framer-motion)
- Icon/visual displays
- Text content with bullet points
- Audio player integration

**VideoSlideContent.tsx**
- Define all 10 slides with:
  - Title, description, bullet points
  - Icons to display
  - Narration script text

### Phase 4: Update Seller Guide Page

Modify `src/pages/seller/SellerGuide.tsx`:
- Add "Watch Video Guide" button in header
- Import and render VideoGuide modal
- Track modal open/close state

### Phase 5: Audio Caching

Implement caching to avoid regenerating audio:
- Store generated audio URLs in browser cache/localStorage
- Pre-generate audio for all slides on first load
- Show loading progress during generation

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/elevenlabs-tts/index.ts` | Create | TTS edge function |
| `supabase/config.toml` | Modify | Add function config |
| `src/components/seller/SellerVideoGuide.tsx` | Create | Main video modal |
| `src/components/seller/VideoSlide.tsx` | Create | Slide display component |
| `src/components/seller/slideContent.ts` | Create | Slide definitions |
| `src/pages/seller/SellerGuide.tsx` | Modify | Add watch button |

---

## Voice Configuration

Using ElevenLabs voice: **Brian** (`nPczCjzI2devNBz1zQrb`)
- Clear, professional male voice
- Good for instructional content
- Natural pacing for learning

---

## UI Design

### Video Modal
- Dark overlay background
- Centered 16:9 aspect ratio container
- Slide content area with gradient background
- Bottom control bar:
  - Play/Pause button
  - Progress bar
  - Slide counter (e.g., "3 / 10")
  - Skip to next button
  - Close button

### Slide Design
- Gradient background matching Eclipse branding
- Large icon at top
- Title text (bold, large)
- Description/bullet points
- Subtle animation entrance effects

---

## Dependencies

No new packages required:
- Uses existing `framer-motion` for animations
- Uses Supabase edge functions for TTS
- Standard HTML5 Audio API for playback

---

## Accessibility

- Keyboard navigation (arrows, space, escape)
- Subtitles/transcript option (matches narration text)
- Play/pause controls always visible
- Screen reader friendly navigation

