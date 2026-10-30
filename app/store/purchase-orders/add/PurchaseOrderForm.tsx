'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { FabricCatalog } from '@/shared/services/fabricCatalogService';
import { FabricSupplier } from '@/shared/services/fabricSupplierService';
import { FabricMeasurementLookup } from '@/shared/services/fabricLookupService';
import { PurchaseOrderConfirmModal, PoConfirmMode } from './PurchaseOrderConfirmModal';
import { PurchaseOrderFormField } from './PurchaseOrderFormField';
import { PurchaseOrderExcelActions } from './PurchaseOrderExcelActions';
import { PurchaseOrderFormActions } from './PurchaseOrderFormActions';
import { PurchaseOrderItemsTable } from './PurchaseOrderItemsTable';
import { downloadFabricItemsExcel, downloadFabricItemsTemplate, lineFromImport, parseFabricItemsExcel } from './purchaseOrderExcel';
import { lineAfterPick, lineAfterQuery } from './purchaseOrderLineDraft';
import {
  creditDaysFromTerms,
  emptyLine,
  fabricsForSupplier,
  filterFabrics,
  firstIssue,
  formatInr,
  formatQty,
  lineHasContent,
  PoFormSeed,
  PoSavePayload,
  todayIso,
  toPoPayload,
  poTotals,
  validatePoForm,
  FabricPoLine,
} from './purchaseOrderFormModel';

const fieldClass =
  'w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-0';

interface PurchaseOrderFormProps {
  fabrics: FabricCatalog[];
  suppliers: FabricSupplier[];
  units: FabricMeasurementLookup[];
  saving: boolean;
  seed?: PoFormSeed;
  /** Submitted orders save in place. New and draft orders can still be raised. */
  allowRaise?: boolean;
  onSave: (payload: PoSavePayload, mode: 'draft' | 'raise') => Promise<void>;
  onCancel: () => void;
}

/**
 * Super admin sets rate, quantity, GST, and delivery. Other roles can draft the lines.
 */
function canSeeCommercials(role?: string): boolean {
  const normalized = (role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!normalized) return true;
  return normalized === 'super_admin' || normalized === 'superadmin';
}

/** Symbol shown on the total when every filled line uses the same unit. */
function sharedUnit(lines: FabricPoLine[]): string {
  const labels = lines.filter(lineHasContent).map((line) => line.unitName).filter(Boolean);
  if (!labels.length || labels.some((label) => label !== labels[0])) return '';
  return labels[0];
}

/**
 * New purchase order form. Fabric lines stay closed until a supplier is selected.
 */
