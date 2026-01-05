export const SITE_NAME = "UK Roleplay Assets";
export const SITE_DESCRIPTION = "Premium Roblox assets for UK roleplay servers";

export const CATEGORIES = [
  { name: "Vehicle Liveries", slug: "vehicle-liveries", icon: "Car" },
  { name: "Scripts & Systems", slug: "scripts-systems", icon: "Code" },
  { name: "3D Models", slug: "3d-models", icon: "Box" },
  { name: "UI Kits", slug: "ui-kits", icon: "Layout" },
] as const;

export const ORDER_STATUSES = {
  pending: { label: "Pending", color: "warning" },
  paid: { label: "Paid", color: "success" },
  fulfilled: { label: "Fulfilled", color: "primary" },
  refunded: { label: "Refunded", color: "destructive" },
  cancelled: { label: "Cancelled", color: "muted" },
} as const;

export const TICKET_STATUSES = {
  open: { label: "Open", color: "warning" },
  in_progress: { label: "In Progress", color: "secondary" },
  resolved: { label: "Resolved", color: "success" },
  closed: { label: "Closed", color: "muted" },
} as const;

export const PAYMENT_METHODS = {
  stripe: { label: "Card", icon: "CreditCard" },
  paypal: { label: "PayPal", icon: "Wallet" },
  klarna: { label: "Klarna", icon: "Clock" },
  apple_pay: { label: "Apple Pay", icon: "Smartphone" },
  google_pay: { label: "Google Pay", icon: "Smartphone" },
} as const;
