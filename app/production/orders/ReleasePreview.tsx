'use client';

import React from 'react';
import { FabricNeed } from '@/shared/services/factoryApi';

export interface ReleasePreviewLine {
  id: string;
  articleName?: string;
  factoryCode?: string;
  revisionId: string;
  quantity: number;
  snapshot: {
    piecesPerCut?: number;
    route?: string;
    currency?: string;
    calculationPolicy?: string;
    fabricBom?: { fabricName?: string; metresPerPiece?: number }[];
    threadLines?: { materialRole: string; quantity: number }[];
  };
  fabric: FabricNeed[];
}

interface ReleasePreviewProps {
  orderNumber?: string;
  lines: ReleasePreviewLine[];
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Shows the frozen revision and whether basement rolls exist before release.
 */
export function ReleasePreview({ orderNumber, lines, loading, onConfirm, onClose }: ReleasePreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm release"
        className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-md border-2 border-gray-300 bg-white p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-gray-800">Release {orderNumber}</h2>
        <p className="mt-1 text-xs text-gray-500">This pins the revision. A later catalog publish does not move the order.</p>
        <div className="mt-3 space-y-3">
          {lines.map((line) => (
            <section key={line.id} className="rounded border border-gray-200 p-2">
              <p className="text-sm font-semibold text-gray-800">
                {line.factoryCode || line.articleName} · {line.quantity} pcs · {line.snapshot.piecesPerCut || 3} per cut
              </p>
              <p className="text-xs text-gray-500">
                {line.snapshot.route} · {line.snapshot.currency} · {line.snapshot.calculationPolicy}
              </p>
              <ul className="mt-1 text-xs text-gray-700">
                {(line.fabric || []).map((fabric) => (
                  <li key={fabric.bomLineId || fabric.fabricName}>
                    {fabric.fabricName || 'Fabric'}: {fabric.inBasement ? `${fabric.onHandRolls} basement rolls` : 'no basement rolls'}
                  </li>
                ))}
                {!line.fabric?.length ? <li>No fabric on this revision</li> : null}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-xs font-bold" onClick={onClose}>
            Back
          </button>
          <button
            type="button"
            className="rounded bg-purple-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Releasing…' : 'Confirm release'}
          </button>
        </div>
      </div>
    </div>
  );
}
