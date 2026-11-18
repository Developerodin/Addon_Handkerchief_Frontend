import React from 'react';
import Link from 'next/link';

export interface CompletedRow {
  id?: string;
  barcode?: string;
  rollBarcode?: string;
  orderNumber?: string;
  orderId?: string;
  qty?: number;
  goodQty?: number;
  defectQty?: number;
  defectGrades?: { code: string; qty: number; rackCode?: string }[];
  m2Qty?: number;
  m4Qty?: number;
  finalGood?: number;
  transferredTo?: string;
  completedAt?: string;
  readyForHorizontalHem?: boolean;
  blockers?: string[];
  movedOn?: boolean;
  transferQty?: number;
  /** Qty frozen when the floor log was written (backend snapshot). */
  qtyAtEvent?: number;
}

const headClass = 'border border-gray-200 px-1.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#495057]';
const cellClass = 'border border-gray-200 px-1.5 py-2.5 text-[12px] text-gray-900';

function formatQty(row: CompletedRow, transferableOnly: boolean) {
  if (transferableOnly) {
    if (typeof row.transferQty === 'number' && Number.isFinite(row.transferQty) && row.transferQty > 0) {
      return row.transferQty;
    }
    if (typeof row.qtyAtEvent === 'number' && Number.isFinite(row.qtyAtEvent) && row.qtyAtEvent > 0) {
      return row.qtyAtEvent;
    }
    return '—';
  }
  const n = row.qty ?? row.finalGood;
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  return '—';
}

const FINAL_QC_GRADE_SHORT: Record<string, string> = {
  long: 'L',
  hemming: 'H',
  sporting: 'S',
  diving: 'D',
  rejection: 'R',
};
const FINAL_QC_GRADE_ORDER = ['long', 'hemming', 'sporting', 'diving', 'rejection'];

function formatDefectGrades(grades?: CompletedRow['defectGrades']) {
  if (!grades?.length) return '—';
  const byCode = new Map(grades.map((g) => [g.code, g.qty]));
  const parts = FINAL_QC_GRADE_ORDER.filter((code) => (byCode.get(code) || 0) > 0).map(
    (code) => `${FINAL_QC_GRADE_SHORT[code] || code[0]?.toUpperCase()} ${byCode.get(code)}`
  );
  return parts.length ? parts.join(' · ') : '—';
}

function formatWhen(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Work finished on this floor and sent to the next step (from order log).
 */
export function CompletedQueueTable({
  rows,
  codeLabel = 'Item',
  getCode,
  emptyText = 'Nothing completed on this floor in the last two weeks.',
  showM4 = false,
  showM2 = false,
  showGood = false,
  showDefect = false,
  showDefectGrades = false,
  qtyIsTransferable = false,
  qtyColumnLabel,
  showNextStep = false,
  hemHref = '/production/floor/horizontal-hem',
}: {
  rows: CompletedRow[];
  codeLabel?: string;
  getCode?: (row: CompletedRow) => string;
  emptyText?: string;
  showM4?: boolean;
  showM2?: boolean;
  showGood?: boolean;
  showDefect?: boolean;
  showDefectGrades?: boolean;
  qtyIsTransferable?: boolean;
  qtyColumnLabel?: string;
  showNextStep?: boolean;
  hemHref?: string;
}) {
  const code = getCode || ((row) => row.barcode || row.rollBarcode || '—');
  /** Post–Final QC floors: qty column = pieces sent on (transferQty), not labeled "Good". */
  const qtyLabel = qtyColumnLabel || 'Qty';
  const extraCols =
    (showM2 ? 1 : 0) +
    (showM4 ? 1 : 0) +
    (showGood ? 1 : 0) +
    (showDefect ? 1 : 0) +
    (showDefectGrades ? 1 : 0) +
    (showNextStep ? 1 : 0);
  const colSpan = 5 + extraCols;
  return (
    <div className="min-h-[240px] overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50/30">
            {[
              'Order',
              codeLabel,
              qtyLabel,
              ...(showGood ? ['Good'] : []),
              ...(showDefect ? ['Defect'] : []),
              ...(showDefectGrades ? ['Defects'] : []),
              ...(showM2 ? ['M2'] : []),
              ...(showM4 ? ['M4'] : []),
              'Sent to',
              'When',
              ...(showNextStep ? ['Next'] : []),
            ].map((label) => (
              <th key={label} className={headClass}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={`${code(row)}-${row.completedAt || ''}`}>
              <td className={cellClass}>{row.orderNumber || (row.orderId ? row.orderId.slice(-6) : '—')}</td>
              <td className={`${cellClass} font-mono text-purple-700`}>{code(row)}</td>
              <td className={cellClass}>{formatQty(row, qtyIsTransferable)}</td>
              {showGood ? (
                <td className={cellClass}>{typeof row.goodQty === 'number' ? row.goodQty : '—'}</td>
              ) : null}
              {showDefect ? (
                <td className={cellClass}>{typeof row.defectQty === 'number' ? row.defectQty : '—'}</td>
              ) : null}
              {showDefectGrades ? (
                <td className={`${cellClass} font-mono text-[11px] text-gray-800`} title="L long · H hemming · S sporting · D diving · R rejection">
                  {formatDefectGrades(row.defectGrades)}
                </td>
              ) : null}
              {showM2 ? (
                <td className={cellClass}>{typeof row.m2Qty === 'number' ? row.m2Qty : '—'}</td>
              ) : null}
              {showM4 ? (
                <td className={cellClass}>{typeof row.m4Qty === 'number' ? row.m4Qty : '—'}</td>
              ) : null}
              <td className={cellClass}>{row.transferredTo || '—'}</td>
              <td className={cellClass}>{formatWhen(row.completedAt)}</td>
              {showNextStep ? (
                <td className={`${cellClass} text-[11px]`}>
                  {row.movedOn ? (
                    <span className="text-gray-600">Left this step</span>
                  ) : row.readyForHorizontalHem ? (
                    <Link href={hemHref} className="font-semibold text-emerald-700 underline">
                      Horizontal hemming
                    </Link>
                  ) : (
                    <span className="text-amber-800">{(row.blockers || ['Fix single piece steps']).join(' · ')}</span>
                  )}
                </td>
              ) : null}
            </tr>
          )) : (
            <tr>
              <td colSpan={colSpan} className="border border-gray-200 py-16 text-center text-[11px] text-gray-400">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}