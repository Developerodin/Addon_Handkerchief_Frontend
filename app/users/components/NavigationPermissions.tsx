"use client";

import React from 'react';
import {
  CATALOG_MODULES,
  CrudPermissions,
  EMPTY_CRUD,
  FULL_CRUD,
  type FactoryScreenKey,
  NavigationPermissions as NavType,
  mergeNavigationWithDefaults,
  applyCrudChange,
  applyCrudDependencies,
  CrudAction,
  HELP_SUPPORT_TABS,
  FULL_HELP_SUPPORT,
  EMPTY_HELP_SUPPORT,
  isFullHelpSupportCrud,
  type HelpSupportTabKey,
  type HelpSupportPermissions,
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

type TopKey = 'Dashboard' | 'Users' | 'Revision review' | FactoryScreenKey;

const PRODUCTION_FLOORS: FactoryScreenKey[] = [
  'Production / Cut',
  'Production / Selvage',
  'Production / Half moon',
  'Production / Vertical hem',
  'Production / Bundle',
  'Production / Horizontal hem',
  'Production / Thread cut',
  'Production / Iron',
  'Production / Route split',
  'Production / Embroidery',
  'Production / Sticker',
];

const SIDEBAR_SECTIONS: { title: string; icon: string; rows: { key: TopKey; label: string }[] }[] = [
  {
    title: 'Main',
    icon: 'ri-layout-grid-line',
    rows: [
      { key: 'Dashboard', label: 'Dashboard' },
      { key: 'Users', label: 'Users' },
      { key: 'Sync', label: 'Sync' },
      { key: 'Reports', label: 'Reports' },
      { key: 'Revision review', label: 'Revision review' },
    ],
  },
  {
    title: 'Production',
    icon: 'ri-settings-3-line',
    rows: [
      { key: 'Production / Orders', label: 'Orders' },
      ...PRODUCTION_FLOORS.map((key) => ({ key, label: key.replace('Production / ', '') })),
    ],
  },
  {
    title: 'Quality',
    icon: 'ri-shield-check-line',
    rows: [
      { key: 'Quality / Floor checks', label: 'Floor checks' },
      { key: 'Quality / Grades', label: 'Grades' },
    ],
  },
  {
    title: 'Warehouse',
    icon: 'ri-archive-line',
    rows: [
      { key: 'Warehouse / Orders', label: 'Client orders' },
      { key: 'Warehouse / Packing', label: 'Packing' },
      { key: 'Warehouse / Boxes', label: 'Boxes' },
      { key: 'Warehouse / Dispatch', label: 'Dispatch' },
    ],
  },
  {
    title: 'Accounts',
    icon: 'ri-bill-line',
    rows: [{ key: 'Accounts / Invoices', label: 'Invoices' }],
  },
];

const FABRIC_GROUPS: { title: string; rows: { key: FactoryScreenKey; label: string }[] }[] = [
  {
    title: 'Purchase management',
    rows: [
      { key: 'Fabric / Purchase orders', label: 'All PO' },
      { key: 'Fabric / Receipts', label: 'PO received' },
      { key: 'Fabric / Drafts', label: 'Drafts PO' },
      { key: 'Fabric / Vendor return', label: 'PO return' },
      { key: 'Fabric / Return challan', label: 'PO return challan' },
      { key: 'Fabric / GRN history', label: 'GRN history' },
      { key: 'Quality / Fabric QC', label: 'Fabric QC' },
    ],
  },
  {
    title: 'Floor and storage',
    rows: [
      { key: 'Fabric / Issue', label: 'Fabric issue' },
      { key: 'Fabric / Return', label: 'Fabric return' },
      { key: 'Fabric / Storage', label: 'Fabric storage' },
    ],
  },
  {
    title: 'Analytics and reports',
    rows: [
      { key: 'Fabric / Live inventory', label: 'Live inventory' },
      { key: 'Fabric / Stock report', label: 'Fabric stock report' },
      { key: 'Fabric / PO analytics', label: 'PO analytics' },
      { key: 'Fabric / Fabric analytics', label: 'Fabric analytics' },
    ],
  },
];

const STORE_GROUPS: Record<'Store / Purchase orders' | 'Store / Receipt' | 'Store / Racks and issue', FactoryScreenKey[]> = {
  'Store / Purchase orders': ['Fabric / Purchase orders', 'Fabric / Drafts'],
  'Store / Receipt': [
    'Fabric / Receipts',
    'Fabric / GRN history',
    'Fabric / Vendor return',
    'Fabric / Return challan',
  ],
  'Store / Racks and issue': ['Fabric / Issue', 'Fabric / Return', 'Fabric / Storage'],
};

/** OR the fabric screens that used to share one Store key, so older API checks stay in step. */
function syncLegacyStoreKeys(nav: NavType): NavType {
  const next = { ...nav };
  for (const [legacy, keys] of Object.entries(STORE_GROUPS) as [keyof typeof STORE_GROUPS, FactoryScreenKey[]][]) {
    next[legacy] = applyCrudDependencies({
      create: keys.some((key) => next[key].create),
      read: keys.some((key) => next[key].read),
      update: keys.some((key) => next[key].update),
      delete: keys.some((key) => next[key].delete),
    });
  }
  return next;
}

/** Keep the shared floor flag in step with the individual floor screens. */
function syncLegacyFloor(nav: NavType): NavType {
  const next = { ...nav };
  next['Production / Floor'] = applyCrudDependencies({
    create: PRODUCTION_FLOORS.some((key) => next[key].create),
    read: PRODUCTION_FLOORS.some((key) => next[key].read),
    update: PRODUCTION_FLOORS.some((key) => next[key].update),
    delete: PRODUCTION_FLOORS.some((key) => next[key].delete),
  });
  return next;
}

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

  const updateTopLevel = (key: TopKey, crud: CrudPermissions) => {
    let next = { ...safeNav, [key]: applyCrudDependencies(crud) };
    if (String(key).startsWith('Fabric /')) next = syncLegacyStoreKeys(next);
    if (PRODUCTION_FLOORS.includes(key as FactoryScreenKey)) next = syncLegacyFloor(next);
    onChange(next);
  };

  const updateCatalog = (module: (typeof CATALOG_MODULES)[number], crud: CrudPermissions) => {
    onChange({
      ...safeNav,
      Catalog: { ...safeNav.Catalog, [module]: applyCrudDependencies(crud) },
    });
  };

  const fabricSectionKeys: FactoryScreenKey[] = FABRIC_GROUPS.flatMap((group) => group.rows.map((row) => row.key));
  const fabricAllChecked = fabricSectionKeys.every((key) => isFullCrud(safeNav[key]));

  const catalogAllChecked = CATALOG_MODULES.every((m) => isFullCrud(safeNav.Catalog[m]));

  const toggleSection = (rows: { key: TopKey }[], checked: boolean) => {
    const crud = checked ? { ...FULL_CRUD } : { ...EMPTY_CRUD };
    let next: NavType = { ...safeNav };
    for (const row of rows) next = { ...next, [row.key]: { ...crud } };
    if (rows.some((row) => PRODUCTION_FLOORS.includes(row.key as FactoryScreenKey))) next = syncLegacyFloor(next);
    onChange(next);
  };

  const toggleFabricAll = (checked: boolean) => {
    const crud = checked ? { ...FULL_CRUD } : { ...EMPTY_CRUD };
    const factory = Object.fromEntries(fabricSectionKeys.map((key) => [key, { ...crud }]));
    onChange(syncLegacyStoreKeys({ ...safeNav, ...factory }));
  };

  const toggleCatalogAll = (checked: boolean) => {
    const crud = checked ? { ...FULL_CRUD } : { ...EMPTY_CRUD };
    const Catalog = Object.fromEntries(
      CATALOG_MODULES.map((m) => [m, { ...crud }])
    ) as NavType['Catalog'];
    onChange({ ...safeNav, Catalog });
  };

  const hs = safeNav['Help & Support'];
  const helpSupportAllChecked = isFullHelpSupportCrud(hs);

  const updateHelpSupport = (next: HelpSupportPermissions) => {
    onChange({ ...safeNav, 'Help & Support': next });
  };

  const toggleHelpSupportAll = (checked: boolean) => {
    updateHelpSupport(checked ? { ...FULL_HELP_SUPPORT } : { ...EMPTY_HELP_SUPPORT });
  };

  const toggleHelpSupportEnabled = (checked: boolean) => {
    if (!checked) {
      updateHelpSupport({ ...EMPTY_HELP_SUPPORT });
      return;
    }
    updateHelpSupport({
      enabled: true,
      Files: hs.Files,
      Tasks: hs.Tasks,
      Tickets: hs.Tickets,
    });
  };

  const updateHelpSupportTab = (tab: HelpSupportTabKey, crud: CrudPermissions) => {
    const nextTab = applyCrudDependencies(crud);
    const next = { ...hs, [tab]: nextTab, enabled: true };
    if (!HELP_SUPPORT_TABS.some((t) => next[t].read)) {
      updateHelpSupport({ ...EMPTY_HELP_SUPPORT });
      return;
    }
    updateHelpSupport(next);
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

      {SIDEBAR_SECTIONS.map((section) => (
        <SectionCard
          key={section.title}
          title={section.title}
          icon={section.icon}
          allChecked={section.rows.every((row) => isFullCrud(safeNav[row.key]))}
          onToggleAll={(checked) => toggleSection(section.rows, checked)}
          disabled={disabled}
        >
          {section.rows.map((row) => (
            <PermissionRow
              key={row.key}
              label={row.label}
              value={safeNav[row.key]}
              onChange={(crud) => updateTopLevel(row.key, crud)}
              disabled={disabled}
              idPrefix={`nav-${row.key}`}
            />
          ))}
        </SectionCard>
      ))}

      <SectionCard
        title="Fabric Management"
        icon="ri-stack-line"
        allChecked={fabricAllChecked}
        onToggleAll={toggleFabricAll}
        disabled={disabled}
      >
        {FABRIC_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-3 py-1.5 bg-gray-50/80">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{group.title}</span>
            </div>
            {group.rows.map((section) => (
              <PermissionRow
                key={section.key}
                label={section.label}
                value={safeNav[section.key]}
                onChange={(crud) => updateTopLevel(section.key, crud)}
                disabled={disabled}
                idPrefix={`fabric-${section.key}`}
                indented
              />
            ))}
          </div>
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

      {/* Help & Support */}
      <SectionCard
        title="Help & Support"
        icon="ri-customer-service-2-line"
        allChecked={helpSupportAllChecked}
        onToggleAll={toggleHelpSupportAll}
        disabled={disabled}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 hover:bg-gray-50/60 transition-colors">
          <span className="text-[12px] font-medium text-gray-800 min-w-[140px]">Hub access</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              id="help-support-enabled"
              type="checkbox"
              checked={hs.enabled}
              disabled={disabled}
              onChange={(e) => toggleHelpSupportEnabled(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-gray-600">Enable Help &amp; Support</span>
          </label>
        </div>
        {HELP_SUPPORT_TABS.map((tab) => (
          <PermissionRow
            key={tab}
            label={tab}
            value={hs[tab]}
            onChange={(crud) => updateHelpSupportTab(tab, crud)}
            disabled={disabled || !hs.enabled}
            idPrefix={`help-support-${tab}`}
            indented
          />
        ))}
      </SectionCard>
    </div>
  );
}
