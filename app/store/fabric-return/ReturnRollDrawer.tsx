'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { FactoryDrawer, DrawerSection, DrawerStat } from '@/shared/components/factory/FactoryDrawer';
import { UiButton } from '@/shared/components/ui';
import { factoryRequest } from '@/shared/services/factoryApi';
import { FabricLineView, articleLabel, fabricsMatch, formatKg, formatMetres } from '../issue/fabricIssueMath';

interface OpenIssue {
  grossWeight: number;
  netWeight: number;
  qtyMeters: number;
  metersKnown: boolean;
}

interface TrackedRoll {
  roll: {
    barcode: string;
    rollCode?: string;
    fabricId?: string;
    fabricName?: string;
    colourName?: string;
    grossWeight?: number;
    netWeight?: number;
    qtyMeters?: number;
    status?: string;
  };
  openIssue?: OpenIssue | null;
}

/**
 * Keeps digits and one decimal point.
 */
function decimalText(value: string): string {
  return value.replace(/[^\d.]/g, '');
}

/**
 * Scan an issued roll, enter the leftover, scan the rack, and put it back.
 */
export function ReturnRollDrawer({
  open,
  orderId,
  orderNumber,
  line,
  onClose,
  onReturned,
}: {
  open: boolean;
  orderId: string;
  orderNumber: string;
  line: FabricLineView | null;
  onClose: () => void;
  onReturned: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [preview, setPreview] = useState<TrackedRoll | null>(null);
  const [gross, setGross] = useState('');
  const [net, setNet] = useState('');
  const [meters, setMeters] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, line?.key, message]);

  useEffect(() => {
    setBarcode('');
    setPreview(null);
    setGross('');
    setNet('');
    setMeters('');
    setRackCode('');
    setError('');
    setMessage('');
  }, [line?.key]);

  /**
   * Loads the roll so the fabric and the open issue can be checked before the leftover is typed.
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
   * Posts the leftover onto the scanned rack for this order and article.
   */
  async function returnRoll() {
    if (!line || !preview?.openIssue || error) return;
    const problem = leftoverProblem(preview.openIssue, gross, net, meters);
    if (problem) {
      setError(problem);
      return;
    }
    if (!rackCode.trim()) {
      setError('Scan the rack barcode');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await factoryRequest('/store/returns', {
        method: 'POST',
        body: JSON.stringify({
          rollBarcode: preview.roll.barcode,
          orderId,
          lineId: line.lineId,
          bomLineId: line.bomLineId,
          rackCode: rackCode.trim(),
          grossWeight: Number(gross),
          netWeight: Number(net),
          qtyMeters: Number(meters),
        }),
      });
      setMessage('Roll returned');
      setBarcode('');
      setPreview(null);
      setGross('');
      setNet('');
      setMeters('');
      setRackCode('');
      setError('');
      onReturned();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Return failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FactoryDrawer title="Return roll" subtitle={line ? `${orderNumber} · ${line.fabricName}` : orderNumber} open={open} onClose={onClose}>
      {line ? (
        <div className="grid gap-3">
          <DrawerSection title="Fabric line">
            <div className="grid grid-cols-2 gap-2 p-3">
              <DrawerStat label="Article" value={articleLabel(line.factoryCode, line.articleName)} />
              <DrawerStat label="Fabric" value={line.fabricName} />
            </div>
          </DrawerSection>
          <form className="grid gap-2" onSubmit={lookup}>
            <label htmlFor="return-roll-barcode" className="text-sm font-bold text-[#111827]">Scan roll barcode</label>
            <input
              ref={inputRef}
              id="return-roll-barcode"
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
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          {message ? <p className="text-sm font-bold text-[#0D5C2E]" role="status">{message}</p> : null}
          {preview ? <RollPreview track={preview} /> : null}
          {preview && !error ? (
            <div className="grid gap-2">
              <div className="grid grid-cols-3 gap-2">
                <label className="grid gap-1 text-xs font-bold text-[#111827]" htmlFor="leftover-gross">
                  Leftover gross
                  <input id="leftover-gross" aria-label="Leftover gross weight" inputMode="decimal" className="form-control" value={gross} onChange={(event) => setGross(decimalText(event.target.value))} />
                </label>
                <label className="grid gap-1 text-xs font-bold text-[#111827]" htmlFor="leftover-net">
                  Leftover net
                  <input id="leftover-net" aria-label="Leftover net weight" inputMode="decimal" className="form-control" value={net} onChange={(event) => setNet(decimalText(event.target.value))} />
                </label>
                <label className="grid gap-1 text-xs font-bold text-[#111827]" htmlFor="leftover-meters">
                  Leftover meters
                  <input id="leftover-meters" aria-label="Leftover quantity in meters" inputMode="decimal" className="form-control" value={meters} onChange={(event) => setMeters(decimalText(event.target.value))} />
                </label>
              </div>
              <label className="grid gap-1 text-sm font-bold text-[#111827]" htmlFor="return-rack-barcode">
                Scan rack barcode
                <input
                  id="return-rack-barcode"
                  aria-label="Rack barcode"
                  className="form-control min-h-7 w-full focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Scan the rack barcode"
                  value={rackCode}
                  onChange={(event) => setRackCode(event.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                />
              </label>
            </div>
          ) : null}
          <UiButton type="button" variant="primary" disabled={!preview || Boolean(error) || submitting} loading={submitting} onClick={returnRoll}>
            Return to rack
          </UiButton>
        </div>
      ) : (
        <p className="text-sm text-[#4B5563]">Select a fabric line, then scan the roll.</p>
      )}
    </FactoryDrawer>
  );
}

/**
 * Why this roll cannot be returned, or an empty string when it can.
 */
function previewProblem(line: FabricLineView, track: TrackedRoll): string {
  const roll = track.roll;
  if (!fabricsMatch(line, roll)) {
    return `This roll is ${roll.fabricName || 'another fabric'}. This line needs ${line.fabricName || 'a different fabric'}.`;
  }
  if (roll.status !== 'issued' && roll.status !== 'on-floor') return 'This roll is not issued';
  if (!track.openIssue) return 'This roll has no open issue';
  return '';
}

/**
 * Why this leftover cannot be saved, or an empty string when it can.
 */
function leftoverProblem(issued: OpenIssue, gross: string, net: string, meters: string): string {
  const grossN = Number(gross);
  const netN = Number(net);
  const metersN = Number(meters);
  if (!(grossN > 0) || !(netN > 0) || !(metersN > 0)) return 'Leftover gross, net, and meters must be greater than 0';
  if (grossN > issued.grossWeight) return 'Leftover gross is above what was issued';
  if (netN > issued.netWeight) return 'Leftover net is above what was issued';
  if (issued.metersKnown && metersN > issued.qtyMeters) return 'Leftover meters are above what was issued';
  return '';
}

/**
 * Received balance stays fixed. The open issue is what left the rack.
 */
function RollPreview({ track }: { track: TrackedRoll }) {
  const roll = track.roll;
  const issued = track.openIssue;
  return (
    <DrawerSection title="Roll">
      <div className="grid grid-cols-2 gap-2 p-3">
        <DrawerStat label="Barcode" value={roll.barcode} />
        <DrawerStat label="Roll code" value={roll.rollCode || '—'} />
        <DrawerStat label="Received gross" value={formatKg(Number(roll.grossWeight) || 0)} />
        <DrawerStat label="Received net" value={formatKg(Number(roll.netWeight) || 0)} />
        <DrawerStat label="Received meters" value={formatMetres(Number(roll.qtyMeters) || 0)} />
        <DrawerStat label="Issued gross" value={issued ? formatKg(issued.grossWeight) : '—'} />
        <DrawerStat label="Issued net" value={issued ? formatKg(issued.netWeight) : '—'} />
        <DrawerStat label="Issued meters" value={issued ? (issued.metersKnown ? formatMetres(issued.qtyMeters) : 'Not recorded') : '—'} />
      </div>
    </DrawerSection>
  );
}
