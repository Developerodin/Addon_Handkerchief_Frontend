import React from 'react';

const field = 'grid gap-1 text-[13px] font-medium text-[#57534E]';
const control =
  'h-9 rounded-md border border-[#D6D3D1] bg-white px-2 text-sm font-medium text-[#1C1917] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)]';

export interface ConsumptionFilterValues {
  from: string;
  to: string;
  query: string;
}

/**
 * Date range, search, and reset for the consumption report.
 */
export function ConsumptionFilters({
  values,
  onChange,
  onReset,
}: {
  values: ConsumptionFilterValues;
  onChange: (patch: Partial<ConsumptionFilterValues>) => void;
  onReset: () => void;
}) {
  const allDates = !values.from && !values.to;

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-md border border-[#E7E5E4] bg-white p-3"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Consumption filters"
    >
      <label className={field}>
        From
        <input
          type="date"
          className={control}
          value={values.from}
          onChange={(event) => onChange({ from: event.target.value })}
        />
      </label>
      <label className={field}>
        To
        <input type="date" className={control} value={values.to} onChange={(event) => onChange({ to: event.target.value })} />
      </label>
      <button
        type="button"
        aria-pressed={allDates}
        className={`h-9 rounded-md border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(132,90,223)] ${
          allDates
            ? 'border-[rgb(132,90,223)] bg-[rgb(132,90,223)]/10 text-[#1C1917]'
            : 'border-[#D6D3D1] bg-white text-[#57534E]'
        }`}
        onClick={() => onChange({ from: '', to: '' })}
      >
        All dates
      </button>
      <label className={field}>
        Search
        <input
          className={`${control} w-56`}
          value={values.query}
          placeholder="Order, fabric, or buyer"
          aria-label="Search consumption"
          onChange={(event) => onChange({ query: event.target.value })}
        />
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
