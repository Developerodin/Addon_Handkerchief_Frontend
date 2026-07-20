import { API_BASE_URL } from '@/shared/data/utilities/api';
import { getValidAccessToken } from '@/shared/utils/authToken';
import { NavigationPermissions, User, UserRole } from '@/shared/types/permissions';

export type { User, UserRole, NavigationPermissions };

const authHeaders = async () => {
  const token = await getValidAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  navigation?: NavigationPermissions;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  phoneNumber?: string;
  navigation?: NavigationPermissions;
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  sortBy?: string;
}

export const userService = {
  async getUsers(params: UsersQuery = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.set(k, String(v));
    });
    const res = await fetch(`${API_BASE_URL}/users?${query}`, { headers: await authHeaders() });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to load users');
    return res.json();
  },

  async getUser(userId: string) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, { headers: await authHeaders() });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to load user');
    return res.json();
  },

  async createUser(payload: CreateUserPayload) {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to create user');
    return res.json();
  },

  async updateUser(userId: string, payload: UpdateUserPayload) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to update user');
    return res.json();
  },

  async updateUserNavigation(userId: string, navigation: NavigationPermissions) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/navigation`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ navigation }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to update permissions');
    return res.json();
  },

  async deleteUser(userId: string) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to delete user');
  },
};
