import React from 'react';

interface PurchaseOrderFormActionsProps {
  saving: boolean;
  allowRaise: boolean;
  showCommercials: boolean;
  onCancel: () => void;
  onSave: () => void;
  onRaise: () => void;
}

/**
 * Cancel, save, and submit actions under the purchase order form.
 */
export function PurchaseOrderFormActions({
  saving,
  allowRaise,
  showCommercials,
  onCancel,
  onSave,
  onRaise,
}: PurchaseOrderFormActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
      <button type="button" className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-600 shadow-sm hover:bg-gray-50" disabled={saving} onClick={onCancel}>
        Cancel
      </button>
      <button
        type="button"
        className={
          allowRaise
            ? 'inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60'
            : 'inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-60'
        }
        disabled={saving}
        aria-label={allowRaise ? 'Save purchase order as draft' : 'Save purchase order'}
        onClick={onSave}
      >
        <i className={saving ? 'ri-loader-4-line animate-spin text-xs' : 'ri-draft-line text-xs'} aria-hidden />
        {allowRaise ? 'Save draft' : 'Save'}
      </button>
      {allowRaise ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          disabled={saving || !showCommercials}
          aria-label="Submit to supplier"
          title={showCommercials ? 'Submit to supplier' : 'Only a super admin can raise a purchase order'}
          onClick={onRaise}
        >
          <i className={saving ? 'ri-loader-4-line animate-spin text-xs' : 'ri-send-plane-line text-xs'} aria-hidden />
          Submit to Supplier
        </button>
      ) : null}
    </div>
  );
}
