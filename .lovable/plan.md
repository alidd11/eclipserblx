
# Plan: Add Discord OAuth for Main Portal Sign-In/Sign-Up

## Current State

The platform currently has:
- **Primary auth**: Email/password with OTP verification via Supabase Auth
- **Social login**: Google and Apple via Lovable Cloud managed OAuth
- **Discord linking**: A secondary feature to connect Discord accounts to existing profiles
- **Global Guard**: Separate Discord OAuth that stores sessions in sessionStorage (not Supabase Auth)

## Challenge

Discord OAuth is **not natively supported** by Lovable Cloud's managed OAuth system. The existing Discord OAuth implementations are custom edge functions used for:
- Account linking (not authentication)
- Global Guard's standalone session management

## Proposed Solution

Create a custom Discord-to-Supabase authentication bridge that:
1. Authenticates users via Discord OAuth
2. Creates or links Supabase Auth accounts
3. Provides a seamless sign-in experience alongside existing methods

---

## Technical Implementation

### Step 1: Create Discord Auth Edge Function

Create a new edge function `discord-auth-login` that:
- Exchanges Discord OAuth code for tokens
- Checks if a Supabase account exists with that Discord ID
- If exists: Signs in the user and returns a Supabase session
- If new: Creates a Supabase account and profile, then returns session

```text
Discord OAuth Flow
┌─────────────────────────────────────────────────────────────────┐
│  User clicks "Continue with Discord"                            │
│       ↓                                                         │
│  Redirect to Discord OAuth (identify scope)                     │
│       ↓                                                         │
│  Discord redirects back with code                               │
│       ↓                                                         │
│  Edge function exchanges code → Discord user info               │
│       ↓                                                         │
│  Check profiles table for discord_id                            │
│       ├── Found → Sign in existing Supabase user                │
│       └── Not found → Create new account with Discord details   │
│       ↓                                                         │
│  Return Supabase session tokens                                 │
│       ↓                                                         │
│  Frontend sets Supabase session                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2: Add Auth Callback Route

Create `/auth/discord/callback` route that:
- Receives the Discord OAuth callback
- Sends code to the edge function
- Sets the Supabase session on success
- Handles errors gracefully

### Step 3: Update Auth Page UI

Add a Discord sign-in button to the Auth page:
- Position alongside Google/Apple in the social login section
- Use existing Discord branding (purple button with Discord logo)
- Handle the redirect flow

### Step 4: Handle Account Linking Conflicts

When a Discord account is used to sign up:
- Check if the Discord ID is already linked to another account
- If linked: Sign in to that existing account
- If not linked: Create new account with auto-generated username from Discord

---

## Files to Create

1. **`supabase/functions/discord-auth-login/index.ts`** - New edge function for Discord auth

2. **`src/pages/AuthDiscordCallback.tsx`** - Callback handler page

## Files to Modify

1. **`src/pages/Auth.tsx`** - Add Discord sign-in button and handler

2. **`src/components/AppRoutes.tsx`** - Add the Discord callback route

---

## Security Considerations

- Uses existing `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` secrets
- Creates Supabase accounts with random passwords (users can set later via password reset)
- Discord ID stored in profiles table (already exists for account linking)
- No email verification required for Discord signups (Discord already verified)

## User Experience

- One-click sign-in for Discord users
- Auto-creates profile with Discord username
- Seamlessly links Discord on first login
- Works alongside existing email/Google/Apple auth
