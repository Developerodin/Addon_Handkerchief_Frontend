export interface HalfMoonPiece {
  barcode: string;
  orderId: string;
  orderNumber: string;
  rollBarcode: string;
  rackCode: string;
  machineBarcode: string;
  status: 'on-rack' | 'in-work';
}

import type { CompletedRow } from '../shared/CompletedQueueTable';

export interface HalfMoonBoard {
  results: HalfMoonPiece[];
  active: HalfMoonPiece[];
  completed?: CompletedRow[];
  counts: {
    waiting: number;
    onTable: number;
    doneToday: number;
    onRack: number;
    completed?: number;
  };
}
