import React from 'react';
import { formatMetres, formatVariance, varianceClass } from './consumptionFormat';
import { ConsumptionFabric } from './consumptionTypes';

/**
 * One card per fabric. Clicking again clears the fabric.
 */
export function ConsumptionFabricCards({
  rows,
  selected,
  onSelect,
}: {
  rows: ConsumptionFabric[];
  selected: string;
  onSelect: (name: string, fabricId: string) => void;
}) {
  return (
    <section className="rounded-md border border-[#E7E5E4] bg-white p-3" aria-labelledby="consumption-fabrics">
      <h2 id="consumption-fabrics" className="text-sm font-semibold text-[#1C1917]">
        By fabric
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[#57534E]">No fabric in this selection.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4" aria-label="Fabrics">
          {rows.map((row) => {
            const pressed = selected === row.fabricName;
            return (
              <li key={`${row.fabricCatalogId}-${row.fabricName}`}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  className={`flex h-full w-full flex-col gap-1 rounded-md border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)] ${
                    pressed
                      ? 'border-[rgb(132,90,223)] bg-[rgb(132,90,223)]/10'
                      : 'border-[#E7E5E4] bg-[#FAFAF9] hover:border-[#D6D3D1]'
                  }`}
                  onClick={() => onSelect(row.fabricName, row.fabricCatalogId)}
                >
                  <span className="text-sm font-semibold text-[#1C1917]">{row.fabricName}</span>
                  <span className="text-[13px] font-medium tabular-nums text-[#57534E]">
                    Issued {formatMetres(row.issuedMeters)}
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-[#57534E]">BOM {formatMetres(row.bomMeters)}</span>
                  <span className={`text-sm font-semibold tabular-nums ${varianceClass(row.band)}`}>
                    {formatVariance(row.varianceMeters)}
                  </span>
                  {row.missingBom ? (
                    <span className="w-fit rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[11px] font-semibold text-[#92400E]">No BOM</span>
                  ) : (
                    <span className="text-[12px] font-medium text-[#78716C]">{row.orders} orders</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
