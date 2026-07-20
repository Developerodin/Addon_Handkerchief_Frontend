"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { useUsers } from '@/shared/hooks/useUsers';
import NavigationPermissionsEditor from '@/app/users/components/NavigationPermissions';
import {
  mergeNavigationWithDefaults,
  NavigationPermissions as NavPerms,
  UserRole,
} from '@/shared/types/permissions';
import { useNavigation } from '@/shared/contextapi/navigationContext';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const { loadUser, updateUser, updateUserNavigation } = useUsers();
  const { hasCrudPermission } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as UserRole,
  });
  const [navigation, setNavigation] = useState<NavPerms>(mergeNavigationWithDefaults());

  const canUpdate = hasCrudPermission('Users', 'update');

  useEffect(() => {
    if (!userId) return;
    loadUser(userId)
      .then((user) => {
        setForm({
          name: user.name,
          email: user.email,
          password: '',
          role: user.role,
        });
        setNavigation(mergeNavigationWithDefaults(user.navigation));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadUser, userId]);

  if (!canUpdate) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white border border-gray-100 p-6 text-center text-[12px] text-gray-600">
          You do not have permission to edit users.
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
        role: form.role,
      };
      if (form.password) payload.password = form.password;
      await updateUser(userId, payload);
      await updateUserNavigation(userId, navigation);
      router.push('/users/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white border border-gray-100 flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[12px] text-gray-500">Loading user...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Edit User" />

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
              <h1 className="text-sm font-bold text-gray-800">Edit User</h1>
              <span className="text-[11px] text-gray-500 truncate">{form.email}</span>
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
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    New Password <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Leave blank to keep current"
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
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="ri-save-line" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
