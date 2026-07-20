import axios from 'axios';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { getValidAccessToken } from '@/shared/utils/authToken';

let configured = false;

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const token = await getValidAccessToken();
  if (!token) return init ?? {};

  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return { ...init, headers };
}

/** Attach bearer token to catalog API requests (axios + fetch). */
export function setupCatalogAuth() {
  if (configured || typeof window === 'undefined') return;
  configured = true;

  axios.interceptors.request.use(async (config) => {
    const token = await getValidAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(API_BASE_URL)) {
      return originalFetch(input, await withAuthHeaders(init));
    }
    return originalFetch(input, init);
  };
}

/** @deprecated Use setupCatalogAuth */
export const setupAxiosAuth = setupCatalogAuth;
