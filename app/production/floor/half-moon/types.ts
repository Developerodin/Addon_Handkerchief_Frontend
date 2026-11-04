export interface HalfMoonPiece {
  barcode: string;
  orderId: string;
  orderNumber: string;
  rollBarcode: string;
  rackCode: string;
  machineBarcode: string;
  status: 'on-rack' | 'in-work';
}

export interface HalfMoonBoard {
  results: HalfMoonPiece[];
  active: HalfMoonPiece[];
  counts: {
    waiting: number;
    onTable: number;
    doneToday: number;
    onRack: number;
  };
}
