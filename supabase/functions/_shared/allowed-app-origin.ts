const ALLOWED_APP_ORIGINS = new Set([
  "https://eclipserblx.com",
  "https://www.eclipserblx.com",
  "https://eclipserblx.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
]);

export function isAllowedAppUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return ALLOWED_APP_ORIGINS.has(new URL(value).origin);
  } catch {
    return false;
  }
}

export function allowedAppOrigin(
  value: string | null | undefined,
  fallback = "https://eclipserblx.com",
): string {
  if (!isAllowedAppUrl(value)) return fallback;
  return new URL(value).origin;
}
