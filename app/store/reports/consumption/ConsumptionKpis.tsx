import React from 'react';
import { formatMetres, formatQty, formatVariance, varianceClass } from './consumptionFormat';
import { ConsumptionBand, ConsumptionTotals } from './consumptionTypes';

/**
 * One KPI button. A blank id clears the variance band.
 */
interface KpiButton {
  id: '' | ConsumptionBand;
  label: string;
  value: string;
  hint: string;
  tone?: string;
}

/**
 * Clickable totals. Band buttons filter the order list. The others clear that filter.
 */
export function ConsumptionKpis({
  totals,
  loading,
  band,
  narrowed,
  onBand,
}: {
  totals: ConsumptionTotals | null;
  loading: boolean;
  band: '' | ConsumptionBand;
  narrowed: boolean;
  onBand: (band: '' | ConsumptionBand) => void;
}) {
  const metres = (value: number | undefined) => (totals ? formatMetres(value || 0) : '—');
  const count = (value: number | undefined) => (totals ? formatQty(value || 0) : '—');
  const buttons: KpiButton[] = [
    { id: '', label: 'Issued', value: metres(totals?.issuedMeters), hint: narrowed ? 'In this selection' : 'All issue dates' },
    { id: '', label: 'BOM', value: metres(totals?.bomMeters), hint: 'Full order requirement' },
    {
      id: '',
      label: 'Variance',
      value: totals ? formatVariance(totals.varianceMeters) : '—',
      hint: 'Issued minus BOM',
      tone: totals ? varianceClass(totals.band) : '',
    },
    { id: '', label: 'Consumed', value: metres(totals?.consumedMeters), hint: 'Issued minus returns' },
    { id: '', label: 'Returned', value: metres(totals?.returnedMeters), hint: 'Back on the rack' },
    { id: '', label: 'Rolls', value: count(totals?.issuedRolls), hint: 'Rolls issued' },
    { id: 'over', label: 'Over', value: count(totals?.overCount), hint: 'Above the BOM', tone: 'text-[#9F1239]' },
    { id: 'under', label: 'Short', value: count(totals?.underCount), hint: 'Still under the BOM', tone: 'text-[#1D4ED8]' },
    { id: 'match', label: 'On BOM', value: count(totals?.matchCount), hint: 'Within 0.001 m', tone: 'text-[#166534]' },
    { id: '', label: 'Orders', value: count(totals?.orders), hint: `${count(totals?.fabrics)} fabrics` },
  ];

  return (
    <div aria-busy={loading}>
      {loading && !totals ? (
        <p className="text-sm font-medium text-[#57534E]" role="status">
          Loading consumption
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Consumption totals">
        {buttons.map((item) => {
          const pressed = item.id ? band === item.id : false;
          return (
            <button
              key={item.label}
              type="button"
              aria-pressed={item.id ? pressed : undefined}
              className={`rounded-md border bg-white px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)] ${
                pressed ? 'border-[rgb(132,90,223)] ring-1 ring-[rgb(132,90,223)]' : 'border-[#E7E5E4] hover:border-[#D6D3D1]'
              }`}
              onClick={() => onBand(item.id && band === item.id ? '' : item.id)}
            >
              <span className="block text-[13px] font-medium text-[#57534E]">{item.label}</span>
              <span className={`block text-xl font-semibold tabular-nums ${item.tone || 'text-[#1C1917]'}`}>{item.value}</span>
              <span className="block text-[12px] font-medium text-[#78716C]">{item.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
