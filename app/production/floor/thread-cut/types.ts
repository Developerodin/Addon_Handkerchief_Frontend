export interface CutBundle {
  id: string;
  barcode: string;
  orderId: string;
  orderNumber: string;
  qty: number;
  rackCode: string;
  machineBarcode: string;
  process: string;
  checkedGood: boolean;
  status: string;
}

import type { CompletedRow } from '../shared/CompletedQueueTable';

export interface CutBoard {
  results: CutBundle[];
  active: CutBundle[];
  completed?: CompletedRow[];
  counts: {
    waiting: number;
    onTable: number;
    doneToday: number;
    onRack: number;
    completed?: number;
  };
}
