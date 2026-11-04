export interface CutPieceRow {
  barcode: string;
  orderId: string;
  orderNumber: string;
  rollBarcode: string;
  rackCode: string;
  machineBarcode: string;
  status: 'on-rack' | 'in-work' | 'bundled';
  goodQty: number;
  m4Qty: number;
}

export interface BundleRow {
  id: string;
  barcode: string;
  orderId: string;
  orderNumber: string;
  number: number;
  qty: number;
  closed: boolean;
  rackCode: string;
  checkedGood: boolean;
}

export interface SinglePieceCounts {
  waiting: number;
  onTable: number;
  openQty: number;
  closedToday: number;
}

export interface SinglePieceBoard {
  results: CutPieceRow[];
  active: CutPieceRow[];
  openBundles: BundleRow[];
  ready: BundleRow[];
  counts: SinglePieceCounts;
}

export interface CutResult {
  pieces: CutPieceRow[];
  closed: BundleRow[];
  open: BundleRow[];
}
