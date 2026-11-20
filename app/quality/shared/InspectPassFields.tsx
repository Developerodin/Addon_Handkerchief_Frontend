'use client';

import React from 'react';

const fieldClass =
  'box-border h-9 w-full rounded border border-gray-200 bg-white px-3 text-[12px] font-medium text-gray-900 outline-none focus:border-purple-400';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#495057]';

export function InspectPassFields({
  baseGoodAfterInspect,
  goodAdded,
  passQty,
  passQtyTouched,
  displayPassQty,
  onGoodAddedChange,
  onPassQtyChange,
  nextFloorHint,
}: {
  baseGoodAfterInspect: number;
  goodAdded: string;
  passQty: string;
  passQtyTouched: boolean;
  displayPassQty: string;
  onGoodAddedChange: (value: string) => void;
  onPassQtyChange: (value: string) => void;
  nextFloorHint?: string;
}) {
  const addedNum = Math.max(0, Number(goodAdded) || 0);
  const suggestedPass = baseGoodAfterInspect + addedNum;
  const passNum = Number(displayPassQty);
  const passOk =
    Number.isFinite(passNum) &&
    passNum >= 0 &&
    passNum <= suggestedPass &&
    (suggestedPass === 0 ? passNum === 0 : passNum >= 1);

  return (
  <>
      <p className="text-[11px] text-gray-600">
        <strong>Remaining good</strong> is from inspection; add offline top-up in <strong>good added</strong>;{' '}
        <strong>pass qty</strong> defaults to remaining + added.
        {nextFloorHint ? ` Next: ${nextFloorHint}.` : null}
      </p>
      <label>
        <span className={labelClass}>Good remaining in bundle (after inspect)</span>
        <input
          className={`${fieldClass} cursor-not-allowed bg-gray-100 text-gray-700`}
          type="number"
          min={0}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          value={baseGoodAfterInspect}
        />
      </label>
      <label>
        <span className={labelClass}>Good added by QC</span>
        <input
          className={fieldClass}
          type="number"
          min={0}
          value={goodAdded}
          onChange={(e) => onGoodAddedChange(e.target.value)}
        />
      </label>
      <label>
        <span className={labelClass}>Pass qty (to next floor)</span>
        <input
          className={fieldClass}
          type="number"
          min={0}
          value={displayPassQty}
          onChange={(e) => onPassQtyChange(e.target.value)}
        />
      </label>
      <p className="text-[11px] text-gray-500">
        Default pass = <strong>{baseGoodAfterInspect}</strong> remaining + <strong>{addedNum}</strong> added = <strong>{suggestedPass}</strong>
        {passQtyTouched && passQty !== '' && Number(passQty) !== suggestedPass ? ' · You edited pass qty.' : null}
      </p>
      <p className={`text-[11px] font-medium ${passOk ? 'text-green-700' : 'text-red-600'}`}>
        Passing <strong>{displayPassQty || '—'}</strong> pcs {passOk ? '✓' : ''}
      </p>
    </>
  );
}

export function passStepOk(baseGoodAfterInspect: number, goodAdded: string, displayPassQty: string) {
  const addedNum = Math.max(0, Number(goodAdded) || 0);
  const suggestedPass = baseGoodAfterInspect + addedNum;
  const passNum = Number(displayPassQty);
  return (
    Number.isFinite(passNum) &&
    passNum >= 0 &&
    passNum <= suggestedPass &&
    (suggestedPass === 0 ? passNum === 0 : passNum >= 1)
  );
}

export { fieldClass, labelClass };