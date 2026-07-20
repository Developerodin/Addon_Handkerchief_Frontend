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

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    // Refresh one minute before expiry to avoid race conditions.
    return Date.now() >= payload.exp * 1000 - 60_000;
  } catch {
    return true;
  }
};

export const refreshAccessToken = async (): Promise<string | null> => {
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
