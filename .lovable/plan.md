

# Plan: Domain Purchase Affiliate Integration

## Overview
Add a "Buy a Domain" section to the seller domain settings page that directs sellers to a domain registrar via an affiliate link. The seller purchases and registers the domain externally, then returns to connect it using the existing custom domain flow.

## What Changes

### 1. UI Addition — SellerSettingsDomain.tsx
Add a new card **above** the custom domain connection section:
- **"Need a domain?"** card with brief explanation
- A search-style input where sellers can type a desired domain name
- "Search & Buy" button that opens `https://www.namecheap.com/domains/registration/results/?domain={query}&aff={AFFILIATE_ID}` in a new tab
- Helper text: "You'll be redirected to our partner registrar. After purchase, return here to connect your domain."
- Small "Powered by Namecheap" attribution

### 2. Affiliate ID Configuration
- Store the Namecheap affiliate ID as a constant in the component (it's a public tracking ID, not a secret)
- Can be updated later if you switch registrar partners

### 3. Flow Integration
- After the "Buy a Domain" card, the existing "Connect Custom Domain" section remains unchanged
- Add a visual step indicator: **Step 1:** Buy a domain → **Step 2:** Subscribe to Custom Domains (£3/mo) → **Step 3:** Connect & verify DNS

## Files to Modify
- `src/pages/seller/SellerSettingsDomain.tsx` — Add the domain purchase affiliate card and step flow

## What You'll Need
- A Namecheap affiliate account (free to create at affiliate.namecheap.com)
- Your affiliate tracking ID to embed in the referral URL

