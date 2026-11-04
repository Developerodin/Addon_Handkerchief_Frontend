export interface SewingThreadLine {
  name: string;
  perPiece: number;
}

export interface SewingThreadHint {
  lines: SewingThreadLine[];
  perPiece: number;
}

export interface HemPiece {
  barcode: string;
  orderId: string;
  orderNumber: string;
  rollBarcode: string;
  rackCode: string;
  machineBarcode: string;
  status: 'on-rack' | 'in-work';
  sewingThread: SewingThreadHint;
}

export interface HemBoard {
  results: HemPiece[];
  active: HemPiece[];
  counts: {
    waiting: number;
    onTable: number;
    doneToday: number;
    onRack: number;
  };
}
