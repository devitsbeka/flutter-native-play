/**
 * Shared CORS configuration for Edge Functions
 * 
 * Security: Only allows requests from known origins instead of '*'
 */

// Allowed origins for CORS.
//
// Exact matches only — no wildcard suffixes. A previous version allowed every
// subdomain of the old hosting platform, which handed CORS access to this
// backend to any project on it, and compared with startsWith, so
// "https://mytrivia.io.example.com" was accepted as "https://mytrivia.io".
//
// Extra origins can be added at deploy time via the CORS_EXTRA_ORIGINS secret
// (comma-separated), so preview deployments never require a code change.
const ALLOWED_ORIGINS = [
  // Production - custom domain
  'https://mytrivia.io',
  'https://www.mytrivia.io',
  // Capacitor iOS
  'capacitor://localhost',
  // Capacitor Android
  'http://localhost',
  // Local development
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8100',
];

const EXTRA_ORIGINS = (Deno.env.get('CORS_EXTRA_ORIGINS') || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Get CORS headers based on the request origin
 * Returns headers with the specific origin if allowed, otherwise rejects
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';

  // Allow no origin (same-origin / native requests) and exact allowlist hits.
  const isAllowed =
    !origin ||
    ALLOWED_ORIGINS.includes(origin) ||
    EXTRA_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPrelight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}

/**
 * Legacy static headers for webhook endpoints that need to accept any origin
 * (e.g., Stripe webhooks)
 */
export const webhookCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};
