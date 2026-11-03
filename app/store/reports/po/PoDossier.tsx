import React from 'react';
import { PoDossier as PoDossierData } from './poAnalyticsTypes';
import { formatDay } from './poFormat';
import { PoDossierGoods } from './PoDossierGoods';
import { PoDossierStore } from './PoDossierStore';
import { PoTimeline } from './PoTimeline';

/**
 * End-to-end record of one purchase order.
 */
export function PoDossier({
  dossier,
  loading,
  error,
  onBack,
}: {
  dossier: PoDossierData | null;
  loading: boolean;
  error: string;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-3" aria-busy={loading}>
      <button
        type="button"
        className="h-9 justify-self-start rounded-md px-1 text-sm font-semibold text-[#57534E] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)] lg:hidden"
        onClick={onBack}
      >
        Back to orders
      </button>
      {error ? (
        <p className="text-sm font-medium text-[#9F1239]" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !dossier ? (
        <p className="text-sm font-medium text-[#57534E]" role="status">
          Loading this order
        </p>
      ) : null}
      {!dossier && !loading && !error ? (
        <p className="rounded-md border border-[#E7E5E4] bg-white p-4 text-sm text-[#57534E]">
          Select an order to see what was ordered, received, and where it was stored.
        </p>
      ) : null}
      {dossier ? (
        <article className="grid gap-3" aria-labelledby="po-dossier-title">
          <header className="rounded-md border border-[#E7E5E4] bg-white p-3">
            <h2 id="po-dossier-title" className="text-lg font-semibold text-[#1C1917]">
              {dossier.header.number}
            </h2>
            <p className="text-sm font-medium text-[#1C1917]">{dossier.header.supplierName}</p>
            <p className="text-[13px] text-[#57534E]">
              {dossier.header.status} · Ordered {formatDay(dossier.header.purchaseDate)} · Expected {formatDay(dossier.header.estimatedDelivery)}
            </p>
            {dossier.header.supplierAddress ? <p className="mt-1 text-[13px] text-[#57534E]">{dossier.header.supplierAddress}</p> : null}
            <p className="text-[13px] text-[#57534E]">
              Credit {dossier.header.creditDays} days{dossier.header.supplierTerms ? ` · ${dossier.header.supplierTerms}` : ''}
            </p>
            {dossier.header.notes ? <p className="mt-1 text-sm text-[#1C1917]">{dossier.header.notes}</p> : null}
          </header>
          <PoTimeline dossier={dossier} />
          <PoDossierGoods dossier={dossier} />
          <PoDossierStore dossier={dossier} />
        </article>
      ) : null}
    </div>
  );
}
