export interface SelvagePiece {
  barcode: string;
  orderId: string;
  orderNumber: string;
  rollBarcode: string;
  rackCode: string;
  machineBarcode: string;
  status: 'on-rack' | 'in-work';
}

import type { CompletedRow } from '../shared/CompletedQueueTable';

export interface SelvageBoard {
  results: SelvagePiece[];
  active: SelvagePiece[];
  completed?: CompletedRow[];
  counts: {
    waiting: number;
    onTable: number;
    doneToday: number;
    onRack: number;
    completed?: number;
  };
}
