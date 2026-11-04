export interface SelvagePiece {
  barcode: string;
  orderId: string;
  orderNumber: string;
  rollBarcode: string;
  rackCode: string;
  machineBarcode: string;
  status: 'on-rack' | 'in-work';
}

export interface SelvageBoard {
  results: SelvagePiece[];
  active: SelvagePiece[];
  counts: {
    waiting: number;
    onTable: number;
    doneToday: number;
    onRack: number;
  };
}
