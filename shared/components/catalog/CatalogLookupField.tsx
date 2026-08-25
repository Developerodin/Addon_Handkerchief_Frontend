'use client';

import React, { useMemo, useState } from 'react';
import { CatalogLookupColumn, CatalogLookupSelectModal } from '@/shared/components/catalog/CatalogLookupSelectModal';

interface CatalogLookupFieldProps<T extends { name?: string }> {
  label: string;
  hideLabel?: boolean;
  value: string;
  items: T[];
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  modalTitle: string;
  columns: CatalogLookupColumn<T>[];
  searchPlaceholder?: string;
  placeholder?: string;
  required?: boolean;
  allowClear?: boolean;
  filterItem?: (item: T, search: string) => boolean;
  onChange: (id: string) => void;
}

export function CatalogLookupField<T extends { name?: string }>({
  label,
  hideLabel = false,
  value,
  items,
  getItemId,
  getItemLabel,
  modalTitle,
  columns,
  searchPlaceholder,
  placeholder = 'Select...',
  required = false,
  allowClear = true,
  filterItem,
  onChange,
}: CatalogLookupFieldProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const selected = items.find((item) => getItemId(item) === value);
    return selected ? getItemLabel(selected) : '';
  }, [value, items, getItemId, getItemLabel]);

  return (
    <div className={hideLabel ? undefined : 'form-group'}>
      {!hideLabel && (
        <label className="form-label">
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          readOnly
          value={selectedLabel}
          placeholder={placeholder}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={`form-control cursor-pointer ${allowClear && value ? 'pr-14' : 'pr-9'} ${selectedLabel ? 'text-gray-900' : 'text-gray-400'}`}
          aria-haspopup="dialog"
        />
        <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm" />
        {allowClear && value && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
          >
            <i className="ri-close-circle-line text-sm" />
          </button>
        )}
      </div>
      <CatalogLookupSelectModal
        open={open}
        title={modalTitle}
        searchPlaceholder={searchPlaceholder}
        items={items}
        columns={columns}
        getItemKey={getItemId}
        filterItem={filterItem}
        onClose={() => setOpen(false)}
        onSelect={(item) => onChange(getItemId(item))}
      />
    </div>
  );
}
