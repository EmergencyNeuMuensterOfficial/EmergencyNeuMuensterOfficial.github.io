const API_KEY = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY || '';

/**
 * Headers every internal /api/* fetch must send so the middleware UUID-key
 * gate lets the request through. No-op when no key is configured.
 */
export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return API_KEY ? { 'x-api-key': API_KEY, ...extra } : extra;
}
