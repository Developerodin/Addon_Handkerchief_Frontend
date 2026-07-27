/**
 * Base URL for all API calls (auth, catalog, etc.).
 * Set NEXT_PUBLIC_API_BASE_URL in .env.local to override.
 */

/**
 * Resolves the API base URL from env or production default.
 * @returns Normalized API base URL without trailing slash
 */
function defaultApiBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();
  if (env) return env.replace(/\/+$/, '');
  return 'https://handkerchief-apis.addonops.com/v1';
}

export const API_BASE_URL = defaultApiBaseUrl();
