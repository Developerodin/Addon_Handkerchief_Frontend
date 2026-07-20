"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { useUsers } from '@/shared/hooks/useUsers';
import NavigationPermissionsEditor from '@/app/users/components/NavigationPermissions';
import {
  UserRole,
  mergeNavigationWithDefaults,
  NavigationPermissions as NavPerms,
} from '@/shared/types/permissions';
import { useNavigation } from '@/shared/contextapi/navigationContext';

export default function AddUserPage() {
  const router = useRouter();
  const { createUser } = useUsers();
  const { hasCrudPermission } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as UserRole,
  });
  const [navigation, setNavigation] = useState<NavPerms>(mergeNavigationWithDefaults());

  if (!hasCrudPermission('Users', 'create')) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white border border-gray-100 p-6 text-center text-[12px] text-gray-600">
          You do not have permission to create users.
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createUser({ ...form, navigation });
      router.push('/users/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Add User" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded-sm">
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/users/"
                className="w-7 h-7 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 transition-colors"
                title="Back to users"
              >
                <i className="ri-arrow-left-line text-base" />
              </Link>
              <div className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" />
              <h1 className="text-sm font-bold text-gray-800">Add User</h1>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mx-[10px] mt-[10px] px-3 py-2 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded">
              {error}
            </div>
          )}

          <div className="p-[10px] space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Name</label>
                  <input
                    className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 chars, letter + number"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  >
                    <option value="user">User</option>
                    <option value="accounts">Accounts</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <NavigationPermissionsEditor
                navigation={navigation}
                onChange={setNavigation}
              />
            </div>
          </div>

          <div className="p-[10px] border-t border-gray-100 flex flex-wrap items-center justify-end gap-2 bg-gray-50/40">
            <Link
              href="/users/"
              className="inline-flex items-center px-3 py-1.5 text-[11px] font-bold text-gray-600 border border-gray-200 rounded hover:bg-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <i className="ri-user-add-line" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
