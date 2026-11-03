export interface PoTotals {
  orders: number;
  suppliers: number;
  orderedQty: number;
  receivedQty: number;
  stillDue: number;
  value: number;
  valueWithGst: number;
  openOrders: number;
  medianDaysToReceipt: number | null;
}

export interface PoSupplierBar {
  supplier: string;
  orders: number;
  ordered: number;
  received: number;
  stillDue: number;
  value: number;
}

export interface PoWeekBar {
  week: string;
  orders: number;
  ordered: number;
}

export interface PoOrderRow {
  id: string;
  number: string;
  supplier: string;
  purchaseDate: string | null;
  status: string;
  ordered: number;
  received: number;
  stillDue: number;
  value: number;
  valueWithGst: number;
  days: number;
  lastUser: string;
}

export interface PoAnalyticsReport {
  totals: PoTotals;
  bySupplier: PoSupplierBar[];
  byWeek: PoWeekBar[];
  supplierOptions: string[];
  orders: PoOrderRow[];
}

export interface PoTimelineEvent {
  at: string;
  label: string;
  detail: string;
  daysAfterPrevious: number | null;
  dateOnly?: boolean;
}

export interface PoLineRow {
  lineId: string;
  fabricName: string;
  fabricSortNo: string;
  colourName: string;
  unitName: string;
  ordered: number;
  received: number;
  stillDue: number;
  rate: number;
  gstPercent: number;
  value: number;
  cutoff: 'Approved' | 'Waiting';
}

export interface PoLotRow {
  id: string;
  status: string;
  qcStatus: string;
  approvedBy: string;
  approvedAt: string | null;
  approver: string;
  cutoffs: Array<{ fabricId: string; fabricName: string; approved: boolean }>;
}

export interface PoPackingRow {
  id: string;
  code: string;
  shipmentDate: string;
  expectedDelivery: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  lrNo: string;
  lrDate: string | null;
  courierName: string;
  courierNumber: string;
  vehicleNumber: string;
  challanNumber: string;
  cartons: number;
  rolls: number;
  boxes: number;
  netWeight: number;
  grossWeight: number;
  notes: string;
}

export interface PoReceiptRow {
  id: string;
  number: string;
  receivedDate: string;
  receiver: string;
  netWeight: number;
  grossWeight: number;
  condition: string;
  notes: string;
}

export interface PoQcRow {
  lotNumber: string;
  qcStatus: string;
  qcBy: string;
  qcAt: string | null;
  qcRemarks: string;
  rolls: number;
  netWeight: number;
  grossWeight: number;
}

export interface PoStoredRoll {
  barcode: string;
  fabricName: string;
  colourName: string;
  status: string;
  scaleWeight: number;
  netWeight: number;
  qtyMeters: number;
}

export interface PoReturnRow {
  id: string;
  reason: string;
  quantity: number;
  challanNumber: string;
  issuedAt: string | null;
  remarks: string;
}

export interface PoDossier {
  header: {
    id: string;
    number: string;
    supplierName: string;
    supplierAddress: string;
    supplierTerms: string;
    creditDays: number;
    notes: string;
    status: string;
    purchaseDate: string | null;
    estimatedDelivery: string | null;
  };
  cycle: {
    daysToFirstReceipt: number | null;
    daysOpen: number | null;
  };
  timeline: PoTimelineEvent[];
  lines: PoLineRow[];
  lots: PoLotRow[];
  packing: PoPackingRow[];
  receipts: PoReceiptRow[];
  qc: PoQcRow[];
  storage: {
    unstored: number;
    racks: Array<{ rack: string; count: number; rolls: PoStoredRoll[] }>;
  };
  returns: PoReturnRow[];
}

export const PO_STATUSES = [
  'Draft',
  'Submitted to Vendor',
  'In Transit',
  'Partially Received',
  'Received',
  'Return to Vendor',
  'Completed',
  'Rejected',
];
