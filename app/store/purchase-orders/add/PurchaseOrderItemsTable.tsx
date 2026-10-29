'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FabricCatalog } from '@/shared/services/fabricCatalogService';
import { FabricMeasurementLookup } from '@/shared/services/fabricLookupService';
import { decimalInput, FabricPoLine, fabricColorLabel, fabricTypeLabel, measurementLabel } from './purchaseOrderFormModel';

const inputClass =
  'w-full min-w-0 px-1 py-0.5 text-[10px] leading-tight border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-primary';

const cellClass = 'border border-gray-300 px-1 py-0.5 align-middle overflow-hidden';

interface PurchaseOrderItemsTableProps {
  lines: FabricPoLine[];
  suggestions: FabricCatalog[];
  activeLineId: string | null;
  issues: Record<string, string>;
  units: FabricMeasurementLookup[];
  showCommercials: boolean;
  onQuery: (lineId: string, value: string) => void;
  onFocusLine: (lineId: string) => void;
  onPick: (lineId: string, fabric: FabricCatalog) => void;
  onPatch: (lineId: string, patch: Partial<FabricPoLine>) => void;
  onRemove: (lineId: string) => void;
}

/**
 * Fabric line grid. Type and colour fill in when a catalog fabric is chosen.
 * Compact layout so all columns fit without horizontal scroll on typical desktops.
 */
