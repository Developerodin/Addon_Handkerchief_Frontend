import type { CompletedRow } from '../shared/CompletedQueueTable';

export interface InlineCheckBundle {
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

export interface InlineCheckBoard {
  results: InlineCheckBundle[];
  active: InlineCheckBundle[];
  completed?: CompletedRow[];
  counts: {
    waiting?: number;
    doneToday: number;
    onRack?: number;
    completed?: number;
  };
}

export interface InlineCheckMachine {
  id: string;
  name: string;
  code: string;
  barcode: string;
}