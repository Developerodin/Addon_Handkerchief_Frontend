'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { listMachines, listStorageRacks, Machine, StorageRack } from '@/shared/services/phase3CatalogService';
import { HalfMoonPiece } from './types';

/**
 * Starts half moon on racked selvage pieces and puts the same barcodes back on a rack.
 */
export function HalfMoonJobDrawer({
  piece,
  waiting,
  onClose,
  onChanged,
}: {
  piece: HalfMoonPiece | null;
  waiting: HalfMoonPiece[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [pieces, setPieces] = useState<HalfMoonPiece[]>([]);
  const [rackCode, setRackCode] = useState('');
  const [machineBarcode, setMachineBarcode] = useState('');
  const [destination, setDestination] = useState('');
  const [extraScan, setExtraScan] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const onTable = pieces.some((row) => row.status === 'in-work');

  useEffect(() => {
    if (!piece) return;
    setPieces([piece]);
    setRackCode(piece.rackCode || '');
    setMachineBarcode(piece.machineBarcode || '');
    setDestination('');
    setExtraScan('');
    setError('');
    Promise.all([listMachines({ page: 1, limit: 200, status: 'active' }), listStorageRacks({ page: 1, limit: 200, status: 'active' })])
      .then(([machinePage, rackPage]) => {
        setMachines((machinePage.results || []).filter((row) => row.barcode));
        setRacks((rackPage.results || []).filter((row) => row.stockType === 'pieces'));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load machines'));
  }, [piece]);

  if (!piece) return null;

  /**
   * Adds another waiting piece that is on the same rack.
   */
  const addPiece = () => {
    const code = extraScan.trim().toLowerCase();
    const match = waiting.find((row) => row.barcode.toLowerCase() === code);
    if (!match) {
      setError('That piece is not waiting on a rack');
      return;
    }
    if (match.rackCode !== rackCode.trim().toUpperCase() && match.rackCode !== rackCode.trim()) {
      setError('This piece is not on that rack');
      return;
    }
    setPieces((current) => (current.some((row) => row.barcode === match.barcode) ? current : [...current, match]));
    setExtraScan('');
    setError('');
  };

  /**
   * Moves the selected pieces from the rack onto the table.
   */
  const start = async () => {
    setLoading(true);
    setError('');
    try {
      const started = await factoryRequest<Array<{ barcode: string; orderId?: string; rollBarcode?: string; rackCode?: string; machineBarcode?: string }>>(
        '/production/half-moon/start',
        {
          method: 'POST',
          body: JSON.stringify({
            pieceBarcodes: pieces.map((row) => row.barcode),
            rackCode: rackCode.trim(),
            machineBarcode: machineBarcode.trim(),
          }),
        }
      );
      setPieces(
        started.map((row) => {
          const known = pieces.find((item) => item.barcode === row.barcode);
          return {
            barcode: row.barcode,
            orderId: String(row.orderId || known?.orderId || ''),
            orderNumber: known?.orderNumber || '',
            rollBarcode: row.rollBarcode || known?.rollBarcode || '',
            rackCode: row.rackCode || known?.rackCode || '',
            machineBarcode: row.machineBarcode || machineBarcode.trim(),
            status: 'in-work' as const,
          };
        })
      );
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start half moon');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Records the half moon cut and the rack the pieces go back to.
   */
  const place = async () => {
    if (!destination.trim()) {
      setError('Rack is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await factoryRequest('/production/half-moon/place', {
        method: 'POST',
        body: JSON.stringify({
          pieceBarcodes: pieces.map((row) => row.barcode),
          rackCode: destination.trim(),
        }),
      });
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not put pieces on the rack');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FactoryDrawer open title="Half moon cutting" subtitle={piece.orderNumber || piece.orderId.slice(-6)} onClose={onClose}>
      <DrawerSection title="Pieces">
        <ul className="grid gap-2 p-3">
          {pieces.map((row) => (
            <li key={row.barcode} className="text-[12px] text-gray-900">
              <span className="font-mono font-bold">{row.barcode}</span>
              <span className="text-gray-600"> · roll {row.rollBarcode || '—'} · {row.orderNumber || row.orderId.slice(-6)}</span>
            </li>
          ))}
        </ul>
      </DrawerSection>
      {!onTable ? (
        <DrawerSection title="Start">
          <form
            className="grid gap-3 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              start().catch(() => undefined);
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="halfMoonRack">
              Current rack
            </label>
            <input
              id="halfMoonRack"
              aria-label="Current rack"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0"
              value={rackCode}
              autoComplete="off"
              onChange={(event) => setRackCode(event.target.value)}
              required
            />
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="halfMoonExtra">
              Another piece on this rack
            </label>
            <div className="flex gap-2">
              <input
                id="halfMoonExtra"
                aria-label="Another piece barcode"
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0"
                value={extraScan}
                autoComplete="off"
                onChange={(event) => setExtraScan(event.target.value)}
              />
              <button
                type="button"
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50"
                onClick={addPiece}
              >
                Add
              </button>
            </div>
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="halfMoonMachine">
              Table or machine
            </label>
            <input
              id="halfMoonMachine"
              aria-label="Machine barcode"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0"
              value={machineBarcode}
              autoComplete="off"
              placeholder="Scan table"
              onChange={(event) => setMachineBarcode(event.target.value)}
              required
            />
            <select
              aria-label="Machine"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057]"
              value={machineBarcode}
              onChange={(event) => setMachineBarcode(event.target.value)}
            >
              <option value="">Select machine</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.barcode}>
                  {machine.name} · {machine.barcode}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
              disabled={loading}
            >
              Start
            </button>
          </form>
        </DrawerSection>
      ) : (
        <DrawerSection title="Put away">
          <form
            className="grid gap-3 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              place().catch(() => undefined);
            }}
          >
            <p className="text-[12px] text-gray-600">The half moon cut is done. Scan the pieces rack these pieces go back to.</p>
            {!racks.length ? (
              <p className="text-[12px] text-gray-600">
                No pieces racks are in the catalog.{' '}
                <Link className="text-purple-600 hover:text-purple-700" href="/catalog/storage-racks">
                  Add a rack
                </Link>
                . A code that already exists can still be scanned.
              </p>
            ) : null}
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="halfMoonDestination">
              Rack
            </label>
            <input
              id="halfMoonDestination"
              aria-label="Destination rack"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0"
              value={destination}
              autoComplete="off"
              onChange={(event) => setDestination(event.target.value)}
              required
            />
            <select
              aria-label="Pieces rack"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057]"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            >
              <option value="">Select rack</option>
              {racks.map((rack) => (
                <option key={rack.id} value={rack.code}>
                  {rack.name} · {rack.code}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
              disabled={loading}
            >
              Confirm
            </button>
          </form>
        </DrawerSection>
      )}
      {error ? (
        <p className="text-[12px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </FactoryDrawer>
  );
}
