'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { FactoryDrawer, DrawerSection, DrawerStat } from '@/shared/components/factory/FactoryDrawer';
import { UiButton } from '@/shared/components/ui';
import { factoryRequest } from '@/shared/services/factoryApi';
import { FabricLineView, articleLabel, fabricsMatch, formatKg, formatMetres } from './fabricIssueMath';

interface TrackedRoll {
  roll: {
    barcode: string;
    rollCode?: string;
    fabricId?: string;
    fabricName?: string;
    colourName?: string;
    netWeight?: number;
    grossWeight?: number;
    qtyMeters?: number;
    currentGrossWeight?: number | null;
    currentNetWeight?: number | null;
    currentQtyMeters?: number | null;
    scaleWeight?: number;
    status?: string;
    qcStatus?: string;
  };
  rackCode?: string;
  stored?: boolean;
}

/**
 * Scan a roll, check it belongs on this fabric line, then post the issue.
 * The drawer stays open so the next roll can be scanned.
 */
export function IssueRollDrawer({
  open,
  orderId,
  orderNumber,
  line,
  onClose,
  onIssued,
}: {
  open: boolean;
  orderId: string;
  orderNumber: string;
  line: FabricLineView | null;
  onClose: () => void;
  onIssued: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [preview, setPreview] = useState<TrackedRoll | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, line?.key, message]);

  useEffect(() => {
    setBarcode('');
    setPreview(null);
    setError('');
    setMessage('');
  }, [line?.key]);

  /**
   * Loads the roll so the fabric, weight, and rack can be checked before the issue is posted.
   */
  async function lookup(event: FormEvent) {
    event.preventDefault();
    const code = barcode.trim();
    if (!code || !line) return;
    setLoading(true);
    setError('');
    setMessage('');
    setPreview(null);
    try {
      const track = await factoryRequest<TrackedRoll>(`/store/rolls/track/${encodeURIComponent(code)}`);
      setPreview(track);
      setError(previewProblem(line, track));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Roll not found');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Posts the scanned roll against the open fabric line.
   */
  async function issueRoll() {
    if (!line || !preview || error) return;
    setSubmitting(true);
    setMessage('');
    try {
      await factoryRequest('/store/issues', {
        method: 'POST',
        body: JSON.stringify({
          rollBarcode: preview.roll.barcode,
          orderId,
          lineId: line.lineId,
          bomLineId: line.bomLineId,
          eventId: `iss-${Date.now()}`,
        }),
      });
      setMessage('Roll issued');
      setBarcode('');
      setPreview(null);
      setError('');
      onIssued();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Issue failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FactoryDrawer
      title="Issue roll"
      subtitle={line ? `${orderNumber} · ${line.fabricName}` : orderNumber}
      open={open}
      onClose={onClose}
    >
      {line ? (
        <div className="grid gap-3">
          <DrawerSection title="Fabric line">
            <div className="grid grid-cols-2 gap-2 p-3">
              <DrawerStat label="Article" value={articleLabel(line.factoryCode, line.articleName)} />
              <DrawerStat label="Required" value={formatMetres(line.requiredMetres)} />
            </div>
          </DrawerSection>
          <form className="grid gap-2" onSubmit={lookup}>
            <label htmlFor="issue-roll-barcode" className="text-sm font-bold text-[#111827]">
              Scan roll barcode
            </label>
            <input
              ref={inputRef}
              id="issue-roll-barcode"
              aria-label="Roll barcode"
              className="form-control min-h-7 w-full focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Scan or type roll barcode"
              value={barcode}
              onChange={(event) => {
                setBarcode(event.target.value);
                setPreview(null);
                setError('');
                setMessage('');
              }}
              autoComplete="off"
              disabled={loading || submitting}
            />
            <UiButton type="submit" variant="secondary" icon="ri-barcode-line" loading={loading} disabled={!barcode.trim()}>
              Look up roll
            </UiButton>
          </form>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm font-bold text-[#0D5C2E]" role="status">
              {message}
            </p>
          ) : null}
          {preview ? <RollPreview track={preview} /> : null}
          <UiButton type="button" variant="primary" disabled={!preview || Boolean(error) || submitting} loading={submitting} onClick={issueRoll}>
            Issue roll
          </UiButton>
        </div>
      ) : (
        <p className="text-sm text-[#4B5563]">Select a fabric line, then scan the roll.</p>
      )}
    </FactoryDrawer>
  );
}

/**
 * Why this roll cannot be issued, or an empty string when it can.
 */
function previewProblem(line: FabricLineView, track: TrackedRoll): string {
  const roll = track.roll;
  if (!fabricsMatch(line, roll)) {
    return `This roll is ${roll.fabricName || 'another fabric'}. This line needs ${line.fabricName || 'a different fabric'}.`;
  }
  if (roll.status === 'issued' || roll.status === 'on-floor') return 'This roll is already issued.';
  if (roll.qcStatus === 'rejected' || roll.qcStatus === 'held') return 'A rejected or held roll cannot be issued';
  if (!track.stored) return 'This roll is not on a rack.';
  if (!(Number(roll.currentNetWeight) > 0)) return 'This roll has no balance left.';
  return '';
}

/**
 * Received balance stays on the roll. Issue takes the whole current balance.
 */
function RollPreview({ track }: { track: TrackedRoll }) {
  const roll = track.roll;
  return (
    <DrawerSection title="Roll">
      <div className="grid grid-cols-2 gap-2 p-3">
        <DrawerStat label="Barcode" value={roll.barcode} />
        <DrawerStat label="Roll code" value={roll.rollCode || '—'} />
        <DrawerStat label="Fabric" value={roll.fabricName || '—'} />
        <DrawerStat label="Colour" value={roll.colourName || '—'} />
        <DrawerStat label="Rack" value={track.rackCode || 'Not on a rack'} />
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-gray-100 p-3">
        <DrawerStat label="Received gross" value={formatKg(Number(roll.grossWeight) || 0)} />
        <DrawerStat label="Received net" value={formatKg(Number(roll.netWeight) || 0)} />
        <DrawerStat label="Received meters" value={formatMetres(Number(roll.qtyMeters) || 0)} />
        <DrawerStat label="Issuing gross" value={formatKg(Number(roll.currentGrossWeight) || 0)} />
        <DrawerStat label="Issuing net" value={formatKg(Number(roll.currentNetWeight) || 0)} />
        <DrawerStat label="Issuing meters" value={formatMetres(Number(roll.currentQtyMeters) || 0)} />
      </div>
    </DrawerSection>
  );
}
