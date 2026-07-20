"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { useUsers } from '@/shared/hooks/useUsers';
import { useNavigation } from '@/shared/contextapi/navigationContext';

const getRoleColor = (role: string) => {
  const map: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-800',
    admin: 'bg-blue-100 text-blue-800',
    accounts: 'bg-amber-100 text-amber-800',
    user: 'bg-green-100 text-green-800',
  };
  return map[role] || 'bg-gray-100 text-gray-800';
};

const formatRole = (role: string) => role.replace(/_/g, ' ');

export default function UsersPage() {
  const { users, loading, error, pagination, loadUsers, deleteUser } = useUsers();
  const { hasCrudPermission } = useNavigation();
  const [search, setSearch] = useState('');

  const canCreate = hasCrudPermission('Users', 'create');
  const canUpdate = hasCrudPermission('Users', 'update');
  const canDelete = hasCrudPermission('Users', 'delete');

  useEffect(() => {
    loadUsers({ page: 1, limit: 10, search });
  }, [loadUsers, search]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    await deleteUser(id);
    loadUsers({ page: pagination.page, limit: pagination.limit, search });
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Users" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded-sm">
        {/* Page header */}
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" />
              <h1 className="text-sm font-bold text-gray-800">Users</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {pagination?.totalResults ?? 0}
              </span>
            </div>
            {canCreate && (
              <Link
                href="/users/add/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm shrink-0"
              >
                <i className="ri-add-line" />
                Add User
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-[10px] border-b border-gray-100">
          <div className="relative max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
            <input
              type="search"
              className="w-full pl-9 pr-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mx-[10px] mt-[10px] px-3 py-2 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="p-[10px] overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-[12px] text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center mb-3">
                <i className="ri-user-line text-2xl text-purple-600" />
              </div>
              <p className="text-sm font-bold text-gray-800 mb-1">No users found</p>
              <p className="text-[11px] text-gray-500">
                {search ? 'Try a different search term' : 'Add a user to get started'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Name
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Email
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Role
                  </th>
                  <th className="px-3 py-3 text-right pr-4 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-[120px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <i className="ri-user-3-line text-sm text-purple-600" />
                        </div>
                        <span className="text-[12px] font-bold text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <span className="text-[12px] text-gray-700">{user.email}</span>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-tight ${getRoleColor(user.role)}`}
                      >
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate && (
                          <Link
                            href={`/users/edit/${user.id}/`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded text-purple-600 hover:bg-purple-50 transition-colors"
                            title="Edit user"
                          >
                            <i className="ri-edit-line text-base" />
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-8 h-8 rounded text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => handleDelete(user.id)}
                            title="Delete user"
                          >
                            <i className="ri-delete-bin-line text-base" />
                          </button>
                        )}
                        {!canUpdate && !canDelete && (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && users.length > 0 && pagination && (
          <div className="p-[10px] flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-[11px] font-medium text-[#495057]">
              Showing{' '}
              <span className="font-bold">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.totalResults)}
              </span>{' '}
              of <span className="font-bold">{pagination.totalResults}</span> users
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
