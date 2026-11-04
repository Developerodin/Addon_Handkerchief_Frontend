export interface SewingThreadLine {
  name: string;
  perPiece: number;
}

export interface SewingThreadHint {
  lines: SewingThreadLine[];
  perPiece: number;
}

export interface HemBundle {
  id: string;
  barcode: string;
  orderId: string;
  orderNumber: string;
  qty: number;
  rackCode: string;
  machineBarcode: string;
  process: string;
  checkedGood: boolean;
  sewingThread: SewingThreadHint;
}

export interface HemBoard {
  results: HemBundle[];
  active: HemBundle[];
  counts: {
    waiting: number;
    onMachine: number;
    doneToday: number;
    onRack: number;
  };
}
