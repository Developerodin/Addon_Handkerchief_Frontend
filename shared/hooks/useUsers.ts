"use client";

import { useCallback, useState } from 'react';
import {
  userService,
  CreateUserPayload,
  UpdateUserPayload,
  UsersQuery,
} from '@/shared/services/userService';
import { NavigationPermissions, User } from '@/shared/types/permissions';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
  });

  const loadUsers = useCallback(async (query: UsersQuery = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getUsers(query);
      setUsers(data.results || []);
      setPagination({
        page: data.page || 1,
        limit: data.limit || 10,
        totalPages: data.totalPages || 1,
        totalResults: data.totalResults || 0,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await userService.getUser(userId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (payload: CreateUserPayload) => {
    return userService.createUser(payload);
  }, []);

  const updateUser = useCallback(async (userId: string, payload: UpdateUserPayload) => {
    return userService.updateUser(userId, payload);
  }, []);

  const updateUserNavigation = useCallback(
    async (userId: string, navigation: NavigationPermissions) => {
      return userService.updateUserNavigation(userId, navigation);
    },
    []
  );

  const deleteUser = useCallback(async (userId: string) => {
    await userService.deleteUser(userId);
  }, []);

  return {
    users,
    loading,
    error,
    pagination,
    loadUsers,
    loadUser,
    createUser,
    updateUser,
    updateUserNavigation,
    deleteUser,
  };
}
