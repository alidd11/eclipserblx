/**
 * Structured error codes for edge functions.
 * Use these instead of raw error strings for consistent client-side handling.
 */
export const ERROR_CODES = {
  // Auth
  ERR_UNAUTHORIZED: { code: 'ERR_UNAUTHORIZED', status: 401, message: 'Authentication required.' },
  ERR_FORBIDDEN: { code: 'ERR_FORBIDDEN', status: 403, message: 'You do not have permission to perform this action.' },
  ERR_TOKEN_EXPIRED: { code: 'ERR_TOKEN_EXPIRED', status: 401, message: 'Your session has expired. Please sign in again.' },

  // Validation
  ERR_VALIDATION: { code: 'ERR_VALIDATION', status: 400, message: 'Invalid request data.' },
  ERR_MISSING_FIELD: { code: 'ERR_MISSING_FIELD', status: 400, message: 'A required field is missing.' },

  // Resources
  ERR_NOT_FOUND: { code: 'ERR_NOT_FOUND', status: 404, message: 'The requested resource was not found.' },
  ERR_ALREADY_EXISTS: { code: 'ERR_ALREADY_EXISTS', status: 409, message: 'This resource already exists.' },

  // Business logic
  ERR_INSUFFICIENT_BALANCE: { code: 'ERR_INSUFFICIENT_BALANCE', status: 400, message: 'Insufficient balance for this operation.' },
  ERR_PRODUCT_UNAVAILABLE: { code: 'ERR_PRODUCT_UNAVAILABLE', status: 400, message: 'This product is no longer available.' },
  ERR_ORDER_ALREADY_PROCESSED: { code: 'ERR_ORDER_ALREADY_PROCESSED', status: 409, message: 'This order has already been processed.' },
  ERR_PAYOUT_MINIMUM: { code: 'ERR_PAYOUT_MINIMUM', status: 400, message: 'The payout amount does not meet the minimum threshold.' },
  ERR_STORE_SUSPENDED: { code: 'ERR_STORE_SUSPENDED', status: 403, message: 'This store is currently suspended.' },

  // Rate limiting
  ERR_RATE_LIMITED: { code: 'ERR_RATE_LIMITED', status: 429, message: 'Too many requests. Please try again later.' },

  // Server
  ERR_INTERNAL: { code: 'ERR_INTERNAL', status: 500, message: 'An internal error occurred. Please try again.' },
  ERR_SERVICE_UNAVAILABLE: { code: 'ERR_SERVICE_UNAVAILABLE', status: 503, message: 'Service temporarily unavailable.' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Create a structured JSON error response with CORS headers.
 */
export function errorResponse(
  errorKey: ErrorCode,
  corsHeaders: Record<string, string>,
  details?: string,
): Response {
  const err = ERROR_CODES[errorKey];
  return new Response(
    JSON.stringify({
      error: err.code,
      message: details || err.message,
    }),
    {
      status: err.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

/**
 * Create a success JSON response with rate limit headers.
 */
export function successResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  rateLimitInfo?: { remaining: number; resetAt: number },
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  if (rateLimitInfo) {
    headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
    headers['X-RateLimit-Reset'] = new Date(rateLimitInfo.resetAt).toISOString();
  }

  return new Response(JSON.stringify(data), { status: 200, headers });
}
