'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { factoryRequest, OrderDetail } from '@/shared/services/factoryApi';
import { ItemSearchDrawer } from './ItemSearchDrawer';
import { OrderArticleTable, orderFieldClass } from './OrderArticleTable';
import { OrderBomPanel } from './OrderBomPanel';
import { orderStatusLabel } from './orderLabels';
import {
  applyItem,
  DraftLine,
  duplicateCodes,
  emptyLine,
  hydrateLine,
  metresPreview,
  statusTone,
  updateLine,
  validateDraft,
} from './orderFormState';
import { ReleasePreview, ReleasePreviewLine } from './ReleasePreview';

/**
 * Add and edit form for a production order. Save stores a draft. Release is separate.
 */
export function OrderForm({ orderId }: { orderId?: string }) {
  const router = useRouter();
  const [buyer, setBuyer] = useState('');
  const [requiredBy, setRequiredBy] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [orderNote, setOrderNote] = useState('');
  const [status, setStatus] = useState('pending');
  const [orderNumber, setOrderNumber] = useState('');
  const [currentFloor, setCurrentFloor] = useState('');
  const [ready, setReady] = useState(!orderId);
  const [articleLocked, setArticleLocked] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [picker, setPicker] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ReleasePreviewLine[] | null>(null);
  const locked = Boolean(orderId) && status !== 'pending';

  useEffect(() => {
    if (!orderId) return;
    factoryRequest<OrderDetail>(`/production/orders/${orderId}`)
      .then(async (detail) => {
        const order = detail.order;
        setBuyer(order.buyer || '');
        setRequiredBy(order.requiredBy ? String(order.requiredBy).slice(0, 10) : '');
        setPriority(order.priority || 'Medium');
        setOrderNote(order.orderNote || '');
        setStatus(order.status);
        setOrderNumber(order.orderNumber || '');
        setCurrentFloor(order.currentFloor || '');
        setArticleLocked(order.status !== 'pending' && (order.lines || []).some((line) => line.itemId));
        const next = await Promise.all((order.lines || []).map((line) => hydrateLine(line)));
        setLines(next.length ? next : [emptyLine()]);
        setReady(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load the order');
        setReady(true);
      });
  }, [orderId]);

  const payload = () => ({
    buyer,
    requiredBy: requiredBy || null,
    priority,
    orderNote,
    lines: lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      quantity: Number(line.quantity),
      priority: line.priority,
      remarks: line.remarks,
      revisionId: line.revisionId,
      piecesPerCut: line.piecesPerCut,
    })),
  });

  /**
   * Writes the draft, then opens the edit page so release is a second step.
   */
  const save = async () => {
    setLoading(true);
    setError('');
    try {
      if (!locked) {
        const invalid = validateDraft(lines);
        if (invalid) throw new Error(invalid);
      }
      if (orderId) {
        await factoryRequest(`/production/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(payload()) });
        router.push('/production/orders');
      } else {
        const created = await factoryRequest<{ id: string }>('/production/orders', {
          method: 'POST',
          body: JSON.stringify(payload()),
        });
        router.push(`/production/orders/${created.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Loads the pin preview. Confirm is a second request.
   */
  const openRelease = async () => {
    if (!orderId) return;
    setLoading(true);
    setError('');
    try {
      const invalid = validateDraft(lines);
      if (invalid) throw new Error(invalid);
      await factoryRequest(`/production/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(payload()) });
      const data = await factoryRequest<{ lines: ReleasePreviewLine[] }>(`/production/orders/${orderId}/release`, {
        method: 'POST',
        body: JSON.stringify({ confirm: false }),
      });
      setPreview(data.lines || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare release');
    } finally {
      setLoading(false);
    }
  };

  const confirmRelease = async () => {
    if (!orderId) return;
    setLoading(true);
    setError('');
    try {
      await factoryRequest(`/production/orders/${orderId}/release`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });
      router.push('/production/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release failed');
      setLoading(false);
    }
  };

  const totalQty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const statusText = orderStatusLabel(status);
  const missingBom = !locked && lines.some((line) => line.itemId && line.bom.length === 0);
  const repeated = duplicateCodes(lines);

  if (!ready) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Edit Production Order" />
        <div className="flex min-h-64 items-center justify-center border border-gray-100 bg-white shadow-sm">
          <p className="text-[11px] font-medium text-gray-500">Loading order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title={orderId ? 'Edit Production Order' : 'Add Production Order'} />
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-[3px] rounded-full bg-purple-600" />
              <h1 className="text-sm font-bold text-gray-800">{orderId ? 'Edit Production Order' : 'Add Production Order'}</h1>
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1f1235] text-[10px] font-bold text-white"
                title="Order number, priority, and one row per article. Release pins the revision."
              >
                i
              </span>
            </div>
            <Link
              href="/production/orders"
              className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] shadow-sm hover:bg-gray-50"
            >
              <i className="ri-arrow-left-line text-xs" aria-hidden /> Back
            </Link>
          </div>
        </div>

        {orderId ? (
          <div className="border-b border-gray-100 p-[10px]">
            <h2 className="mb-3 text-sm font-bold text-gray-800">Order Information</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Order number</p>
                <p className="text-[12px] font-bold text-gray-900">{orderNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Status</p>
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${statusTone(statusText)}`}>
                  {statusText}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Floor</p>
                <p className="text-[12px] font-bold text-gray-900">{currentFloor || '—'}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] font-medium text-gray-600">
              {lines.length} Article{lines.length === 1 ? '' : 's'} - Total Qty: {totalQty.toLocaleString()}
            </p>
          </div>
        ) : null}

        <form
          className="p-[10px]"
          onSubmit={(event) => {
            event.preventDefault();
            save().catch(() => undefined);
          }}
        >
          <div className="mb-4 grid grid-cols-1 items-start gap-x-4 gap-y-3 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block h-5 text-sm font-medium leading-5 text-gray-800">Order Priority *</span>
              <select
                aria-label="Order priority"
                className={`${orderFieldClass} !pr-7`}
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {['Urgent', 'High', 'Medium', 'Low'].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block h-5 text-sm font-medium leading-5 text-gray-800">Order Name (optional)</span>
              <input
                aria-label="Order name"
                className={orderFieldClass}
                value={orderNote}
                onChange={(event) => setOrderNote(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block h-5 text-sm font-medium leading-5 text-gray-800">Buyer</span>
              <input aria-label="Buyer" className={orderFieldClass} value={buyer} onChange={(event) => setBuyer(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block h-5 text-sm font-medium leading-5 text-gray-800">Required by</span>
              <input
                aria-label="Required by"
                type="date"
                className={orderFieldClass}
                value={requiredBy}
                onChange={(event) => setRequiredBy(event.target.value)}
              />
            </label>
          </div>

          <OrderArticleTable
            lines={lines.map((line) => ({ ...line, metres: metresPreview(line) }))}
            locked={locked}
            pickLocked={articleLocked}
            onAdd={() => setLines((current) => [...current, emptyLine()])}
            onPick={setPicker}
            onChange={(index, patch) => updateLine(setLines, index, patch)}
            onRemove={(key) => setLines((current) => current.filter((row) => row.key !== key))}
          />
          <OrderBomPanel lines={lines} />
          {repeated.length ? (
            <p className="mt-3 text-xs font-medium text-amber-700" role="status">
              Same article on more than one row: {repeated.join(', ')}. This does not block save.
            </p>
          ) : null}
          {missingBom ? (
            <p className="mt-3 text-xs font-medium text-red-600" role="alert">
              Fabric BOM is missing for one or more articles. Save and release stay off until the item has a fabric BOM.
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#495057] hover:bg-gray-50"
              onClick={() => router.push('/production/orders')}
            >
              Cancel
            </button>
            {orderId && status === 'pending' ? (
              <button
                type="button"
                className="rounded border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await factoryRequest(`/production/orders/${orderId}`, { method: 'DELETE' });
                    router.push('/production/orders');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Delete failed');
                    setLoading(false);
                  }
                }}
              >
                Delete draft
              </button>
            ) : null}
            {orderId && status === 'pending' ? (
              <button
                type="button"
                className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700 disabled:opacity-60"
                disabled={loading || missingBom}
                title={missingBom ? 'Fabric BOM is missing for one or more articles' : undefined}
                onClick={() => openRelease().catch(() => undefined)}
              >
                Release
              </button>
            ) : null}
            <button
              type="submit"
              className="rounded bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700 disabled:opacity-60"
              disabled={loading || missingBom}
              title={missingBom ? 'Fabric BOM is missing for one or more articles' : undefined}
            >
              {loading ? 'Saving...' : locked ? 'Save' : 'Save draft'}
            </button>
          </div>
        </form>
      </div>
      <ItemSearchDrawer
        open={picker !== null}
        onClose={() => setPicker(null)}
        onSelect={(item) => {
          if (picker === null) return;
          applyItem(setLines, picker, item.id).catch((err: unknown) =>
            setError(err instanceof Error ? err.message : 'Could not load the item')
          );
        }}
      />
      {preview ? (
        <ReleasePreview
          orderNumber={orderNumber}
          lines={preview}
          loading={loading}
          onClose={() => setPreview(null)}
          onConfirm={() => confirmRelease().catch(() => undefined)}
        />
      ) : null}
    </div>
  );
}
