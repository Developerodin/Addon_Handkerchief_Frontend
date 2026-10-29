'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { downloadOnePurchaseOrderExcel } from './downloadOnePurchaseOrderExcel';
import { printPurchaseOrder } from './purchaseOrderPrint';

interface PurchaseOrderPrintMenuProps {
  orderId: string;
  poNumber: string;
}

/**
 * Print button that offers a GRN-style purchase order and a one-order Excel file.
 */
export function PurchaseOrderPrintMenu({ orderId, poNumber }: PurchaseOrderPrintMenuProps) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0 });
  const [busy, setBusy] = useState<'print' | 'excel' | ''>('');

  /**
   * Pins the menu to the print button so the table overflow does not clip it.
   */
  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 176;
    const height = 84;
    const openUp = rect.bottom + height + 8 > window.innerHeight;
    setBox({
      top: openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  /**
   * Prints the order or downloads its workbook. Errors stay on the toast.
   */
  const run = async (mode: 'print' | 'excel') => {
    if (busy) return;
    setBusy(mode);
    try {
      if (mode === 'print') {
        await printPurchaseOrder(orderId);
      } else {
        const file = await downloadOnePurchaseOrderExcel(orderId);
        toast.success(`Downloaded ${file}`);
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export the purchase order');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="ui-icon-btn ui-icon-btn--default"
        title="Print"
        aria-label={`Print ${poNumber}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={Boolean(busy)}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          place();
          setOpen(true);
        }}
      >
        <i className="ri-printer-line text-xs" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={`Export ${poNumber}`}
              className="fixed z-[60] w-44 rounded border border-gray-200 bg-white py-1 shadow-lg"
              style={{ top: box.top, left: box.left }}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                disabled={Boolean(busy)}
                onClick={() => run('print')}
              >
                <i className="ri-printer-line text-xs" aria-hidden />
                {busy === 'print' ? 'Printing…' : 'Print'}
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                disabled={Boolean(busy)}
                onClick={() => run('excel')}
              >
                <i className="ri-file-excel-2-line text-xs text-emerald-600" aria-hidden />
                {busy === 'excel' ? 'Downloading…' : 'Download Excel'}
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
