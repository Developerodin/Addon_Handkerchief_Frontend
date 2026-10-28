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
      };
      printers: {
        getDefault: () => Promise<string | null>;
        find: () => Promise<string[]>;
      };
      configs: { create: (printer: string) => unknown };
      print: (config: unknown, data: unknown[]) => Promise<void>;
    };
  }
}

const QZ_SRC = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.js';
let securityReady = false;

export interface RollLabel {
  barcode: string;
  rollCode: string;
  lotNumber: string;
  fabricName: string;
  colourName: string;
  /** Sort number from the PO item this roll was stamped from. */
  sortNo?: string;
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
 * Unsigned localhost connection. QZ Tray asks the operator to Allow the site.
 */
function configureQzSecurity(): void {
  if (!window.qz || securityReady) return;
  window.qz.security.setCertificatePromise((resolve) => resolve());
  window.qz.security.setSignatureAlgorithm('SHA512');
  window.qz.security.setSignaturePromise(() => (resolve) => resolve());
  securityReady = true;
}

/**
 * Connects to the QZ Tray desktop app and returns the default printer name.
 */
export async function connectQz(): Promise<string> {
  await loadQzScript();
  if (!window.qz) throw new Error('QZ Tray did not load');
  configureQzSecurity();
  if (!window.qz.websocket.isActive()) await window.qz.websocket.connect();
  const printer = await window.qz.printers.getDefault();
  if (!printer) throw new Error('No default printer found in QZ Tray');
  return printer;
}

/**
 * ZPL label: fabric, sort, colour, lot, roll code, and a Code 128 barcode.
 */
function rollZpl(label: RollLabel): string {
  const fabric = [label.fabricName, label.sortNo, label.colourName].filter(Boolean).join(' ').trim().slice(0, 40);
  return [
    '^XA',
    '^PW812',
    '^LL406',
    `^FO40,30^A0N,28,28^FD${fabric || 'Fabric roll'}^FS`,
    `^FO40,70^A0N,24,24^FD${label.lotNumber}  ${label.rollCode}^FS`,
    `^FO40,120^BY2,2,90^BCN,90,Y,N,N^FD${label.barcode}^FS`,
    '^XZ',
  ].join('\n');
}

/**
 * Sends one raw ZPL job per roll to the named printer.
 */
export async function printRollLabels(printer: string, labels: RollLabel[]): Promise<void> {
  if (!labels.length) throw new Error('No roll barcodes to print');
  if (!window.qz || !window.qz.websocket.isActive()) throw new Error('Connect QZ Tray before printing');
  const config = window.qz.configs.create(printer);
  await window.qz.print(config, labels.map((label) => ({ type: 'raw', format: 'plain', data: rollZpl(label) })));
}
