'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FabricCatalog } from '@/shared/services/fabricCatalogService';
import { FabricMeasurementLookup } from '@/shared/services/fabricLookupService';
import { decimalInput, FabricPoLine, fabricColorLabel, fabricTypeLabel, measurementLabel } from './purchaseOrderFormModel';

const inputClass =
  'w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-primary';

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
    <div className="overflow-x-auto overflow-y-visible">
      <table className="min-w-full border border-gray-300 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <HeaderCell required className="min-w-[220px]">Fabric name</HeaderCell>
            <HeaderCell className="min-w-[120px]">Fabric type</HeaderCell>
            <HeaderCell className="min-w-[120px]">Color</HeaderCell>
            {showCommercials ? <HeaderCell required className="min-w-[110px]">Rate (₹)</HeaderCell> : null}
            <HeaderCell required className="min-w-[110px]">Quantity</HeaderCell>
            <HeaderCell required className="min-w-[140px]">Unit</HeaderCell>
            <HeaderCell required className="min-w-[160px]">Est. delivery</HeaderCell>
            {showCommercials ? <HeaderCell required className="min-w-[90px]">GST (%)</HeaderCell> : null}
            <HeaderCell className="min-w-[70px] text-center">Action</HeaderCell>
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
    <th className={`border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 ${className}`}>
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
      <td className="border border-gray-300 px-2 py-1.5">
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
      <td className="border border-gray-300 px-2 py-1.5">
        <input aria-label="Fabric type" readOnly value={line.fabricTypeName} placeholder="Type" className={`${inputClass} bg-gray-50`} />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <input aria-label="Color" readOnly value={line.colourName} placeholder="Color" className={`${inputClass} bg-gray-50`} />
      </td>
      {showCommercials ? (
        <td className="border border-gray-300 px-2 py-1.5">
          <DecimalCell
            label="Rate"
            value={line.rate}
            invalid={Boolean(issues[`rate-${line.lineId}`])}
            onChange={(value) => onPatch(line.lineId, { rate: value })}
          />
        </td>
      ) : null}
      <td className="border border-gray-300 px-2 py-1.5">
        <DecimalCell
          label="Quantity"
          value={line.quantity}
          invalid={Boolean(issues[`qty-${line.lineId}`])}
          onChange={(value) => onPatch(line.lineId, { quantity: value })}
        />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <select
          aria-label="Unit"
          aria-invalid={Boolean(issues[`unit-${line.lineId}`])}
          value={line.unitId}
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
      <td className="border border-gray-300 px-2 py-1.5">
        <input
          type="date"
          aria-label="Estimated delivery"
          aria-invalid={Boolean(issues[`delivery-${line.lineId}`])}
          value={line.estimatedDelivery}
          className={`${inputClass} ${issues[`delivery-${line.lineId}`] ? 'border-red-400' : ''}`}
          onChange={(event) => onPatch(line.lineId, { estimatedDelivery: event.target.value })}
        />
      </td>
      {showCommercials ? (
        <td className="border border-gray-300 px-2 py-1.5">
          <DecimalCell
            label="GST percent"
            value={line.gstPercent}
            max={100}
            invalid={Boolean(issues[`gst-${line.lineId}`])}
            onChange={(value) => onPatch(line.lineId, { gstPercent: value })}
          />
        </td>
      ) : null}
      <td className="border border-gray-300 px-2 py-1.5 text-center">
        <button
          type="button"
          className="rounded p-0.5 text-red-600 hover:bg-red-50 hover:text-red-800"
          aria-label={line.fabricName ? `Remove ${line.fabricName}` : 'Remove fabric line'}
          onClick={() => onRemove(line.lineId)}
        >
          <i className="ri-delete-bin-line text-sm" aria-hidden />
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
      {line.unmatched || invalid ? <p className="mb-1 text-[10px] font-medium text-red-600">Not matched</p> : null}
      <input
        ref={inputRef}
        type="text"
        value={line.query}
        aria-label="Fabric name"
        aria-invalid={invalid}
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Type to search..."
        className={`${inputClass} ${invalid ? 'border-red-400' : ''}`}
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
            <span className="block text-xs font-medium text-gray-900">{fabric.name}</span>
            <span className="block text-[10px] text-gray-500">
              {[fabricTypeLabel(fabric), fabricColorLabel(fabric)].filter(Boolean).join(' · ') || 'No type or colour'}
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
