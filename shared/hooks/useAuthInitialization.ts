"use client";

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { authActions } from '@/shared/redux/actions/authActions';
import { getValidAccessToken } from '@/shared/utils/authToken';
import { parseApiResponse } from '@/shared/utils/apiResponse';
export const useAuthInitialization = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const init = async () => {
      const token = await getValidAccessToken();
      if (!token) {
        await dispatch(authActions.sessionExpired());
        dispatch(authActions.authInitialized());
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Session invalid');
        const user = await parseApiResponse(response);
        dispatch(authActions.loginSuccess(user));
      } catch {
        await dispatch(authActions.sessionExpired());
      } finally {
        dispatch(authActions.authInitialized());
      }
    };

    init();
  }, [dispatch]);
};
