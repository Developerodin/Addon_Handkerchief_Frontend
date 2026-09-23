"use client";

import React, { useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useUsers } from '@/shared/hooks/useUsers';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import { UiButton, UiIconButton, UiSearchInput, UiTable, UiTableColumn } from '@/shared/components/ui';

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

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

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

  const columns: UiTableColumn<UserRow>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (user) => (
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <i className="ri-user-3-line text-sm text-primary" />
          </div>
          <span className="font-bold text-gray-900">{user.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (user) => user.email,
    },
    {
      key: 'role',
      label: 'Role',
      render: (user) => (
        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-tight ${getRoleColor(user.role)}`}>
          {formatRole(user.role)}
        </span>
      ),
    },
  ];

  if (canUpdate || canDelete) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      align: 'right',
      sticky: 'right',
      render: (user) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <UiIconButton
              href={`/users/edit/${user.id}/`}
              icon="ri-edit-line"
              tone="edit"
              title="Edit user"
              aria-label="Edit user"
            />
          )}
          {canDelete && (
            <UiIconButton
              icon="ri-delete-bin-line"
              tone="delete"
              title="Delete user"
              aria-label="Delete user"
              onClick={() => handleDelete(user.id)}
            />
          )}
          {!canUpdate && !canDelete && <span className="text-[11px] text-gray-400">—</span>}
        </div>
      ),
    });
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Users" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 catalog-list-card">
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="ui-page-accent" />
              <h1 className="ui-page-title">Users</h1>
              <span className="ui-page-count">{pagination?.totalResults ?? 0}</span>
            </div>
            {canCreate && (
              <UiButton variant="primary" href="/users/add/" icon="ri-add-line">
                Add User
              </UiButton>
            )}
          </div>
        </div>

        <div className="p-[10px] border-b border-gray-100">
          <UiSearchInput
            className="max-w-md w-full"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="mx-[10px] mt-[10px] px-3 py-2 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded">
            {error}
          </div>
        )}

        <div className="p-[10px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="ui-list-state__spinner" />
              <p className="text-[12px] text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <i className="ri-user-line text-2xl text-primary" />
              </div>
              <p className="text-sm font-bold text-gray-800 mb-1">No users found</p>
              <p className="text-[11px] text-gray-500">
                {search ? 'Try a different search term' : 'Add a user to get started'}
              </p>
            </div>
          ) : (
            <UiTable columns={columns} rows={users as UserRow[]} rowKey={(user) => user.id} />
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
