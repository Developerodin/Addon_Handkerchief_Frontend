export interface CutPieceRow {
  barcode: string;
  status: 'cut' | 'on-rack';
}

export interface UpcomingRoll {
  rollBarcode: string;
  rollCode: string;
  orderId: string;
  orderNumber: string;
  fabricName: string;
  qtyMeters: number;
  piecesPerCut: number;
  issuedAt: string;
  lineId: string;
}

export interface ActiveCut {
  rollBarcode: string;
  orderId: string;
  orderNumber: string;
  fabricName: string;
  qtyMeters: number;
  piecesPerCut: number;
  machineBarcode: string;
  pieces: CutPieceRow[];
}

import type { CompletedRow } from '../shared/CompletedQueueTable';

export interface CutBoard {
  results: UpcomingRoll[];
  active: ActiveCut[];
  completed?: CompletedRow[];
  counts: {
    waiting: number;
    onMachine: number;
    cutToday: number;
    onRack: number;
    completed?: number;
  };
}
