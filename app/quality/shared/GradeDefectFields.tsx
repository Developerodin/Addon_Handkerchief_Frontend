'use client';

import React from 'react';
import { fieldClass, labelClass } from './InspectPassFields';

export const FINAL_QC_GRADES = ['long', 'hemming', 'sporting', 'diving', 'rejection'] as const;

export function GradeDefectFields({
  grades,
  onChange,
  arrivalQty,
}: {
  grades: Record<string, string>;
  onChange: (grades: Record<string, string>) => void;
  arrivalQty: number;
}) {
  const defectSum = FINAL_QC_GRADES.reduce((sum, grade) => sum + (Number(grades[grade]) || 0), 0);
  const goodAfter = Math.max(0, arrivalQty - defectSum);
  const ok = defectSum <= arrivalQty;

  return (
    <>
      <p className="text-[11px] text-gray-600">Enter defect qty by grade. Good after inspect is computed automatically.</p>
      {FINAL_QC_GRADES.map((grade) => (
        <label key={grade}>
          <span className={labelClass}>{grade} (defect qty)</span>
          <input
            className={fieldClass}
            type="number"
            min={0}
            inputMode="numeric"
            value={grades[grade] ?? '0'}
            onChange={(e) => onChange({ ...grades, [grade]: e.target.value })}
          />
        </label>
      ))}
      <label>
        <span className={labelClass}>Good after inspection</span>
        <input className={`${fieldClass} cursor-not-allowed bg-gray-100 text-gray-700`} type="number" readOnly tabIndex={-1} value={goodAfter} />
      </label>
      <p className={`text-[11px] font-medium ${ok ? 'text-green-700' : 'text-red-600'}`}>
        Defects: {defectSum} / {arrivalQty} {ok ? '✓' : ''}
      </p>
    </>
  );
}

export function gradeDefectSum(grades: Record<string, string>) {
  return FINAL_QC_GRADES.reduce((sum, grade) => sum + (Number(grades[grade]) || 0), 0);
}