export type ConsumptionBand = 'over' | 'under' | 'match';

export interface ConsumptionMeasures {
  bomMeters: number;
  issuedMeters: number;
  returnedMeters: number;
  consumedMeters: number;
  varianceMeters: number;
  issuedRolls: number;
  returnedRolls: number;
  band: ConsumptionBand;
}

export interface ConsumptionTotals extends ConsumptionMeasures {
  orders: number;
  fabrics: number;
  overCount: number;
  underCount: number;
  matchCount: number;
}

export interface ConsumptionFabric extends ConsumptionMeasures {
  fabricName: string;
  fabricCatalogId: string;
  missingBom: boolean;
  orders: number;
}

export interface ConsumptionOrder extends ConsumptionMeasures {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  buyer: string;
  fabricName: string;
  fabricCatalogId: string;
  missingBom: boolean;
  activeDays: string[];
}

export interface ConsumptionDay {
  date: string;
  issuedMeters: number;
  returnedMeters: number;
  consumedMeters: number;
  issuedRolls: number;
  orderCount: number;
}

export interface ConsumptionActivity {
  date: string;
  orderId: string;
  fabricName: string;
  issuedMeters: number;
  returnedMeters: number;
  issuedRolls: number;
  returnedRolls: number;
}

export interface ConsumptionReport {
  rangeLimited: boolean;
  totals: ConsumptionTotals;
  fabrics: ConsumptionFabric[];
  orders: ConsumptionOrder[];
  days: ConsumptionDay[];
  activity: ConsumptionActivity[];
}

export interface ConsumptionArticleFabric extends ConsumptionMeasures {
  fabricName: string;
  fabricCatalogId: string;
  metresPerPiece: number;
  pieces: number;
  missingBom: boolean;
}

export interface ConsumptionArticle {
  orderId: string;
  orderNumber: string;
  lineId: string;
  articleName: string;
  factoryCode: string;
  pieces: number;
  fabrics: ConsumptionArticleFabric[];
}

export interface ConsumptionMovement {
  at: string;
  kind: string;
  barcode: string;
  fabricName: string;
  meters: number;
  kg: number;
  orderId: string;
  orderNumber: string;
}

export interface ConsumptionDetail {
  title: string;
  note: string;
  totals: ConsumptionTotals;
  articles: ConsumptionArticle[];
  movements: ConsumptionMovement[];
  truncated: boolean;
}

export interface ConsumptionSelection {
  from: string;
  to: string;
  query: string;
  fabric: string;
  fabricId: string;
  orderId: string;
  day: string;
  band: '' | ConsumptionBand;
}
