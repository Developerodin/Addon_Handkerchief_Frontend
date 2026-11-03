import React from 'react';
import { formatMetres, formatQty, formatVariance, formatWhen, movementLabel, varianceClass } from './consumptionFormat';
import { ConsumptionDetail as ConsumptionDetailData } from './consumptionTypes';

/**
 * Bill lines and rolls for the fabric, order, or day that is selected.
 */
export function ConsumptionDetail({
  detail,
  loading,
  error,
  active,
  showBack,
  onBack,
}: {
  detail: ConsumptionDetailData | null;
  loading: boolean;
  error: string;
  active: boolean;
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-3" aria-busy={loading}>
      {showBack ? (
        <button
          type="button"
          className="h-9 justify-self-start rounded-md px-1 text-sm font-semibold text-[#57534E] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)] lg:hidden"
          onClick={onBack}
        >
          Back to orders
        </button>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-[#9F1239]" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !detail ? (
        <p className="text-sm font-medium text-[#57534E]" role="status">
          Loading this selection
        </p>
      ) : null}
      {!active && !loading ? (
        <p className="rounded-md border border-[#E7E5E4] bg-white p-4 text-sm text-[#57534E]">
          Select a fabric, a day, or an order to see the bill lines and the rolls.
        </p>
      ) : null}
      {detail && active ? (
        <article className="grid gap-3" aria-labelledby="consumption-detail-title">
          <header className="rounded-md border border-[#E7E5E4] bg-white p-3">
            <h2 id="consumption-detail-title" className="text-lg font-semibold text-[#1C1917]">
              {detail.title || 'Selection'}
            </h2>
            <p className="text-[13px] text-[#57534E]">{detail.note}</p>
            <dl className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <dt className="text-[12px] font-medium text-[#78716C]">Issued</dt>
                <dd className="text-sm font-semibold tabular-nums text-[#1C1917]">{formatMetres(detail.totals.issuedMeters)}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-[#78716C]">BOM</dt>
                <dd className="text-sm font-semibold tabular-nums text-[#1C1917]">{formatMetres(detail.totals.bomMeters)}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-[#78716C]">Variance</dt>
                <dd className={`text-sm font-semibold tabular-nums ${varianceClass(detail.totals.band)}`}>
                  {formatVariance(detail.totals.varianceMeters)}
                </dd>
              </div>
            </dl>
          </header>
          {detail.articles.length === 0 ? (
            <p className="rounded-md border border-[#E7E5E4] bg-white p-3 text-sm text-[#57534E]">No bill lines in this selection.</p>
          ) : (
            detail.articles.map((article) => (
              <section
                key={`${article.orderId}-${article.lineId}-${article.articleName}`}
                className="rounded-md border border-[#E7E5E4] bg-white p-3"
                aria-label={`${article.orderNumber || 'Order'} ${article.articleName}`}
              >
                <h3 className="text-sm font-semibold text-[#1C1917]">
                  {article.orderNumber || 'Unnumbered'} · {article.articleName}
                </h3>
                <p className="text-[13px] text-[#57534E]">
                  {article.factoryCode ? `${article.factoryCode} · ` : ''}
                  {formatQty(article.pieces)} pcs
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                      <tr>
                        {['Fabric', 'm / pc', 'BOM', 'Issued', 'Returned', 'Variance'].map((label) => (
                          <th
                            key={label}
                            scope="col"
                            className={`px-1 py-1 text-[12px] font-semibold text-[#57534E] ${label === 'Fabric' ? 'text-left' : 'text-right'}`}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {article.fabrics.map((fabric) => (
                        <tr key={`${fabric.fabricCatalogId}-${fabric.fabricName}`}>
                          <td className="border-t border-[#E7E5E4] px-1 py-1.5 text-sm text-[#1C1917]">
                            {fabric.fabricName}
                            {fabric.missingBom ? (
                              <span className="ml-2 rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[11px] font-semibold text-[#92400E]">
                                No BOM
                              </span>
                            ) : null}
                          </td>
                          <td className="border-t border-[#E7E5E4] px-1 py-1.5 text-right text-sm tabular-nums text-[#57534E]">
                            {formatQty(fabric.metresPerPiece)}
                          </td>
                          <td className="border-t border-[#E7E5E4] px-1 py-1.5 text-right text-sm tabular-nums text-[#1C1917]">
                            {formatMetres(fabric.bomMeters)}
                          </td>
                          <td className="border-t border-[#E7E5E4] px-1 py-1.5 text-right text-sm tabular-nums text-[#1C1917]">
                            {formatMetres(fabric.issuedMeters)}
                          </td>
                          <td className="border-t border-[#E7E5E4] px-1 py-1.5 text-right text-sm tabular-nums text-[#57534E]">
                            {formatMetres(fabric.returnedMeters)}
                          </td>
                          <td
                            className={`border-t border-[#E7E5E4] px-1 py-1.5 text-right text-sm font-semibold tabular-nums ${varianceClass(fabric.band)}`}
                          >
                            {formatVariance(fabric.varianceMeters)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
          <section className="overflow-x-auto rounded-md border border-[#E7E5E4] bg-white" aria-label="Roll movements">
            <table className="w-full min-w-[560px] border-collapse">
              <caption className="px-3 py-2 text-left text-sm font-semibold text-[#1C1917]">Rolls</caption>
              <thead>
                <tr>
                  {['When', 'Kind', 'Barcode', 'Fabric', 'Metres', 'Kg'].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className={`px-2 py-1 text-[12px] font-semibold text-[#57534E] ${
                        label === 'Metres' || label === 'Kg' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.movements.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-[#57534E]" colSpan={6}>
                      No rolls in this selection.
                    </td>
                  </tr>
                ) : (
                  detail.movements.map((row) => (
                    <tr key={`${row.at}-${row.barcode}-${row.kind}`}>
                      <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-sm text-[#1C1917]">{formatWhen(row.at)}</td>
                      <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-sm text-[#1C1917]">{movementLabel(row.kind)}</td>
                      <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-sm text-[#1C1917]">{row.barcode || '—'}</td>
                      <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-sm text-[#1C1917]">{row.fabricName}</td>
                      <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-right text-sm tabular-nums text-[#1C1917]">
                        {formatMetres(row.meters)}
                      </td>
                      <td className="border-t border-[#E7E5E4] px-2 py-1.5 text-right text-sm tabular-nums text-[#57534E]">
                        {formatQty(row.kg)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {detail.truncated ? (
              <p className="px-3 py-2 text-[13px] text-[#57534E]">Showing the latest rolls. Totals above include every roll in the selection.</p>
            ) : null}
          </section>
        </article>
      ) : null}
    </div>
  );
}
