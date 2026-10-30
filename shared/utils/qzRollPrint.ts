/**
 * Loads QZ Tray from a CDN and prints roll barcode labels.
 * No extra package: the script is the same qz-tray build the yarn app uses.
 */

declare global {
  interface Window {
    qz?: {
      security: {
        setCertificatePromise: (handler: (resolve: (value?: string) => void, reject: (reason?: unknown) => void) => void) => void;
        setSignatureAlgorithm: (algorithm: string) => void;
        setSignaturePromise: (handler: (toSign: string) => (resolve: (value?: string) => void, reject: (reason?: unknown) => void) => void) => void;
      };
      websocket: {
        isActive: () => boolean;
        connect: () => Promise<void>;
        disconnect: () => Promise<void>;
      };
      printers: {
        getDefault: () => Promise<string | null>;
        find: () => Promise<string[]>;
      };
      configs: { create: (printer: string) => unknown };
      print: (config: unknown, data: unknown[]) => Promise<void>;
    };
    /** True after the unsigned certificate promise has been set for this page. */
    __hkQzSecurity?: boolean;
  }
}

const QZ_SRC = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.js';
/** Kept after a successful connect so a second print does not open another socket. */
let session: Promise<string> | null = null;
/** One QZ call at a time. A second print used to run while the socket was still connecting. */
let gate: Promise<void> = Promise.resolve();

export interface RollLabel {
  barcode: string;
  rollCode: string;
  lotNumber: string;
  fabricName: string;
  colourName: string;
  /** Sort number from the PO item this roll was stamped from. */
  sortNo?: string;
  fabricType?: string;
  countName?: string;
  poNumber?: string;
  supplierName?: string;
}

/**
 * True when the QZ Tray browser script has finished loading.
 */
export function isQzLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.qz !== 'undefined';
}

/**
 * True when the local QZ Tray app has an open websocket.
 */
export function isQzConnected(): boolean {
  return Boolean(isQzLoaded() && window.qz?.websocket.isActive());
}

/**
 * Loads the QZ Tray script once.
 */
export function loadQzScript(): Promise<void> {
  if (isQzLoaded()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="qz-tray"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('QZ Tray script failed to load')));
      if (isQzLoaded()) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = QZ_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('QZ Tray script failed to load. Check the network and that QZ Tray is installed.'));
    document.head.appendChild(script);
  });
}

/**
 * Runs one QZ Tray operation at a time.
 * isActive() is also true while the socket is still connecting, before sendData exists.
 */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = gate.then(task, task);
  gate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * True when the open socket cannot take another command yet.
 */
function isSendDataError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('sendData') || message.includes('has not returned') || message.includes('still closing');
}

/**
 * Unsigned localhost connection. Set once per page, before the first connect.
 */
function configureQzSecurity(): void {
  if (!window.qz || window.__hkQzSecurity) return;
  window.qz.security.setCertificatePromise((resolve) => resolve(''));
  window.qz.security.setSignatureAlgorithm('SHA512');
  window.qz.security.setSignaturePromise(() => (resolve) => resolve(''));
  window.__hkQzSecurity = true;
}

/**
 * Opens the socket only when there is not one already, then reads the default printer.
 * getDefault is retried while the socket is still connecting, which is when sendData is missing.
 */
async function openQz(): Promise<string> {
  await loadQzScript();
  if (!window.qz) throw new Error('QZ Tray did not load');
  configureQzSecurity();

  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      if (!window.qz.websocket.isActive()) await window.qz.websocket.connect();
      const printer = await window.qz.printers.getDefault();
      if (!printer) throw new Error('No default printer found in QZ Tray');
      return printer;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const connecting = message.includes('sendData')
        || message.includes('has not returned')
        || message.includes('still closing')
        || message.includes('already exists');
      if (!connecting) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('QZ Tray connection was not ready');
}

/**
 * Closes a socket that lost sendData and connects again. Reloads QZ Tray if close is not enough.
 */
