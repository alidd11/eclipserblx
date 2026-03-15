

## Plan: Convert `/showcase` to a Discord Modal Form

### How it works
1. User runs `/showcase` → bot responds with a **Modal** (interaction response type 9) containing text input fields
2. User fills in the form fields in Discord's native popup UI and clicks Submit
3. Bot receives a `MODAL_SUBMIT` interaction (type 5) and processes the showcase with the submitted data

### Modal Fields (up to 5 text inputs allowed by Discord)
| Field | Style | Required | Max Length | Placeholder |
|-------|-------|----------|------------|-------------|
| **URL** | Short (1 line) | Yes | 200 | `eclipserblx.com/products/123` |
| **Message** | Paragraph | No | 500 | `Tell people about your product/store...` |

The `type` option is removed since the URL auto-detects whether it's a store or product.

### Changes

**1. `supabase/functions/register-discord-commands/index.ts`**
- Remove all options from `/showcase` command (no more `type`, `url`, `message` options) — the command becomes a simple trigger with no arguments

**2. `supabase/functions/discord-customer-bot/index.ts`**
- **Slash command handler** (`case "showcase"`): Instead of processing immediately, return a Modal response (type 9) with `custom_id: "showcase_modal"` and two text input components
- **Modal submit handler** (in the existing `MODAL_SUBMIT` block): Add a `case "showcase_modal"` that extracts the `url` and `message` values from `interaction.data.components`, then calls the existing `handleShowcaseCommand` logic
- Move the seller verification check **before** opening the modal so non-sellers get an immediate error instead of filling out a form for nothing

### Technical Details
- Discord Modal response type: `9` (MODAL)
- Text input component type: `4` (TEXT_INPUT)
- Style `1` = short (single line), Style `2` = paragraph (multi-line)
- The bot already handles `MODAL_SUBMIT` interactions at line 221, so we just add a new case there

