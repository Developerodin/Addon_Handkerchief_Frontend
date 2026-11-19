import Cookies from 'js-cookie';
import { API_BASE_URL } from '@/shared/data/utilities/api';

const TOKEN_COOKIE_DAYS = 7;

export const getAccessToken = (): string | undefined => Cookies.get('accessToken');

export const getRefreshToken = (): string | undefined => Cookies.get('refreshToken');

export const clearAuthTokens = () => {
  Cookies.remove('refreshToken', { path: '/' });
  Cookies.remove('accessToken', { path: '/' });
};

export const storeAuthTokens = (accessToken: string, refreshToken?: string) => {
  Cookies.set('accessToken', accessToken, {
    expires: TOKEN_COOKIE_DAYS,
    path: '/',
    sameSite: 'lax',
  });

  if (refreshToken) {
    Cookies.set('refreshToken', refreshToken, {
      expires: TOKEN_COOKIE_DAYS,
      path: '/',
      sameSite: 'lax',
    });
  }
};

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

/** Used by middleware and client auth checks (JWT exp, base64url-safe). */
export const isAccessTokenExpired = (token: string | undefined | null): boolean => {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000 - 60_000;
};

export const isTokenExpired = (token: string): boolean => isAccessTokenExpired(token);

let refreshInFlight: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const accessToken = data?.access?.token;
    if (!accessToken) return null;

    storeAuthTokens(accessToken, data?.refresh?.token);
    return accessToken;
  } catch {
    return null;
  }
}

export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = performTokenRefresh().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
};

export const getValidAccessToken = async (): Promise<string | null> => {
  let token = getAccessToken();
  if (token && !isTokenExpired(token)) return token;
  return refreshAccessToken();
};

export const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  if (!token) return Boolean(getRefreshToken());
  return !isTokenExpired(token);
};
