

# Updated Recruiter Program - Eligibility Change

## Change Summary

Updating the payment eligibility requirement from **1 product minimum** to **10 products minimum**.

---

## Updated Payment Eligibility Requirements

For a recruiter to receive their commission, the referred store must meet ALL of these criteria:

| Requirement | Previous | Updated |
|-------------|----------|---------|
| Store approved | Yes | Yes |
| Store active | `is_active = true` | `is_active = true` |
| **Minimum products** | **1 product** | **10 products** |
| Running period | 7 days from approval | 7 days from approval |
| No self-referrals | Yes | Yes |

---

## Technical Implementation

### Database Function for Qualification Check

```sql
CREATE OR REPLACE FUNCTION check_recruiter_commission_eligibility(p_store_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_product_count INTEGER;
  v_store_active BOOLEAN;
  v_approved_at TIMESTAMPTZ;
BEGIN
  -- Get store details
  SELECT is_active, approved_at INTO v_store_active, v_approved_at
  FROM stores WHERE id = p_store_id;
  
  -- Count active products
  SELECT COUNT(*) INTO v_product_count
  FROM products WHERE store_id = p_store_id AND status = 'approved';
  
  -- Check all criteria:
  -- 1. Store is active
  -- 2. At least 10 products
  -- 3. Running for 7+ days
  RETURN v_store_active = true 
    AND v_product_count >= 10 
    AND v_approved_at <= now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;
```

### Commission Status Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                    COMMISSION QUALIFICATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Store Approved          Check Eligibility         Qualified  │
│   ┌──────────┐           ┌───────────────┐        ┌─────────┐  │
│   │ Commission│──────────▶│ 10+ products? │──Yes──▶│ Payment │  │
│   │ PENDING   │           │ 7+ days?      │        │ ELIGIBLE│  │
│   └──────────┘           │ Store active? │        └─────────┘  │
│                          └───────────────┘                      │
│                                 │                               │
│                                No                               │
│                                 │                               │
│                                 ▼                               │
│                          Still PENDING                          │
│                     (checked periodically)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Updated Terms & Conditions Text

**Section: Payment Eligibility**

> Recruiters are eligible for commission payment when the referred store meets ALL of the following requirements:
>
> 1. **Store Approval**: The store application must be approved by Eclipse administrators
> 2. **Store Active**: The store must be in active status (not suspended or disabled)
> 3. **Minimum Products**: The store must have **at least 10 approved products** listed
> 4. **Operating Period**: The store must have been running for a minimum of 7 days from approval date
> 5. **Legitimate Referral**: The referral must not be a self-referral or fraudulent submission
>
> Commission payments are processed weekly for all qualified referrals. Eclipse reserves the right to adjust or revoke commissions if any fraudulent activity is detected.

---

## UI Display Updates

### Recruiter Dashboard - Referral Status

Each referred store will show progress toward qualification:

| Store | Status | Products | Days Active | Eligible |
|-------|--------|----------|-------------|----------|
| ServerName | Active | 3/10 | 2/7 days | Pending |
| AnotherStore | Active | 12/10 | 14/7 days | Qualified |

### Admin Commission View

Admins will see:
- Current product count vs required (10)
- Days since approval vs required (7)
- Clear indicator when all criteria met

---

## Implementation Tasks

1. **Database Migration**
   - Create all recruiter tables as planned
   - Add qualification check function with 10-product minimum
   - Create trigger to auto-check qualification when products are added

2. **Recruiter Dashboard**
   - Show progress bars: "Products: 3/10" and "Days: 2/7"
   - Clear messaging about what's needed for payment

3. **Admin Interface**
   - Display qualification status on each commission
   - Allow manual override in edge cases

4. **Automated Checks**
   - Periodic job to check pending commissions for qualification
   - Notify recruiter when their referral becomes qualified

