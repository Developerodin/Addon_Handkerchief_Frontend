import React from 'react';

interface PurchaseOrderFormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

/**
 * Label, control, and inline error for one purchase-order field.
 */
export function PurchaseOrderFormField({ label, required, error, children }: PurchaseOrderFormFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}
