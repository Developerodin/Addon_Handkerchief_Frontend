'use client';

import React from 'react';

export interface OrderBomLine {
  key: string;
  articleCode: string;
  quantity: string;
  bom: { fabricName?: string; quantity?: number }[];
}

interface FabricTotal {
  name: string;
  metres: number;
}

/**
 * Metres for one fabric on one article. Quantity on the BOM is metres per piece.
 */
function lineMetres(perPiece: number, quantity: string): number {
  return Math.round((Number(perPiece) || 0) * (Number(quantity) || 0) * 1000) / 1000;
}

/**
 * Sums the same fabric across every article on the order.
 */
function totalBom(lines: OrderBomLine[]): FabricTotal[] {
  const totals = new Map<string, number>();
  lines.forEach((line) => {
    const qty = Number(line.quantity) || 0;
    if (qty <= 0) return;
    line.bom.forEach((row) => {
      const name = row.fabricName || 'Fabric';
      totals.set(name, (totals.get(name) || 0) + lineMetres(Number(row.quantity) || 0, line.quantity));
    });
  });
  return [...totals.entries()].map(([name, metres]) => ({ name, metres: Math.round(metres * 1000) / 1000 }));
}

/**
 * Per-article fabric BOM and the order total. Yarn grams in the knitting app are metres here.
 */
export function OrderBomPanel({ lines }: { lines: OrderBomLine[] }) {
  const visible = lines.filter((line) => line.bom.length > 0 && Number(line.quantity) > 0);
  const totals = totalBom(lines);
  if (!visible.length && !totals.length) return null;

  return (
    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
      {visible.length ? (
        <section aria-label="Article BOM">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Article BOM</h3>
          <div className="space-y-2">
            {visible.map((line) => (
              <details key={line.key} className="group rounded-lg border border-gray-200 bg-gray-50">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-gray-100">
                  <span className="text-sm font-semibold text-gray-700">
                    Article: {line.articleCode || 'N/A'} (Qty: {line.quantity})
                  </span>
                  <i className="ri-arrow-down-s-line shrink-0 text-base text-gray-600 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="border-t border-gray-200 px-3 pb-3">
                  <table className="mt-2 min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Fabric</th>
                        <th className="px-2 py-1 text-right">Per piece (m)</th>
                        <th className="px-2 py-1 text-right">Total required (m)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {line.bom.map((row, index) => (
                        <tr key={`${line.key}-${index}`} className="border-b border-gray-100">
                          <td className="px-2 py-1">{row.fabricName || 'Fabric'}</td>
                          <td className="px-2 py-1 text-right">{(Number(row.quantity) || 0).toFixed(3)}</td>
                          <td className="px-2 py-1 text-right">{lineMetres(Number(row.quantity) || 0, line.quantity).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {totals.length ? (
        <section aria-label="Total BOM requirements">
          <details className="group rounded-lg border border-gray-200 bg-gray-50">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-gray-100">
              <h3 className="m-0 text-sm font-semibold text-gray-900">Total BOM requirements</h3>
              <i className="ri-arrow-down-s-line shrink-0 text-base text-gray-600 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-gray-200 px-3 pb-3">
              <table className="mt-2 min-w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-2 text-left">Fabric</th>
                    <th className="px-2 py-2 text-right">Total required (m)</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {totals.map((row) => (
                    <tr key={row.name} className="border-b border-gray-100">
                      <td className="px-2 py-2 font-medium">{row.name}</td>
                      <td className="px-2 py-2 text-right">{row.metres.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}