async function recoverQzConnection(): Promise<void> {
  session = null;
  const qz = window.qz;
  if (qz?.websocket.isActive()) {
    await Promise.race([
      qz.websocket.disconnect().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  try {
    if (window.qz && !window.qz.websocket.isActive()) await window.qz.websocket.connect();
    if (window.qz?.websocket.isActive()) {
      await window.qz.printers.getDefault();
      return;
    }
  } catch (error) {
    if (!isSendDataError(error)) throw error;
  }

  document.querySelectorAll('script[src*="qz-tray"]').forEach((node) => node.remove());
  delete window.qz;
  window.__hkQzSecurity = false;
  await loadQzScript();
  configureQzSecurity();
  if (!window.qz) throw new Error('QZ Tray did not load');
  await window.qz.websocket.connect();
}

/**
 * Connects once and reuses that connection. A failed connect can be tried again.
 */
async function openQzSafe(): Promise<string> {
  if (session) return session;
  const pending = (async () => {
    try {
      return await openQz();
    } catch (error) {
      if (!isSendDataError(error)) throw error;
      await recoverQzConnection();
      return await openQz();
    }
  })();
  session = pending;
  try {
    const printer = await pending;
    session = Promise.resolve(printer);
    return printer;
  } catch (error) {
    if (session === pending) session = null;
    throw error;
  }
}

/**
 * Printer name for callers that already hold the QZ queue.
 */
export function ensureQzPrinter(): Promise<string> {
  return openQzSafe();
}

/**
 * Runs printer work on the same queue as printing, so listing printers cannot open a second socket.
 */
export function runQzExclusive<T>(task: () => Promise<T>): Promise<T> {
  return enqueue(task);
}

/**
 * Connects to the QZ Tray desktop app and returns the default printer name.
 */
export function connectQz(): Promise<string> {
  return enqueue(() => openQzSafe());
}

/**
 * Sends raw ZPL strings on the shared connection.
 * If the previous job left the socket without sendData, reconnect once and send again.
 */
export function sendQzRaw(config: unknown, labels: string[]): Promise<void> {
  return enqueue(async () => {
    await openQzSafe();
    if (!window.qz) throw new Error('QZ Tray did not load');
    try {
      await window.qz.print(config, labels);
    } catch (error) {
      if (!isSendDataError(error)) throw error;
      session = null;
      await recoverQzConnection();
      await openQzSafe();
      if (!window.qz) throw new Error('QZ Tray did not load');
      await window.qz.print(config, labels);
    }
  });
}

/** 100 mm at 203 DPI. This page size belongs to roll labels only. */
const ROLL_DOTS = 800;

export interface RollPrintSettings {
  barcodeWidth: number;
  barcodeHeight: number;
  nameFontSize: number;
  valueFontSize: number;
}

export const DEFAULT_ROLL_PRINT_SETTINGS: RollPrintSettings = {
  barcodeWidth: 3,
  barcodeHeight: 160,
  nameFontSize: 28,
  valueFontSize: 30,
};

/**
 * Keeps ^ and ~ out of field data so a name cannot start a new ZPL command.
 */
function zplText(value: string | undefined): string {
  const text = String(value || '').replace(/[\^~\\]/g, ' ').trim();
  return text || '—';
}

/**
 * Narrows a long code so the bars stay inside the 100 mm sticker.
 */
function barcodeModule(value: string, requested: number): number {
  let width = Math.max(1, Math.min(5, requested || 3));
  const limit = ROLL_DOTS - 40;
  while (width > 1 && (value.length + 3) * 11 * width > limit) width -= 1;
  return width;
}

/**
 * One half-width cell: field name, then the value. No box around it.
 */
function detailCell(x: number, y: number, title: string, value: string | undefined, settings: RollPrintSettings): string {
  const valueY = y + settings.nameFontSize + 6;
  return [
    `^FO${x},${y}^A0N,${settings.nameFontSize},${settings.nameFontSize}^FD${zplText(title)}^FS`,
    `^FO${x},${valueY}^A0N,${settings.valueFontSize},${settings.valueFontSize}^FB360,2,0,L^FD${zplText(value)}^FS`,
  ].join('\n');
}

/**
 * Field name and value on one full-width line. Fabric name may wrap the value onto a second line.
 */
function fullLine(y: number, title: string, value: string | undefined, settings: RollPrintSettings, maxLines = 1): string {
  const titleDots = Math.ceil(title.length * settings.nameFontSize * 0.7);
  const valueX = 24 + titleDots + 8;
  const valueWidth = Math.max(160, ROLL_DOTS - valueX - 20);
  const nameY = y + Math.max(0, settings.valueFontSize - settings.nameFontSize);
  return [
    `^FO24,${nameY}^A0N,${settings.nameFontSize},${settings.nameFontSize}^FD${zplText(title)}^FS`,
    `^FO${valueX},${y}^A0N,${settings.valueFontSize},${settings.valueFontSize}^FB${valueWidth},${maxLines},2,L^FD${zplText(value)}^FS`,
  ].join('\n');
}

/**
 * 100×100 mm roll sticker. Barcode on top, then full lines and two pair rows.
 */
function rollZpl(label: RollLabel, settings: RollPrintSettings = DEFAULT_ROLL_PRINT_SETTINGS): string {
  const moduleWidth = barcodeModule(label.barcode || '', settings.barcodeWidth);
  const barsWidth = ((label.barcode || '').length + 3) * 11 * moduleWidth;
  const barcodeX = Math.max(16, Math.round((ROLL_DOTS - barsWidth) / 2));
  const barcodeY = 48;
  const pairs: Array<Array<[string, string | undefined]>> = [
    [['Sort no.', label.sortNo], ['Type', label.fabricType]],
    [['Count', label.countName], ['Color', label.colourName]],
  ];
  let detailsY = barcodeY + settings.barcodeHeight + 56;
  const rowStep = settings.nameFontSize + 6 + settings.valueFontSize + 14;
  const details: string[] = [];
  const pushFull = (title: string, value: string | undefined, lines = 1) => {
    details.push(fullLine(detailsY, title, value, settings, lines));
    detailsY += settings.valueFontSize * lines + 14;
  };
  pushFull('Roll id', label.rollCode);
  pushFull('Fabric name', label.fabricName, 2);
  pushFull('Supplier', label.supplierName);
  pushFull('PO No', label.poNumber);
  pushFull('Lot no', label.lotNumber);
  pairs.forEach((row) => {
    row.forEach((cell, index) => {
      details.push(detailCell(index === 0 ? 24 : 412, detailsY, cell[0], cell[1], settings));
    });
    detailsY += rowStep;
  });

  return [
    '^XA',
    `^PW${ROLL_DOTS}`,
    `^LL${ROLL_DOTS}`,
    '^CI28',
    `^BY${moduleWidth},2,${settings.barcodeHeight}`,
    `^FO${barcodeX},${barcodeY}^BCN,${settings.barcodeHeight},Y,N,N^FD${zplText(label.barcode)}^FS`,
    ...details,
    '^XZ',
  ].join('\n');
}

/**
 * QZ page for roll stock only. Rack labels keep their own size.
 */
function rollPrintConfig(printer: string): unknown {
  if (!window.qz) throw new Error('QZ Tray did not load');
  const create = window.qz.configs.create as (name: string, options?: Record<string, unknown>) => unknown;
  return create(printer, {
    size: { width: 100, height: 100 },
    units: 'mm',
    density: 203,
    forceRaw: true,
  });
}

/**
 * Sends one 100×100 mm ZPL label per roll.
 */
export async function printRollLabels(
  printer: string,
  labels: RollLabel[],
  settings: RollPrintSettings = DEFAULT_ROLL_PRINT_SETTINGS,
): Promise<void> {
  if (!labels.length) throw new Error('No roll barcodes to print');
  const fallback = await connectQz();
  await sendQzRaw(rollPrintConfig(printer || fallback), labels.map((label) => rollZpl(label, settings)));
}
