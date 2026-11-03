export interface SupplierTotals {
  suppliers: number;
  orders: number;
  currentOrders: number;
  orderedQty: number;
  receivedQty: number;
  returns: number;
  returnQty: number;
  qcPassedMeters: number;
  qcFailedMeters: number;
}

export interface SupplierRow {
  supplierName: string;
  city: string;
  status: string;
  contactPerson: string;
  orders: number;
  drafts: number;
  currentOrders: number;
  orderedQty: number;
  receivedQty: number;
  fabricCount: number;
  fabricTypes: string[];
  qcPassedMeters: number;
  qcFailedMeters: number;
  qcHeldMeters: number;
  qcPassedRolls: number;
  qcFailedRolls: number;
  qcHeldRolls: number;
  returns: number;
  returnQty: number;
}

export interface SuppliersReport {
  totals: SupplierTotals;
  suppliers: SupplierRow[];
}

export interface SupplierPoCard {
  id: string;
  number: string;
  status: string;
  purchaseDate: string | null;
  ordered: number;
  received: number;
  stillDue: number;
}

export interface SupplierFabricRow {
  fabricName: string;
  fabricTypeName: string;
  orderedQty: number;
  receivedQty: number;
}

export interface SupplierReturnRow {
  reason: string;
  quantity: number;
  poNumber: string;
  issuedAt: string | null;
}

export interface SupplierDetail {
  header: {
    supplierName: string;
    city: string;
    status: string;
    contactPerson: string;
  };
  kpis: {
    orders: number;
    currentOrders: number;
    orderedQty: number;
    receivedQty: number;
    fabricCount: number;
    qcPassedMeters: number;
    qcFailedMeters: number;
    qcHeldMeters: number;
    qcPassedRolls: number;
    qcFailedRolls: number;
    qcHeldRolls: number;
    qcPendingRolls: number;
    returns: number;
    returnQty: number;
  };
  fabrics: SupplierFabricRow[];
  currentOrders: SupplierPoCard[];
  recentOrders: SupplierPoCard[];
  returns: SupplierReturnRow[];
}
