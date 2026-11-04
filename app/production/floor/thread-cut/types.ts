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

export interface CutBoard {
  results: CutBundle[];
  active: CutBundle[];
  counts: {
    waiting: number;
    onTable: number;
    doneToday: number;
    onRack: number;
  };
}
