import Cookies from 'js-cookie';
import { AUTH_TYPES } from '../types/authTypes';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { clearAuthTokens, storeAuthTokens } from '@/shared/utils/authToken';
import { parseApiResponse } from '@/shared/utils/apiResponse';
export const authActions = {
  loginRequest: () => ({ type: AUTH_TYPES.LOGIN_REQUEST }),
  loginSuccess: (userData: any) => ({ type: AUTH_TYPES.LOGIN_SUCCESS, payload: userData }),
  loginFailure: (error: string) => ({ type: AUTH_TYPES.LOGIN_FAILURE, payload: error }),
  authInitialized: () => ({ type: AUTH_TYPES.AUTH_INITIALIZED }),

  logout: () => async (dispatch: any) => {
    clearAuthTokens();    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    dispatch({ type: AUTH_TYPES.LOGOUT });
  },

  sessionExpired: () => async (dispatch: any) => {
    clearAuthTokens();    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
    dispatch({ type: AUTH_TYPES.LOGOUT });
  },

  login: (email: string, password: string) => async (dispatch: any) => {
    dispatch(authActions.loginRequest());
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseApiResponse<{
        user: unknown;
        tokens: { access: { token: string }; refresh: { token: string } };
        message?: string;
      }>(response);

      if (!response.ok) {
        const message = data.message || 'Login failed';
        dispatch(authActions.loginFailure(message));
        throw new Error(message);
      }

      await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.tokens.access.token }),
        credentials: 'include',
      });

      storeAuthTokens(data.tokens.access.token, data.tokens.refresh.token);

      dispatch(authActions.loginSuccess(data.user));
      return data;
    } catch (error: any) {
      const message = error.message || 'Login failed';
      dispatch(authActions.loginFailure(message));
      throw error;
    }
  },
};
