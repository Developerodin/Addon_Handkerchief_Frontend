export interface WhmInwardRow {
  id: string;
  source: 'FACTORY' | 'QC_HOLD';
  productCode: string;
  sortNo: string;
  productionQty: number;
  styleCode: string;
  design: string;
  receivedAt: string;
  receivedQty: number;
  status: 'ACCEPTED' | 'ON_HOLD' | 'REJECTED';
}

export const DEMO_INWARD_TOTAL = 248;

export const MOCK_INWARD_ROWS: WhmInwardRow[] = [
  {
    id: 'i1',
    source: 'FACTORY',
    productCode: 'HK-D-NORM-01',
    sortNo: 'H0002W',
    productionQty: 180,
    styleCode: 'SC-HK-12-001',
    design: 'Plain white — hem',
    receivedAt: '2026-11-20T03:31:19.000Z',
    receivedQty: 180,
    status: 'ACCEPTED',
  },
  {
    id: 'i2',
    source: 'FACTORY',
    productCode: 'HK-D-CHK-02',
    sortNo: 'H0006C',
    productionQty: 96,
    styleCode: 'SC-HK-12-002',
    design: 'Checks navy — hem',
    receivedAt: '2026-11-20T03:31:15.000Z',
    receivedQty: 96,
    status: 'ACCEPTED',
  },
  {
    id: 'i3',
    source: 'FACTORY',
    productCode: 'HK-D-EMB-03',
    sortNo: 'H0016A',
    productionQty: 120,
    styleCode: 'SC-HK-9-003',
    design: 'Embroidery motif',
    receivedAt: '2026-11-20T03:30:48.000Z',
    receivedQty: 118,
    status: 'ACCEPTED',
  },
  {
    id: 'i4',
    source: 'QC_HOLD',
    productCode: 'HK-D-CHK-02',
    sortNo: 'H0006C',
    productionQty: 48,
    styleCode: 'SC-HK-3-002',
    design: 'Checks navy — hem',
    receivedAt: '2026-11-20T03:30:42.000Z',
    receivedQty: 0,
    status: 'ON_HOLD',
  },
  {
    id: 'i5',
    source: 'FACTORY',
    productCode: 'HK-D-NORM-04',
    sortNo: 'H0002W',
    productionQty: 210,
    styleCode: 'SC-HK-12-004',
    design: 'Plain ivory — selvedge',
    receivedAt: '2026-11-19T11:00:00.000Z',
    receivedQty: 210,
    status: 'ACCEPTED',
  },
  {
    id: 'i6',
    source: 'FACTORY',
    productCode: 'HK-D-NORM-01',
    sortNo: 'H0002W',
    productionQty: 60,
    styleCode: 'SC-HK-6-001',
    design: 'Plain white — hem',
    receivedAt: '2026-11-18T09:22:00.000Z',
    receivedQty: 24,
    status: 'REJECTED',
  },
];