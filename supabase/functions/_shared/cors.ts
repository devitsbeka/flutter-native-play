/**
 * Shared CORS configuration for Edge Functions
 * 
 * Security: Only allows requests from known origins instead of '*'
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  // Production - Custom domain
  'https://mytrivia.io',
  'https://www.mytrivia.io',
  // Production - Lovable domain
  'https://flutter-native-play.lovable.app',
  // Preview
  'https://id-preview--f54c9281-c7aa-40a4-8ea7-4b75d0ffa3d4.lovable.app',
  // Lovable internal preview domain (varies per project/session)
  'https://f54c9281-c7aa-40a4-8ea7-4b75d0ffa3d4.lovableproject.com',
  // Capacitor iOS
  'capacitor://localhost',
  // Capacitor Android / Local development
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8100',
];

/**
 * Get CORS headers based on the request origin
 * Returns headers with the specific origin if allowed, otherwise rejects
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  
  // Check if origin is in allowed list (also allow no origin for same-origin requests)
  // Additionally allow Lovable's preview domains under *.lovableproject.com.
  const isLovableProjectPreview = origin.endsWith('.lovableproject.com');
  const isLovableAppPreview = origin.endsWith('.lovable.app');
  const isAllowed =
    !origin ||
    isLovableProjectPreview ||
    isLovableAppPreview ||
    ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin.startsWith(allowed));
  
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