export function PurchaseOrderItemsTable({
  lines,
  suggestions,
  activeLineId,
  issues,
  units,
  showCommercials,
  onQuery,
  onFocusLine,
  onPick,
  onPatch,
  onRemove,
}: PurchaseOrderItemsTableProps) {
  return (
    <div className="w-full overflow-y-visible">
      <table className="w-full table-fixed border-collapse border border-gray-300 bg-white text-[10px]">
        <colgroup>
          {showCommercials ? (
            <>
              <col style={{ width: '13%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '4%' }} />
            </>
          ) : (
            <>
              <col style={{ width: '14%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '6%' }} />
            </>
          )}
        </colgroup>
        <thead className="bg-gray-50">
          <tr>
            <HeaderCell required>Fabric</HeaderCell>
            <HeaderCell>Type</HeaderCell>
            <HeaderCell>Color</HeaderCell>
            <HeaderCell>Sort No</HeaderCell>
            <HeaderCell>Mill Old</HeaderCell>
            <HeaderCell>Mill New</HeaderCell>
            <HeaderCell>Count</HeaderCell>
            {showCommercials ? <HeaderCell required>Rate</HeaderCell> : null}
            <HeaderCell required>Qty</HeaderCell>
            <HeaderCell required>Unit</HeaderCell>
            <HeaderCell required>Est. del.</HeaderCell>
            {showCommercials ? <HeaderCell required>GST%</HeaderCell> : null}
            <HeaderCell className="text-center">Act</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <FabricLineRow
              key={line.lineId}
              line={line}
              open={activeLineId === line.lineId && suggestions.length > 0}
              suggestions={activeLineId === line.lineId ? suggestions : []}
              issues={issues}
              units={units}
              showCommercials={showCommercials}
              onQuery={onQuery}
              onFocusLine={onFocusLine}
              onPick={onPick}
              onPatch={onPatch}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeaderCell({ children, className = '', required = false }: { children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <th
      className={`border border-gray-300 px-1 py-1 text-left text-[9px] font-bold uppercase leading-tight tracking-wide text-gray-700 ${className}`}
    >
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </th>
  );
}

interface FabricLineRowProps {
  line: FabricPoLine;
  open: boolean;
  suggestions: FabricCatalog[];
  issues: Record<string, string>;
  units: FabricMeasurementLookup[];
  showCommercials: boolean;
  onQuery: (lineId: string, value: string) => void;
  onFocusLine: (lineId: string) => void;
  onPick: (lineId: string, fabric: FabricCatalog) => void;
  onPatch: (lineId: string, patch: Partial<FabricPoLine>) => void;
  onRemove: (lineId: string) => void;
}

function FabricLineRow({
  line,
  open,
  suggestions,
  issues,
  units,
  showCommercials,
  onQuery,
  onFocusLine,
  onPick,
  onPatch,
  onRemove,
}: FabricLineRowProps) {
  const fabricError = issues[`fabric-${line.lineId}`];
  return (
    <tr className={line.unmatched || fabricError ? 'bg-red-50' : 'hover:bg-gray-50'}>
      <td className={cellClass}>
        <FabricNameCell
          line={line}
          open={open}
          suggestions={suggestions}
          invalid={Boolean(fabricError)}
          onQuery={onQuery}
          onFocusLine={onFocusLine}
          onPick={onPick}
          onPatch={onPatch}
        />
      </td>
      <td className={cellClass}>
        <input aria-label="Fabric type" readOnly value={line.fabricTypeName} placeholder="Type" title={line.fabricTypeName} className={`${inputClass} truncate bg-gray-50`} />
      </td>
      <td className={cellClass}>
        <input aria-label="Color" readOnly value={line.colourName} placeholder="Color" title={line.colourName} className={`${inputClass} truncate bg-gray-50`} />
      </td>
      <td className={cellClass}>
        <input aria-label="Sort No" readOnly value={line.fabricSortNo} placeholder="—" title={line.fabricSortNo} className={`${inputClass} truncate bg-gray-50`} />
      </td>
      <td className={cellClass}>
        <input aria-label="Mill Old" readOnly value={line.millOldFabricSortNo} placeholder="—" title={line.millOldFabricSortNo} className={`${inputClass} truncate bg-gray-50`} />
      </td>
      <td className={cellClass}>
        <input aria-label="Mill New" readOnly value={line.millNewFabricSortNo} placeholder="—" title={line.millNewFabricSortNo} className={`${inputClass} truncate bg-gray-50`} />
      </td>
      <td className={cellClass}>
        <input aria-label="Count" readOnly value={line.countName} placeholder="—" title={line.countName} className={`${inputClass} truncate bg-gray-50`} />
      </td>
      {showCommercials ? (
        <td className={cellClass}>
          <DecimalCell
            label="Rate"
            value={line.rate}
            invalid={Boolean(issues[`rate-${line.lineId}`])}
            onChange={(value) => onPatch(line.lineId, { rate: value })}
          />
        </td>
      ) : null}
      <td className={cellClass}>
        <DecimalCell
          label="Quantity"
          value={line.quantity}
          invalid={Boolean(issues[`qty-${line.lineId}`])}
          onChange={(value) => onPatch(line.lineId, { quantity: value })}
        />
      </td>
      <td className={cellClass}>
        <select
          aria-label="Unit"
          aria-invalid={Boolean(issues[`unit-${line.lineId}`])}
          value={line.unitId}
          title={line.unitName}
          className={`${inputClass} ${issues[`unit-${line.lineId}`] ? 'border-red-400' : ''}`}
          onChange={(event) => {
            const unit = units.find((row) => row.id === event.target.value);
            onPatch(line.lineId, { unitId: event.target.value, unitName: unit ? measurementLabel(unit) : '' });
          }}
        >
          <option value="">Select</option>
          {(['length', 'weight', 'quantity', 'area'] as const).map((category) => {
            const rows = units.filter((unit) => unit.category === category);
            if (!rows.length) return null;
            return (
              <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                {rows.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {measurementLabel(unit)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </td>
      <td className={cellClass}>
        <input
          type="date"
          aria-label="Estimated delivery"
          aria-invalid={Boolean(issues[`delivery-${line.lineId}`])}
          value={line.estimatedDelivery}
          className={`max-w-full ${inputClass} ${issues[`delivery-${line.lineId}`] ? 'border-red-400' : ''}`}
          onChange={(event) => onPatch(line.lineId, { estimatedDelivery: event.target.value })}
        />
      </td>
      {showCommercials ? (
        <td className={cellClass}>
          <DecimalCell
            label="GST percent"
            value={line.gstPercent}
            max={100}
            invalid={Boolean(issues[`gst-${line.lineId}`])}
            onChange={(value) => onPatch(line.lineId, { gstPercent: value })}
          />
        </td>
      ) : null}
      <td className={`${cellClass} text-center`}>
        <button
          type="button"
          className="rounded p-0.5 text-red-600 hover:bg-red-50 hover:text-red-800"
          aria-label={line.fabricName ? `Remove ${line.fabricName}` : 'Remove fabric line'}
          onClick={() => onRemove(line.lineId)}
        >
          <i className="ri-delete-bin-line text-xs" aria-hidden />
        </button>
      </td>
    </tr>
  );
}

interface FabricNameCellProps {
  line: FabricPoLine;
  open: boolean;
  suggestions: FabricCatalog[];
  invalid: boolean;
  onQuery: (lineId: string, value: string) => void;
  onFocusLine: (lineId: string) => void;
  onPick: (lineId: string, fabric: FabricCatalog) => void;
  onPatch: (lineId: string, patch: Partial<FabricPoLine>) => void;
}

/**
 * Fabric search field. Suggestions render on document.body so the table cannot clip them.
 */
function FabricNameCell({ line, open, suggestions, invalid, onQuery, onFocusLine, onPick, onPatch }: FabricNameCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {line.unmatched || invalid ? <p className="mb-0.5 text-[9px] font-medium text-red-600">Not matched</p> : null}
      <input
        ref={inputRef}
        type="text"
        value={line.query}
        aria-label="Fabric name"
        aria-invalid={invalid}
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Search..."
        title={line.query}
        className={`${inputClass} truncate ${invalid ? 'border-red-400' : ''}`}
        onChange={(event) => onQuery(line.lineId, event.target.value)}
        onMouseDown={(event) => {
          event.stopPropagation();
          onFocusLine(line.lineId);
        }}
        onFocus={() => onFocusLine(line.lineId)}
        onBlur={() => {
          if (!line.fabricId && line.query.trim()) onPatch(line.lineId, { unmatched: true });
        }}
      />
      {open ? <FabricSuggestMenu anchorRef={inputRef} line={line} suggestions={suggestions} onPick={onPick} /> : null}
    </>
  );
}

interface FabricSuggestMenuProps {
  anchorRef: React.RefObject<HTMLInputElement>;
  line: FabricPoLine;
  suggestions: FabricCatalog[];
  onPick: (lineId: string, fabric: FabricCatalog) => void;
}

/**
 * Places the fabric suggestion list under the input, above later form sections.
 */
function FabricSuggestMenu({ anchorRef, line, suggestions, onPick }: FabricSuggestMenuProps) {
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const place = () => {
      const node = anchorRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setBox({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef, suggestions]);

  if (!box || typeof document === 'undefined') return null;

  return createPortal(
    <ul
      data-fabric-line
      role="listbox"
      aria-label="Fabric suggestions"
      className="fixed z-[80] max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{ top: box.top, left: box.left, width: box.width }}
    >
      {suggestions.map((fabric) => (
        <li key={fabric.id}>
          <button
            type="button"
            role="option"
            aria-selected={fabric.id === line.fabricId}
            className="w-full border-b border-gray-100 px-3 py-1.5 text-left last:border-b-0 hover:bg-gray-100"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onPick(line.lineId, fabric);
            }}
          >
            <span className="block text-[10px] font-medium text-gray-900">{fabric.name}</span>
            <span className="block text-[9px] text-gray-500">
              {[fabricTypeLabel(fabric), fabricColorLabel(fabric), fabric.fabricSortNo].filter(Boolean).join(' · ') ||
                'No type or colour'}
            </span>
          </button>
        </li>
      ))}
    </ul>,
    document.body
  );
}

function DecimalCell({
  label,
  value,
  max,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  max?: number;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid}
      placeholder="0.00"
      value={value}
      className={`${inputClass} ${invalid ? 'border-red-400' : ''}`}
      onChange={(event) => {
        const next = decimalInput(event.target.value, max);
        if (next != null) onChange(next);
      }}
    />
  );
}
