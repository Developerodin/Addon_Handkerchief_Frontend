import React from 'react';
import { CutPieceRow } from './types';

/**
 * Printable piece barcodes for one vertical cut.
 */
export function PieceLabel({
  pieces,
  orderNumber,
  rollBarcode,
}: {
  pieces: CutPieceRow[];
  orderNumber: string;
  rollBarcode: string;
}) {
  if (!pieces.length) return null;
  return (
    <section id="piece-labels" aria-label="Piece labels" className="grid gap-2">
      {pieces.map((piece) => (
        <article key={piece.barcode} className="rounded border border-gray-200 bg-white p-[10px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Piece</p>
          <p className="font-mono text-sm font-bold text-gray-900">{piece.barcode}</p>
          <p className="mt-1 text-[12px] text-gray-600">
            {orderNumber || 'Order'} · roll {rollBarcode}
          </p>
          <p className="text-[11px] font-medium text-gray-500">{piece.status === 'on-rack' ? 'On rack' : 'Cut'}</p>
        </article>
      ))}
    </section>
  );
}
