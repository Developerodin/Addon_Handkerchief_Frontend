import React from 'react';
import { EmptyQueue, QueueTabs } from '../shared/QueueTabs';
import { BundleRow, CutPieceRow } from './types';

const headClass = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#495057]';
const cellClass = 'border border-gray-200 px-1.5 py-2.5 text-[12px] text-gray-900';

/**
 * Hemmed pieces waiting to be cut, pieces on the table, and closed bundles still off a rack.
 */
export function PieceTable({
  pieces,
  active,
  ready,
  onOpen,
  onPlace,
}: {
  pieces: CutPieceRow[];
  active: CutPieceRow[];
  ready: BundleRow[];
  onOpen: (piece: CutPieceRow) => void;
  onPlace: (bundle: BundleRow) => void;
}) {
  return (
    <QueueTabs
      upcomingCount={pieces.length + ready.length}
      receivedCount={active.length}
      upcoming={(
    <div className="grid gap-4">
      <div className="min-h-[300px] overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              {['Piece', 'Order', 'Roll', 'Rack'].map((label, index) => (
                <th key={label} className={`${headClass} ${index === 0 ? 'pl-[10px]' : ''}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pieces.length ? (
              pieces.map((piece) => (
                <tr key={piece.barcode} className="transition-colors hover:bg-gray-50/50">
                  <td className={`${cellClass} pl-[10px]`}>
                    <button type="button" className="font-medium text-purple-600 hover:text-purple-700" onClick={() => onOpen(piece)}>
                      {piece.barcode}
                    </button>
                  </td>
                  <td className={cellClass}>{piece.orderNumber || piece.orderId.slice(-6)}</td>
                  <td className={`${cellClass} text-gray-600`}>{piece.rollBarcode || '—'}</td>
                  <td className={`${cellClass} pr-[10px]`}>{piece.rackCode || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border border-gray-200 py-20 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                    <i className="ri-inbox-line text-xl text-gray-200" aria-hidden />
                  </div>
                  <p className="text-xs font-bold text-gray-400">DATA EMPTY</p>
                  <p className="mt-1 text-[11px] text-gray-400">No hemmed piece is waiting on a rack.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#495057]">Closed bundles</h2>
        {ready.length ? (
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                {['Bundle', 'Order', 'Qty'].map((label) => (
                  <th key={label} className={headClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ready.map((bundle) => (
                <tr key={bundle.id} className="transition-colors hover:bg-gray-50/50">
                  <td className={`${cellClass} pl-[10px]`}>
                    <button type="button" className="font-mono font-medium text-purple-600 hover:text-purple-700" onClick={() => onPlace(bundle)}>
                      {bundle.barcode}
                    </button>
                  </td>
                  <td className={cellClass}>{bundle.orderNumber || bundle.orderId.slice(-6)}</td>
                  <td className={cellClass}>{bundle.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[11px] text-gray-500">
            No closed bundle is waiting for a rack.{' '}
            <a className="font-bold text-purple-600 hover:text-purple-700" href="/catalog/storage-racks">
              Bundle racks
            </a>
          </p>
        )}
      </div>
    </div>
      )}
      received={active.length ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                {['Piece', 'Order', 'Roll', 'Table'].map((label) => (
                  <th key={label} className={headClass}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((piece) => (
                <tr key={piece.barcode} className="transition-colors hover:bg-gray-50/50">
                  <td className={`${cellClass} pl-[10px]`}>
                    <button type="button" className="font-medium text-purple-600 hover:text-purple-700" onClick={() => onOpen(piece)}>{piece.barcode}</button>
                  </td>
                  <td className={cellClass}>{piece.orderNumber || piece.orderId.slice(-6)}</td>
                  <td className={`${cellClass} text-gray-600`}>{piece.rollBarcode || '—'}</td>
                  <td className={cellClass}>{piece.machineBarcode || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyQueue text="Nothing has been received on this floor yet." />
      )}
    />
  );
}
