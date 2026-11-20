'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { downloadShipmentBatchChallan, printShipmentBatchChallanById } from './dispatchChallan';

const fieldClass =
  'w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0';

export interface DispatchShipmentDetail {
  id: string;
  shipmentCode: string;
  challanNumber: string;
  productionOrderId: string;
  orderNumber: string;
  buyer: string;
  status: 'draft' | 'dispatched' | 'cancelled';
  vehicleNumber: string;
  boxLines: { boxBarcode: string; pieceQty: number; scaleWeight: number; rackCode: string }[];
  boxCount: number;
  pieceQty: number;
  scaleWeight: number;
  dispatchedAt?: string | null;
}

export function DispatchShipmentDrawer({
  shipmentId,
  onClose,
  onChanged,
  autoScanBarcode,
}: {
  shipmentId: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
  autoScanBarcode?: string;
}) {
  const [detail, setDetail] = useState<DispatchShipmentDetail | null>(null);
  const [scan, setScan] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [challanBusy, setChallanBusy] = useState<'print' | 'download' | ''>('');
  const scanRef = useRef<HTMLInputElement>(null);
  const autoScanned = useRef(false);

  const reload = useCallback(async () => {
    const fresh = await factoryRequest<DispatchShipmentDetail>(`/warehouse/dispatch/shipments/${shipmentId}`);
    setDetail(fresh);
    return fresh;
  }, [shipmentId]);

  useEffect(() => {
    setDetail(null);
    setError('');
    setVehicle('');
    setScan('');
    autoScanned.current = false;
    reload().catch((err) => setError(err instanceof Error ? err.message : 'Could not load batch'));
  }, [reload]);

  useEffect(() => {
    if (detail?.status === 'draft') scanRef.current?.focus();
  }, [detail?.status]);

  const addScan = async (barcode: string) => {
    const code = barcode.trim();
    if (!code || !detail || detail.status !== 'draft') return;
    setSaving(true);
    setError('');
    try {
      const next = await factoryRequest<DispatchShipmentDetail>(`/warehouse/dispatch/shipments/${shipmentId}/scan`, {
        method: 'POST',
        body: JSON.stringify({ boxBarcode: code }),
      });
      setDetail(next);
      setScan('');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!autoScanBarcode || !detail || detail.status !== 'draft' || autoScanned.current) return;
    autoScanned.current = true;
    addScan(autoScanBarcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto scan when drawer opens
  }, [autoScanBarcode, detail?.id, detail?.status]);

  const removeLine = async (barcode: string) => {
    if (!detail || detail.status !== 'draft') return;
    setSaving(true);
    setError('');
    try {
      const next = await factoryRequest<DispatchShipmentDetail>(
        `/warehouse/dispatch/shipments/${shipmentId}/lines/${encodeURIComponent(barcode)}`,
        { method: 'DELETE' }
      );
      setDetail(next);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove box');
    } finally {
      setSaving(false);
    }
  };

  const dispatchBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || detail.status !== 'draft') return;
    setSaving(true);
    setError('');
    try {
      const next = await factoryRequest<DispatchShipmentDetail>(`/warehouse/dispatch/shipments/${shipmentId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ vehicleNumber: vehicle, eventId: `dsp-${detail.shipmentCode}`, site: 'factory' }),
      });
      setDetail(next);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setSaving(false);
    }
  };

  const outputChallan = async (mode: 'print' | 'download') => {
    if (!detail) return;
    setChallanBusy(mode);
    setError('');
    try {
      if (mode === 'print') await printShipmentBatchChallanById(detail);
      else await downloadShipmentBatchChallan(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Challan failed');
    } finally {
      setChallanBusy('');
    }
  };

  const subtitle = detail
    ? `${detail.shipmentCode} · ${detail.orderNumber}${detail.buyer ? ` · ${detail.buyer}` : ''}`
    : 'Loading…';

  return (
    <FactoryDrawer title={detail?.status === 'dispatched' ? 'Dispatched batch' : 'Dispatch batch'} subtitle={subtitle} open onClose={onClose}>
      <DrawerSection title="Summary">
        {detail ? (
          <p className="text-[11px] text-gray-700">
            {detail.boxCount} box(es) · {detail.pieceQty} pcs · {detail.scaleWeight > 0 ? `${detail.scaleWeight} kg` : '—'} ·{' '}
            <span className="font-bold uppercase">{detail.status}</span>
            {detail.vehicleNumber ? ` · Vehicle ${detail.vehicleNumber}` : ''}
            {detail.dispatchedAt ? (
              <span className="block text-gray-500">
                Dispatched {new Date(detail.dispatchedAt).toLocaleString()}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="text-[11px] text-gray-500">Loading…</p>
        )}
        {error ? (
          <p className="mt-2 text-[12px] text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </DrawerSection>

      {detail?.status === 'draft' ? (
        <DrawerSection title="Scan boxes">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addScan(scan);
            }}
          >
            <label className="grid flex-1 gap-1 text-[11px] font-bold text-gray-700" htmlFor="dsp-scan">
              Box barcode
              <input
                id="dsp-scan"
                ref={scanRef}
                className={fieldClass}
                value={scan}
                onChange={(event) => setScan(event.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </label>
            <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50" disabled={saving}>
              Add
            </button>
          </form>
        </DrawerSection>
      ) : null}

      <DrawerSection title="Boxes on batch">
        <table className="w-full border-collapse border border-gray-200 text-[11px]">
          <thead>
            <tr className="bg-gray-50">
              {['Box', 'Pcs', 'Kg', 'Rack', detail?.status === 'draft' ? ' ' : null]
                .filter(Boolean)
                .map((label) => (
                  <th key={String(label)} className="border border-gray-200 px-1.5 py-2 text-left font-bold uppercase text-gray-600">
                    {label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {detail?.boxLines.length ? (
              detail.boxLines.map((row) => (
                <tr key={row.boxBarcode}>
                  <td className="border border-gray-200 px-1.5 py-2 font-mono">{row.boxBarcode}</td>
                  <td className="border border-gray-200 px-1.5 py-2">{row.pieceQty}</td>
                  <td className="border border-gray-200 px-1.5 py-2">{row.scaleWeight || '—'}</td>
                  <td className="border border-gray-200 px-1.5 py-2">{row.rackCode || '—'}</td>
                  {detail.status === 'draft' ? (
                    <td className="border border-gray-200 px-1.5 py-2">
                      <button type="button" className="font-bold text-red-600" disabled={saving} onClick={() => removeLine(row.boxBarcode)}>
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={detail?.status === 'draft' ? 5 : 4} className="border border-gray-200 py-8 text-center text-gray-400">
                  Scan boxes onto this batch
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DrawerSection>

      {detail?.status === 'draft' ? (
        <DrawerSection title="Vehicle & dispatch">
          <form className="grid max-w-md gap-3" onSubmit={dispatchBatch}>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="dsp-vehicle">
              Vehicle number
            </label>
            <input
              id="dsp-vehicle"
              className={fieldClass}
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
              required
              disabled={saving || !detail.boxCount}
            />
            <button
              type="submit"
              className="w-fit rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
              disabled={saving || !detail.boxCount}
            >
              {saving ? 'Dispatching…' : 'Dispatch batch'}
            </button>
          </form>
        </DrawerSection>
      ) : null}

      {detail?.status === 'dispatched' ? (
        <DrawerSection title="Challan">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
              disabled={Boolean(challanBusy)}
              aria-label="Print dispatch challan"
              onClick={() => outputChallan('print')}
            >
              {challanBusy === 'print' ? 'Printing…' : 'Print'}
            </button>
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1.5 text-[11px] font-bold disabled:opacity-60"
              disabled={Boolean(challanBusy)}
              aria-label="Download dispatch challan"
              onClick={() => outputChallan('download')}
            >
              {challanBusy === 'download' ? 'Downloading…' : 'Download'}
            </button>
          </div>
        </DrawerSection>
      ) : null}
    </FactoryDrawer>
  );
}

export async function openDispatchShipmentForOrder(productionOrderId: string) {
  return factoryRequest<DispatchShipmentDetail>('/warehouse/dispatch/shipments', {
    method: 'POST',
    body: JSON.stringify({ productionOrderId }),
  });
}