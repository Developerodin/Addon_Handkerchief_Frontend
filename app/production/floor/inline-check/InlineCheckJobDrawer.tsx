'use client';

import React, { useEffect, useState } from 'react';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listProductionRacks, ProductionRack } from '@/shared/services/phase3CatalogService';
import { InlineCheckBundle, InlineCheckMachine } from './types';

const fieldClass =
  'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

/**
 * One-step inline check: confirm against a horizontal-hemming machine and place on a bundles rack.
 */
export function InlineCheckJobDrawer({
  bundle,
  hemMachine,
  onClose,
  onChanged,
}: {
  bundle: InlineCheckBundle | null;
  hemMachine: InlineCheckMachine | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [rackCode, setRackCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [racks, setRacks] = useState<ProductionRack[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const jobKey = bundle?.id || '';

  useEffect(() => {
    if (!jobKey || !bundle) return;
    setRackCode(bundle.rackCode || '');
    setConfirmed(false);
    setError('');
  }, [jobKey, bundle]);

  useEffect(() => {
    if (!jobKey) return;
    listProductionRacks({ page: 1, limit: 200, status: 'active' })
      .then((page) => setRacks((page.results || []).filter((rack) => rack.stockType === 'bundles')))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load racks'));
  }, [jobKey]);

  if (!bundle || !hemMachine) return null;

  const machineLabel = hemMachine.name || hemMachine.code || hemMachine.barcode;

  const save = async () => {
    if (!confirmed) {
      setError('Confirm inline checking is done for this bundle');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/production/inline-check/record', {
        method: 'POST',
        body: JSON.stringify({
          bundleBarcode: bundle.barcode,
          hemMachineBarcode: hemMachine.barcode,
          rackCode,
          confirmed: true,
        }),
      });
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save inline checking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FactoryDrawer
      open
      title="Inline checking"
      subtitle={bundle.orderNumber || bundle.orderId.slice(-6)}
      onClose={onClose}
    >
      <DrawerSection title="Bundle">
        <p className="p-3 font-mono text-[12px] font-bold text-gray-900">
          {bundle.barcode}
          <span className="ml-2 font-sans font-medium text-gray-600">· {bundle.qty} pcs</span>
        </p>
      </DrawerSection>
      <DrawerSection title="Horizontal hemming machine">
        <p className="p-3 text-[12px] text-gray-900">
          <span className="font-bold">{machineLabel}</span>
          <span className="ml-2 font-mono text-gray-600">{hemMachine.barcode}</span>
        </p>
      </DrawerSection>
      <DrawerSection title="Confirm">
        <label className="flex cursor-pointer items-start gap-2 p-3 text-[12px] text-gray-800">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            Inline checking done for this bundle from <strong>{machineLabel}</strong>
          </span>
        </label>
      </DrawerSection>
      <DrawerSection title="Bundles rack">
        <div className="grid gap-2 p-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500" htmlFor="ilcRack">
            Put bundle on rack
          </label>
          <select
            id="ilcRack"
            aria-label="Bundles rack"
            className={fieldClass}
            value={rackCode}
            onChange={(event) => setRackCode(event.target.value)}
          >
            <option value="">Select rack</option>
            {racks.map((rack) => (
              <option key={rack.id} value={rack.code || rack.barcode}>
                {rack.name || rack.code} ({rack.code})
              </option>
            ))}
          </select>
        </div>
      </DrawerSection>
      {error ? (
        <p className="px-3 text-[12px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 border-t border-gray-100 p-3">
        <button
          type="button"
          className="rounded border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700 disabled:opacity-60"
          onClick={() => save().catch(() => undefined)}
          disabled={loading || !rackCode}
        >
          {loading ? 'Saving…' : 'Save & place on rack'}
        </button>
      </div>
    </FactoryDrawer>
  );
}