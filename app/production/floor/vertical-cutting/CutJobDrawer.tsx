'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FactoryDrawer, DrawerSection } from '@/shared/components/factory/FactoryDrawer';
import { factoryRequest } from '@/shared/services/factoryApi';
import { Container, listContainers, listMachines, listStorageRacks, Machine, StorageRack } from '@/shared/services/phase3CatalogService';
import { PieceLabel } from './PieceLabel';
import { ActiveCut, CutPieceRow, UpcomingRoll } from './types';

type Job = UpcomingRoll | ActiveCut;

/**
 * True when this job already has piece barcodes.
 */
const isActive = (job: Job): job is ActiveCut => 'pieces' in job;

/**
 * Machine, confirm cut, piece labels, and rack put-away for one roll.
 */
export function CutJobDrawer({
  job,
  onClose,
  onChanged,
}: {
  job: Job | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [machineBarcode, setMachineBarcode] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [pieces, setPieces] = useState<CutPieceRow[]>([]);
  const [containerBarcode, setContainerBarcode] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [pieceScan, setPieceScan] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!job) return;
    setError('');
    setPieceScan('');
    setPieces(isActive(job) ? job.pieces : []);
    setMachineBarcode(isActive(job) ? job.machineBarcode : '');
    Promise.all([
      listMachines({ page: 1, limit: 200, status: 'active' }),
      listContainers({ page: 1, limit: 200, status: 'active' }),
      listStorageRacks({ page: 1, limit: 200, status: 'active' }),
    ])
      .then(([machinePage, containerPage, rackPage]) => {
        setMachines((machinePage.results || []).filter((row) => row.barcode));
        setContainers((containerPage.results || []).filter((row) => row.type === 'pieces'));
        setRacks((rackPage.results || []).filter((row) => row.stockType === 'pieces'));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load machines'));
  }, [job]);

  if (!job) return null;
  const waiting = pieces.filter((piece) => piece.status === 'cut');
  const mastersMissing = pieces.length > 0 && containers.length === 0 && racks.length === 0;

  /**
   * Cuts the roll into the planned piece count.
   */
  const confirmCut = async () => {
    setLoading(true);
    setError('');
    try {
      const created = await factoryRequest<CutPieceRow[]>('/production/cuts', {
        method: 'POST',
        body: JSON.stringify({
          orderId: job.orderId,
          rollBarcode: job.rollBarcode,
          machineBarcode: machineBarcode.trim(),
        }),
      });
      setPieces(created.map((piece) => ({ barcode: piece.barcode, status: 'cut' })));
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cut failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Puts the given piece barcodes into the scanned container and rack.
   */
  const place = async (barcodes: string[]) => {
    if (!containerBarcode.trim()) {
      setError('Container barcode is required');
      return;
    }
    if (!rackCode.trim()) {
      setError('Rack is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const placed = await factoryRequest<CutPieceRow[]>('/production/cuts/place', {
        method: 'POST',
        body: JSON.stringify({
          pieceBarcodes: barcodes,
          containerBarcode: containerBarcode.trim(),
          rackCode: rackCode.trim(),
        }),
      });
      const placedCodes = new Set(placed.map((piece) => piece.barcode));
      const next = pieces.map((piece) => (placedCodes.has(piece.barcode) ? { ...piece, status: 'on-rack' as const } : piece));
      setPieces(next);
      setPieceScan('');
      await onChanged();
      if (next.every((piece) => piece.status === 'on-rack')) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place pieces');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Places the scanned piece from this cut.
   */
  const placeScanned = () => {
    const code = pieceScan.trim();
    const match = pieces.find((piece) => piece.barcode === code);
    if (!match) {
      setError('That piece is not from this cut');
      return;
    }
    if (match.status === 'on-rack') {
      setError('This piece is already on a rack');
      return;
    }
    place([code]).catch(() => undefined);
  };

  return (
    <FactoryDrawer
      open
      title="Vertical cutting"
      subtitle={`${job.orderNumber || job.orderId.slice(-6)} · ${job.rollBarcode}`}
      onClose={onClose}
    >
      <DrawerSection title="Roll">
        <dl className="grid grid-cols-2 gap-2 p-3 text-[12px]">
          {[
            ['Fabric', job.fabricName || '—'],
            ['Metres', job.qtyMeters || '—'],
            ['Pieces per cut', job.piecesPerCut],
            ['Order', job.orderNumber || job.orderId.slice(-6)],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-[10px] font-bold uppercase text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </DrawerSection>
      {!pieces.length ? (
        <DrawerSection title="Start">
          <form
            className="grid gap-3 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              confirmCut().catch(() => undefined);
            }}
          >
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="machineBarcode">
              Machine barcode
            </label>
            <input
              id="machineBarcode"
              aria-label="Machine barcode"
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] placeholder:text-gray-400 focus:border-purple-300 focus:ring-0"
              value={machineBarcode}
              autoComplete="off"
              placeholder="Scan machine"
              onChange={(event) => setMachineBarcode(event.target.value)}
              required
            />
            <label className="text-[11px] font-bold text-[#495057]" htmlFor="machineSelect">
              Machine
            </label>
            <select
              id="machineSelect"
              aria-label="Machine"
              className="w-full cursor-pointer appearance-none rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-gray-300 focus:ring-0"
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
              className="flex items-center justify-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
              disabled={loading}
            >
              Confirm cut
            </button>
          </form>
        </DrawerSection>
      ) : (
        <>
          <DrawerSection title="Piece labels">
            <div className="grid gap-3 p-3">
              <PieceLabel pieces={pieces} orderNumber={job.orderNumber} rollBarcode={job.rollBarcode} />
              <button
                type="button"
                className="flex w-fit items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] shadow-sm hover:bg-gray-50"
                onClick={() => window.print()}
              >
                <i className="ri-printer-line text-xs" aria-hidden /> Print labels
              </button>
            </div>
          </DrawerSection>
          {waiting.length ? (
            <DrawerSection title="Put away">
              <form
                className="grid gap-3 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  placeScanned();
                }}
              >
                {mastersMissing ? (
                  <p className="text-[12px] text-gray-600">
                    No pieces racks or pieces containers are in the catalog.{' '}
                    <Link className="text-purple-600 hover:text-purple-700" href="/catalog/storage-racks">
                      Add a rack
                    </Link>{' '}
                    or{' '}
                    <Link className="text-purple-600 hover:text-purple-700" href="/catalog/containers">
                      add a container
                    </Link>
                    . A code that already exists can still be scanned.
                  </p>
                ) : null}
                <label className="text-[11px] font-bold text-[#495057]" htmlFor="containerBarcode">
                  Container
                </label>
                <input
                  id="containerBarcode"
                  aria-label="Container barcode"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0"
                  value={containerBarcode}
                  autoComplete="off"
                  onChange={(event) => setContainerBarcode(event.target.value)}
                  required
                />
                <select
                  aria-label="Pieces container"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057]"
                  value={containerBarcode}
                  onChange={(event) => setContainerBarcode(event.target.value)}
                >
                  <option value="">Select container</option>
                  {containers.map((container) => (
                    <option key={container.id} value={container.barcode || container.code}>
                      {container.name} · {container.barcode || container.code}
                    </option>
                  ))}
                </select>
                <label className="text-[11px] font-bold text-[#495057]" htmlFor="rackCode">
                  Rack
                </label>
                <input
                  id="rackCode"
                  aria-label="Rack barcode"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0"
                  value={rackCode}
                  autoComplete="off"
                  onChange={(event) => setRackCode(event.target.value)}
                  required
                />
                <select
                  aria-label="Pieces rack"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057]"
                  value={rackCode}
                  onChange={(event) => setRackCode(event.target.value)}
                >
                  <option value="">Select rack</option>
                  {racks.map((rack) => (
                    <option key={rack.id} value={rack.code}>
                      {rack.name} · {rack.code}
                    </option>
                  ))}
                </select>
                <label className="text-[11px] font-bold text-[#495057]" htmlFor="pieceScan">
                  Piece barcode
                </label>
                <input
                  id="pieceScan"
                  aria-label="Piece barcode"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#495057] focus:border-purple-300 focus:ring-0"
                  value={pieceScan}
                  autoComplete="off"
                  placeholder="Scan one piece, or place all"
                  onChange={(event) => setPieceScan(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50 disabled:opacity-60"
                    disabled={loading}
                  >
                    Place scanned
                  </button>
                  <button
                    type="button"
                    className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
                    disabled={loading}
                    onClick={() => place(waiting.map((piece) => piece.barcode)).catch(() => undefined)}
                  >
                    Place all
                  </button>
                </div>
              </form>
            </DrawerSection>
          ) : null}
        </>
      )}
      {error ? (
        <p className="text-[12px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </FactoryDrawer>
  );
}
