"use client";

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { authActions } from '@/shared/redux/actions/authActions';
import {
  getAccessToken,
  getRefreshToken,
  getValidAccessToken,
} from '@/shared/utils/authToken';
import { parseApiResponse } from '@/shared/utils/apiResponse';
import type { RootState } from '@/shared/redux/store';

/**
 * Validates stored tokens once on app startup and syncs Redux with the backend.
 */
export const useAuthInitialization = () => {
  const dispatch = useDispatch();
  const { authInitialized } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (authInitialized) {
      return;
    }

    let cancelled = false;

    const init = async () => {
      const hadStoredSession = Boolean(getAccessToken() || getRefreshToken());

      const markInitialized = () => {
        if (!cancelled) {
          dispatch(authActions.authInitialized());
        }
      };

      const clearSession = () => {
        if (!cancelled) {
          void dispatch(authActions.sessionExpired());
        }
      };

      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (hadStoredSession) {
            clearSession();
          }
          return;
        }

        try {
          await fetch('/api/auth/set-cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            credentials: 'include',
          });
        } catch {
          /* keep client cookies; server cookie sync is best-effort */
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        try {
          const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });

          if (!response.ok) {
            if (hadStoredSession) {
              clearSession();
            }
            return;
          }

          const user = await parseApiResponse(response);
          if (!cancelled) {
            dispatch(authActions.loginSuccess(user));
          }
        } catch {
          if (hadStoredSession) {
            clearSession();
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } finally {
        markInitialized();
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [dispatch, authInitialized]);
};