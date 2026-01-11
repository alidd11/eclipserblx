// Shared rate limiting utility for edge functions
// Uses in-memory storage with automatic cleanup

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on cold start, which is acceptable for edge functions)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  maxRequests: number;      // Maximum requests allowed
  windowMs: number;         // Time window in milliseconds
  identifier: string;       // Unique identifier (IP, user ID, etc.)
  action?: string;          // Optional action type for different limits
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  cleanupExpiredEntries();
  
  const { maxRequests, windowMs, identifier, action = 'default' } = options;
  const key = `${action}:${identifier}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // If no entry or window has passed, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Helper to get client IP from request headers
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
}

// Helper to create rate limit error response
export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  const retryAfter = Math.ceil((result.retryAfterMs || 60000) / 1000);
  
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfterSeconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
      },
    }
  );
}

// Pre-configured rate limits for common use cases
export const RATE_LIMITS = {
  // Very strict - for auth endpoints
  AUTH: { maxRequests: 5, windowMs: 60000 },        // 5 per minute
  
  // Strict - for write operations
  WRITE: { maxRequests: 30, windowMs: 60000 },      // 30 per minute
  
  // Moderate - for general API calls
  API: { maxRequests: 60, windowMs: 60000 },        // 60 per minute
  
  // Lenient - for read operations
  READ: { maxRequests: 120, windowMs: 60000 },      // 120 per minute
  
  // Burst protection - for expensive operations
  EXPENSIVE: { maxRequests: 10, windowMs: 60000 },  // 10 per minute
} as const;
