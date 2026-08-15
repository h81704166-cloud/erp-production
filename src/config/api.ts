/**
 * Central API Configuration
 * Supports decoupled deployment architectures where frontend (Netlify, Vercel)
 * and backend (Render, Railway, Cloud Run, Self-hosted Ubuntu) run on different domains.
 */

// Strip any trailing slash to avoid double-slash issues (e.g. 'https://api.example.com/' -> 'https://api.example.com')
export const API_BASE_URL: string = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || ''
).replace(/\/+$/, '');

/**
 * Returns full API URL for a given relative endpoint path.
 *
 * @param path - The endpoint relative path (e.g. '/api/auth/cpanel-login' or 'api/health')
 * @returns Fully qualified API URL if VITE_API_BASE_URL is set, or clean relative path otherwise.
 *
 * @example
 * apiUrl('/api/auth/cpanel-login')
 * // If VITE_API_BASE_URL="https://backend.onrender.com":
 * // => "https://backend.onrender.com/api/auth/cpanel-login"
 * // If VITE_API_BASE_URL="":
 * // => "/api/auth/cpanel-login"
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}
