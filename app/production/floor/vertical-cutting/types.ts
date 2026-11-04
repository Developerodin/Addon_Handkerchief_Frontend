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

export interface CutBoard {
  results: UpcomingRoll[];
  active: ActiveCut[];
  counts: {
    waiting: number;
    onMachine: number;
    cutToday: number;
    onRack: number;
  };
}
