import React from 'react';
import { PO_STATUSES } from './poAnalyticsTypes';

const field = 'grid gap-1 text-[13px] font-medium text-[#57534E]';
const control =
  'h-9 rounded-md border border-[#D6D3D1] bg-white px-2 text-sm font-medium text-[#1C1917] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]';

export interface PoFilterValues {
  from: string;
  to: string;
  allDates: boolean;
  dateField: 'purchase' | 'received';
  supplier: string;
  status: string;
  query: string;
  includeDrafts: boolean;
  suppliers: string[];
}

/**
 * Date, supplier, status, and search controls for the purchase-order ledger.
 */
export function PoFilters({
  values,
  onChange,
  onReset,
}: {
  values: PoFilterValues;
  onChange: (patch: Partial<PoFilterValues>) => void;
  onReset: () => void;
}) {
  const names = values.supplier && !values.suppliers.includes(values.supplier)
    ? [values.supplier, ...values.suppliers]
    : values.suppliers;

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-md border border-[#E7E5E4] bg-white p-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className={field}>
        From
        <input
          type="date"
          className={control}
          value={values.from}
          onChange={(event) => onChange({ from: event.target.value, allDates: false })}
        />
      </label>
      <label className={field}>
        To
        <input
          type="date"
          className={control}
          value={values.to}
          onChange={(event) => onChange({ to: event.target.value, allDates: false })}
        />
      </label>
      <label className={field}>
        Date basis
        <select
          className={control}
          value={values.dateField}
          onChange={(event) => onChange({ dateField: event.target.value === 'received' ? 'received' : 'purchase' })}
        >
          <option value="purchase">Order date</option>
          <option value="received">Received date</option>
        </select>
      </label>
      <label className={field}>
        Supplier
        <select className={`${control} max-w-[14rem]`} value={values.supplier} onChange={(event) => onChange({ supplier: event.target.value })}>
          <option value="">All suppliers</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        Status
        <select className={control} value={values.status} onChange={(event) => onChange({ status: event.target.value })}>
          <option value="">All statuses</option>
          {PO_STATUSES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        Search
        <input
          className={`${control} w-52`}
          value={values.query}
          placeholder="PO, supplier, or fabric"
          aria-label="Search purchase orders"
          onChange={(event) => onChange({ query: event.target.value })}
        />
      </label>
      <label className="flex h-9 items-center gap-2 text-sm font-medium text-[#1C1917]">
        <input
          type="checkbox"
          checked={values.includeDrafts}
          onChange={(event) => onChange({ includeDrafts: event.target.checked })}
        />
        Include drafts
      </label>
      <button
        type="button"
        className="h-9 rounded-md px-3 text-sm font-semibold text-[#57534E] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]"
        onClick={onReset}
      >
        Reset
      </button>
    </form>
  );
}
