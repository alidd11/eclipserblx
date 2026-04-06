

# Applicant Portal — Dedicated Login & Dashboard

## Overview
Replace the email-input status checker on `/jobs` with a proper applicant portal. Applicants get a unique access token when they apply, which they use to log into a dedicated portal page to view their application status and messages.

This avoids requiring applicants to create a full platform account (they're external candidates, not customers) while still being secure and enterprise-grade.

## Approach: Token-Based Access (No Separate Auth)

Applicants receive a unique, random access token (UUID) when they submit an application. This token is stored on the `job_applications` row. They use this token to "log in" to a portal page. This is the standard pattern used by enterprise career platforms (Greenhouse, Lever, Workday) — candidates get a unique link/code, not a full account.

## Database Changes

**Migration 1 — Add access token to job_applications:**
```sql
ALTER TABLE job_applications
ADD COLUMN access_token uuid DEFAULT gen_random_uuid() NOT NULL;

CREATE UNIQUE INDEX idx_job_applications_access_token ON job_applications(access_token);
```

**RLS:** The existing insert policy stays. Add a SELECT policy allowing anon users to read their own application by access token (scoped to only return that single row).

## New Files

### 1. `src/pages/ApplicantPortal.tsx`
- Route: `/careers/portal`
- Two states: **login** and **dashboard**
- **Login state**: Single input field for the access token (or a "Check your email" prompt). Clean, centered layout matching `AuthLayout` styling
- **Dashboard state**: Shows application status, position applied for, timeline, and a message inbox with all `applicant_messages` for that application
- Messages auto-marked as read when viewed
- Session persisted in `sessionStorage` (token stored temporarily during browser session)

### 2. Route registration
- Add `/careers/portal` route in `AppRoutes.tsx`

## Modified Files

### 1. `src/pages/Jobs.tsx`
- Remove the entire `ApplicationStatusCheck` component (lines 230-359)
- Remove the status check section at the bottom (lines 512-515)
- Remove `emailCheckSchema` import
- After successful application submission, show the access token to the applicant with a "Save this — you'll need it to check your status" message
- Add a small "Check application status" link at the top that navigates to `/careers/portal`

### 2. `src/components/admin/applications/ApplicationDetailDialog.tsx`
- Display the `access_token` field in the details tab so admins can share it with applicants if needed

### 3. `src/components/admin/applications/types.tsx`
- Add `access_token: string` to the `JobApplication` interface

### 4. Application confirmation email (`send-application-confirmation` edge function)
- Include the access token in the confirmation email so applicants can bookmark their portal link

## Security
- Access tokens are UUIDs — unguessable (122 bits of entropy)
- RLS policy scopes reads to exact token match
- No platform auth required — applicants stay external
- Tokens stored in `sessionStorage` only (cleared on tab close)
- Admin can see tokens to re-share if applicant loses access

## User Flow
1. Candidate applies on `/jobs` → receives access token on-screen + in confirmation email
2. Candidate visits `/careers/portal` → enters token → sees status + messages
3. Admin sends message via dashboard → appears in applicant's portal on next visit

