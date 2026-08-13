'use client';

import React from 'react';

export interface FabricBomItem {
  fabricCatalogId: string;
  fabricName?: string;
  quantity: number;
  unitCost: number;
}

export interface PackagingBomItem {
  rawMaterialId: string;
  rawMaterialName?: string;
  quantity: number;
  unitCost?: number;
}

interface ProductBomHeaderProps {
  fabricLineCount?: number;
  packagingLineCount?: number;
}

export function ProductBomHeader({ fabricLineCount = 0, packagingLineCount = 0 }: ProductBomHeaderProps) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-bold text-gray-900">Bill of Materials</h3>
      <p className="text-[12px] text-gray-500 mt-0.5">
        Define fabric consumption and packaging per finished piece
        {(fabricLineCount > 0 || packagingLineCount > 0) && (
          <span className="text-gray-400">
            {' '}
            · {fabricLineCount} fabric · {packagingLineCount} packaging
          </span>
        )}
      </p>
    </div>
  );
}

/** Shared section header + add button */
export function BomSectionHeader({
  title,
  description,
  addLabel,
  onAdd,
  disabled,
}: {
  title: string;
  description?: string;
  addLabel: string;
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-4 pt-4">
      <div>
        <h4 className="text-[13px] font-bold text-gray-800">{title}</h4>
        {description && <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        <i className="ri-add-line text-xs" />
        {addLabel}
      </button>
    </div>
  );
}

export function BomDeleteButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
      disabled={disabled}
      title="Remove row"
    >
      <i className="ri-delete-bin-line text-sm" />
    </button>
  );
}

export function BomSelectButton({
  label,
  placeholder,
  onClick,
  disabled,
}: {
  label?: string;
  placeholder: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-[12px] bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-purple-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between gap-2"
      disabled={disabled}
    >
      <span className={label ? 'font-medium text-gray-800 truncate' : 'text-gray-400'}>
        {label || placeholder}
      </span>
      <i className="ri-arrow-down-s-line text-gray-400 text-sm shrink-0" />
    </button>
  );
}

export function BomNumberInput({
  value,
  onChange,
  disabled,
  placeholder,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        step="any"
        min="0"
        className={`w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:ring-0 focus:border-purple-300 disabled:bg-gray-50 disabled:text-gray-400${suffix ? ' pr-8' : ''}`}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        placeholder={placeholder ?? '0'}
      />
      {suffix && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export const BOM_TABLE_HEAD =
  'px-3 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200';

export function BomTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border-t border-gray-200">
      <table className="w-full border-collapse min-w-[420px]">{children}</table>
    </div>
  );
}

export function BomSectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">{children}</div>
  );
}