export function PurchaseOrderForm({ fabrics, suppliers, units, saving, seed, allowRaise = true, onSave, onCancel }: PurchaseOrderFormProps) {
  const role = useSelector((state: { auth?: { user?: { role?: string } } }) => state.auth?.user?.role);
  const showCommercials = canSeeCommercials(role);
  const fileRef = useRef<HTMLInputElement>(null);
  const supplierBoxRef = useRef<HTMLDivElement>(null);
  const [purchaseDate, setPurchaseDate] = useState(seed?.purchaseDate || todayIso);
  const [supplierId, setSupplierId] = useState(seed?.supplierId || '');
  const [supplierQuery, setSupplierQuery] = useState(seed?.supplierQuery || '');
  const [supplierAddress, setSupplierAddress] = useState(seed?.supplierAddress || '');
  const [supplierTerms, setSupplierTerms] = useState(seed?.supplierTerms || '');
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [creditDays, setCreditDays] = useState(seed?.creditDays ?? '0');
  const [estimatedDelivery, setEstimatedDelivery] = useState(seed?.estimatedDelivery || '');
  const [notes, setNotes] = useState(seed?.notes || '');
  const [lines, setLines] = useState<FabricPoLine[]>(seed?.lines || []);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [confirmMode, setConfirmMode] = useState<PoConfirmMode | null>(null);

  const supplier = suppliers.find((row) => row.id === supplierId);
  const fabricChoices = useMemo(() => fabricsForSupplier(fabrics, supplier), [fabrics, supplier]);
  const supplierSuggestions = useMemo(() => {
    const needle = supplierQuery.trim().toLowerCase();
    const rows = needle ? suppliers.filter((row) => row.name.toLowerCase().includes(needle)) : suppliers;
    return rows.slice(0, 20);
  }, [supplierQuery, suppliers]);
  const activeLine = lines.find((line) => line.lineId === activeLineId);
  const suggestions = activeLine ? filterFabrics(fabricChoices, activeLine.query) : [];
  const totals = poTotals(lines.filter(lineHasContent));

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!supplierBoxRef.current?.contains(event.target as Node)) setShowSuppliers(false);
      const target = event.target as HTMLElement;
      if (!target.closest('[data-fabric-line]')) setActiveLineId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  /**
   * Fills supplier details and opens one blank fabric row.
   */
  const selectSupplier = (row: FabricSupplier) => {
    setSupplierId(row.id);
    setSupplierQuery(row.name);
    setSupplierAddress([row.address, row.city, row.state].filter(Boolean).join(', '));
    setSupplierTerms(row.paymentTerms || '');
    setCreditDays(String(creditDaysFromTerms(row.paymentTerms)));
    setShowSuppliers(false);
    setLines([emptyLine(estimatedDelivery, units)]);
    setIssues((prev) => ({ ...prev, supplier: '' }));
  };

  /**
   * Clears the supplier and hides the item grid when the name no longer matches.
   */
  const onSupplierInput = (value: string) => {
    setSupplierQuery(value);
    setShowSuppliers(true);
    if (supplier && value.trim().toLowerCase() !== supplier.name.trim().toLowerCase()) {
      setSupplierId('');
      setSupplierAddress('');
      setSupplierTerms('');
      setLines([]);
    }
  };

  const patchLine = (lineId: string, patch: Partial<FabricPoLine>) => {
    setLines((prev) => prev.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line)));
  };

  const onQuery = (lineId: string, query: string) => {
    setActiveLineId(lineId);
    const matches = filterFabrics(fabricChoices, query);
    setLines((prev) => prev.map((line) => (line.lineId === lineId ? lineAfterQuery(line, query, matches) : line)));
  };

  const onPick = (lineId: string, fabric: FabricCatalog) => {
    setLines((prev) => prev.map((line) => (line.lineId === lineId ? lineAfterPick(line, fabric, units) : line)));
    setActiveLineId(null);
  };

  const addLine = () => {
    if (!supplierId) return;
    const line = emptyLine(estimatedDelivery, units);
    setLines((prev) => [...prev, line]);
    setActiveLineId(line.lineId);
  };

  const removeLine = (lineId: string) => {
    const line = lines.find((row) => row.lineId === lineId);
    const label = line?.fabricName || line?.query || 'this line';
    if (!window.confirm(`Remove ${label} from the purchase order?`)) return;
    setLines((prev) => prev.filter((row) => row.lineId !== lineId));
  };

  /**
   * Runs a file action and reports the failure. Returns false when it throws.
   */
  const runExcel = async (action: () => Promise<void>, failure: string): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
      return false;
    }
  };

  const onImport = async (file: File) => {
    if (!supplierId) {
      toast.error('Select a supplier first');
      return;
    }
    setImporting(true);
    try {
      const parsed = await parseFabricItemsExcel(file);
      parsed.errors.forEach((message) => toast.error(message));
      if (!parsed.rows.length) {
        if (!parsed.errors.length) toast.error('No fabric rows found in the file');
        return;
      }
      const imported = parsed.rows.map((row) => lineFromImport(row, fabricChoices, units, estimatedDelivery));
      setLines((prev) => [...prev.filter(lineHasContent), ...imported]);
      const missed = imported.filter((line) => line.unmatched).length;
      toast.success(missed ? `${imported.length} row(s) added, ${missed} not matched` : `${imported.length} item(s) added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const submit = async (mode: PoConfirmMode) => {
    const values = { purchaseDate, supplierId, creditDays, estimatedDelivery, notes, lines };
    const validateAs = mode === 'draft' ? 'draft' : 'raise';
    const nextIssues = validatePoForm(values, validateAs);
    if (!showCommercials && validateAs === 'raise') {
      Object.keys(nextIssues).forEach((key) => {
        if (key.startsWith('rate-') || key.startsWith('gst-')) delete nextIssues[key];
      });
      if (mode === 'raise') nextIssues.role = 'Only a super admin can raise a purchase order';
    }
    setIssues(nextIssues);
    const message = firstIssue(nextIssues);
    if (message) {
      toast.error(message);
      return;
    }
    await onSave(
      toPoPayload(values, { name: supplier?.name || supplierQuery, address: supplierAddress, terms: supplierTerms }),
      mode === 'raise' ? 'raise' : 'draft'
    );
  };

  return (
    <form
      className="catalog-form-grid-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (saving) return;
        if (allowRaise && showCommercials) setConfirmMode('raise');
        else if (!allowRaise) setConfirmMode('update');
      }}
    >
      {firstIssue(issues) ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {firstIssue(issues)}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PurchaseOrderFormField label="Purchase Date" required error={issues.purchaseDate}>
          <input
            type="date"
            aria-label="Purchase date"
            aria-invalid={Boolean(issues.purchaseDate)}
            required
            value={purchaseDate}
            className={fieldClass}
            onChange={(event) => setPurchaseDate(event.target.value)}
          />
        </PurchaseOrderFormField>
        <PurchaseOrderFormField label="Supplier Name" required error={issues.supplier}>
          <div className="relative" ref={supplierBoxRef}>
            <input
              type="text"
              aria-label="Supplier name"
              aria-invalid={Boolean(issues.supplier)}
              required
              placeholder="Type to search supplier..."
              value={supplierQuery}
              className={fieldClass}
              onChange={(event) => onSupplierInput(event.target.value)}
              onMouseDown={(event) => {
                event.stopPropagation();
                setShowSuppliers(true);
              }}
              onFocus={() => setShowSuppliers(true)}
            />
            {showSuppliers && supplierSuggestions.length > 0 ? (
              <ul role="listbox" aria-label="Supplier suggestions" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {supplierSuggestions.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={row.id === supplierId}
                      className="w-full border-b border-gray-100 px-3 py-1.5 text-left last:border-b-0 hover:bg-gray-100"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSupplier(row)}
                    >
                      <span className="block text-xs font-medium text-gray-900">{row.name}</span>
                      <span className="block text-[10px] text-gray-500">{[row.city, row.state].filter(Boolean).join(', ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </PurchaseOrderFormField>
        <PurchaseOrderFormField label="Credit Days" required error={issues.creditDays}>
          <input
            type="number"
            min={0}
            aria-label="Credit days"
            aria-invalid={Boolean(issues.creditDays)}
            required
            value={creditDays}
            className={fieldClass}
            onChange={(event) => setCreditDays(event.target.value)}
          />
        </PurchaseOrderFormField>
        <PurchaseOrderFormField label="Estimated Order Delivery Date" required error={issues.estimatedDelivery}>
          <input
            type="date"
            aria-label="Estimated order delivery date"
            aria-invalid={Boolean(issues.estimatedDelivery)}
            required
            value={estimatedDelivery}
            className={fieldClass}
            onChange={(event) => {
              const value = event.target.value;
              setEstimatedDelivery(value);
              setLines((prev) => prev.map((line) => (line.estimatedDelivery ? line : { ...line, estimatedDelivery: value })));
            }}
          />
        </PurchaseOrderFormField>
      </div>

      <section className="border-t border-gray-200 pt-4" aria-label="Fabric items">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-gray-800">Fabric Items</h2>
          <PurchaseOrderExcelActions
            canImport={Boolean(supplierId)}
            canExport={lines.some(lineHasContent)}
            importing={importing}
            onDownload={() => {
              void runExcel(downloadFabricItemsTemplate, 'Could not download the template').then((ok) => {
                if (ok) toast.success('Template downloaded');
              });
            }}
            onExport={() => {
              void runExcel(() => downloadFabricItemsExcel(lines.filter(lineHasContent)), 'Could not export items').then((ok) => {
                if (ok) toast.success('Fabric items exported');
              });
            }}
            onImport={() => fileRef.current?.click()}
            onAdd={addLine}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          aria-label="Import fabric items from Excel"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void onImport(file);
          }}
        />
        {!supplierId ? (
          <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-2 text-xs text-yellow-800" role="status">
            <i className="ri-information-line me-1.5" aria-hidden />
            Select a supplier before adding fabric items.
          </p>
        ) : null}
        {supplierId && lines.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-6 text-center">
            <i className="ri-shopping-cart-line text-3xl text-gray-400" aria-hidden />
            <p className="mt-2 text-xs font-medium text-gray-900">No items added</p>
            <p className="mb-3 text-[10px] text-gray-500">Add fabric items to create a purchase order.</p>
            <div className="flex justify-center">
              <PurchaseOrderExcelActions
                canImport
                canExport={false}
                importing={importing}
                addLabel="Add first item"
                onDownload={() => void runExcel(downloadFabricItemsTemplate, 'Could not download the template')}
                onExport={() => undefined}
                onImport={() => fileRef.current?.click()}
                onAdd={addLine}
              />
            </div>
          </div>
        ) : null}
        {supplierId && lines.length > 0 ? (
          <div data-fabric-line className="relative z-30">
            <PurchaseOrderItemsTable
              lines={lines}
              suggestions={suggestions}
              activeLineId={activeLineId}
              issues={issues}
              units={units}
              showCommercials={showCommercials}
              onQuery={onQuery}
              onFocusLine={setActiveLineId}
              onPick={onPick}
              onPatch={patchLine}
              onRemove={removeLine}
            />
          </div>
        ) : null}
        {issues.items ? <p className="mt-2 text-xs text-red-600">{issues.items}</p> : null}
      </section>

      {lines.some(lineHasContent) ? (
        <div className="flex justify-end pt-3">
          <table className="!w-auto shrink-0 border border-gray-200 bg-white">
            <thead>
              <tr>
                {['Total qty', 'Subtotal', 'GST', 'Total'].map((label) => (
                  <th key={label} className="!w-auto whitespace-nowrap !px-4 !py-1.5 !text-center text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="whitespace-nowrap !px-4 !py-1.5 !text-right text-xs">
                  {formatQty(totals.qty)}
                  {sharedUnit(lines) ? ` ${sharedUnit(lines)}` : ''}
                </td>
                <td className="whitespace-nowrap !px-4 !py-1.5 !text-right text-xs">{showCommercials ? formatInr(totals.sub) : '—'}</td>
                <td className="whitespace-nowrap !px-4 !py-1.5 !text-right text-xs">{showCommercials ? formatInr(totals.gst) : '—'}</td>
                <td className="whitespace-nowrap !px-4 !py-1.5 !text-right text-xs font-bold">{showCommercials ? formatInr(totals.total) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="border-t border-gray-200 pt-4">
        <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="po-notes">
          Notes
        </label>
        <textarea
          id="po-notes"
          rows={2}
          aria-label="Notes"
          placeholder="Additional notes about the purchase order..."
          value={notes}
          className={fieldClass}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <PurchaseOrderFormActions
        saving={saving}
        allowRaise={allowRaise}
        showCommercials={showCommercials}
        onCancel={onCancel}
        onSave={() => setConfirmMode(allowRaise ? 'draft' : 'update')}
        onRaise={() => setConfirmMode('raise')}
      />
      <PurchaseOrderConfirmModal
        mode={confirmMode}
        saving={saving}
        onClose={() => {
          if (!saving) setConfirmMode(null);
        }}
        onConfirm={() => {
          if (!confirmMode || saving) return;
          const mode = confirmMode;
          void submit(mode).finally(() => setConfirmMode(null));
        }}
      />
    </form>
  );
}
