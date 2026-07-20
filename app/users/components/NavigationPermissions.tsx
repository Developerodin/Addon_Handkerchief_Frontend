"use client";

import React from 'react';
import {
  CATALOG_MODULES,
  CrudPermissions,
  EMPTY_CRUD,
  FULL_CRUD,
  NavigationPermissions as NavType,
  mergeNavigationWithDefaults,
  applyCrudChange,
  applyCrudDependencies,
  CrudAction,
} from '@/shared/types/permissions';

interface Props {
  navigation: NavType;
  onChange: (navigation: NavType) => void;
  disabled?: boolean;
}

const CRUD_ACTIONS = [
  { key: 'create' as const, label: 'Create', short: 'C' },
  { key: 'read' as const, label: 'Read', short: 'R' },
  { key: 'update' as const, label: 'Update', short: 'U' },
  { key: 'delete' as const, label: 'Delete', short: 'D' },
];

const MAIN_SECTIONS = [
  { key: 'Dashboard' as const, label: 'Dashboard', icon: 'ri-dashboard-line' },
  { key: 'Users' as const, label: 'Users Management', icon: 'ri-user-settings-line' },
];

const CATALOG_SECTIONS = CATALOG_MODULES.map((key) => ({
  key,
  label: key,
}));

function isFullCrud(value: CrudPermissions) {
  return value.create && value.read && value.update && value.delete;
}

function CrudChecks({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: CrudPermissions;
  onChange: (next: CrudPermissions) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
      {CRUD_ACTIONS.map(({ key, label }) => (
        <label
          key={key}
          htmlFor={`${idPrefix}-${key}`}
          className="inline-flex items-center gap-1.5 cursor-pointer select-none"
          title={
            key === 'read'
              ? 'Turning off Read clears Create, Update, and Delete for this section.'
              : key !== 'read'
                ? 'Requires Read access for this section.'
                : undefined
          }
        >
          <input
            id={`${idPrefix}-${key}`}
            type="checkbox"
            checked={value[key]}
            disabled={disabled}
            onChange={(e) => onChange(applyCrudChange(value, key as CrudAction, e.target.checked))}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
          />
          <span className="text-[11px] font-medium text-gray-600">{label}</span>
        </label>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  onToggleAll,
  allChecked,
  disabled,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  onToggleAll: (checked: boolean) => void;
  allChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <i className={`${icon} text-purple-600 text-sm`} />
          <h4 className="text-[12px] font-bold text-gray-800 uppercase tracking-wide">{title}</h4>
        </div>
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allChecked}
            disabled={disabled}
            onChange={(e) => onToggleAll(e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
          />
          <span className="text-[11px] font-bold text-gray-600">Full access</span>
        </label>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function PermissionRow({
  label,
  value,
  onChange,
  disabled,
  idPrefix,
  indented,
}: {
  label: string;
  value: CrudPermissions;
  onChange: (next: CrudPermissions) => void;
  disabled?: boolean;
  idPrefix: string;
  indented?: boolean;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 hover:bg-gray-50/60 transition-colors ${
        indented ? 'pl-6 sm:pl-8' : ''
      }`}
    >
      <span className="text-[12px] font-medium text-gray-800 min-w-[140px]">{label}</span>
      <CrudChecks value={value} onChange={onChange} disabled={disabled} idPrefix={idPrefix} />
    </div>
  );
}

export default function NavigationPermissionsEditor({ navigation, onChange, disabled }: Props) {
  const safeNav = mergeNavigationWithDefaults(navigation);

  const updateTopLevel = (key: 'Dashboard' | 'Users', crud: CrudPermissions) => {
    onChange({ ...safeNav, [key]: applyCrudDependencies(crud) });
  };

  const updateCatalog = (module: (typeof CATALOG_MODULES)[number], crud: CrudPermissions) => {
    onChange({
      ...safeNav,
      Catalog: { ...safeNav.Catalog, [module]: applyCrudDependencies(crud) },
    });
  };

  const mainAllChecked =
    isFullCrud(safeNav.Dashboard) && isFullCrud(safeNav.Users);

  const catalogAllChecked = CATALOG_MODULES.every((m) => isFullCrud(safeNav.Catalog[m]));

  const toggleMainAll = (checked: boolean) => {
    const crud = checked ? { ...FULL_CRUD } : { ...EMPTY_CRUD };
    onChange({ ...safeNav, Dashboard: crud, Users: { ...crud } });
  };

  const toggleCatalogAll = (checked: boolean) => {
    const crud = checked ? { ...FULL_CRUD } : { ...EMPTY_CRUD };
    const Catalog = Object.fromEntries(
      CATALOG_MODULES.map((m) => [m, { ...crud }])
    ) as NavType['Catalog'];
    onChange({ ...safeNav, Catalog });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Navigation Permissions</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Grant Create / Read / Update / Delete per section. Create, Update, and Delete
            automatically require Read — you cannot assign them without Read access.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">C</span> Create
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">R</span> Read
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">U</span> Update
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">D</span> Delete
        </div>
      </div>

      {/* Main Sections */}
      <SectionCard
        title="Main Sections"
        icon="ri-layout-grid-line"
        allChecked={mainAllChecked}
        onToggleAll={toggleMainAll}
        disabled={disabled}
      >
        {MAIN_SECTIONS.map((section) => (
          <PermissionRow
            key={section.key}
            label={section.label}
            value={safeNav[section.key]}
            onChange={(crud) => updateTopLevel(section.key, crud)}
            disabled={disabled}
            idPrefix={`main-${section.key}`}
          />
        ))}
      </SectionCard>

      {/* Master Catalog */}
      <SectionCard
        title="Master Catalog"
        icon="ri-box-3-line"
        allChecked={catalogAllChecked}
        onToggleAll={toggleCatalogAll}
        disabled={disabled}
      >
        {CATALOG_SECTIONS.map((subsection) => (
          <PermissionRow
            key={subsection.key}
            label={subsection.label}
            value={safeNav.Catalog[subsection.key]}
            onChange={(crud) => updateCatalog(subsection.key, crud)}
            disabled={disabled}
            idPrefix={`catalog-${subsection.key}`}
            indented
          />
        ))}
      </SectionCard>
    </div>
  );
}
