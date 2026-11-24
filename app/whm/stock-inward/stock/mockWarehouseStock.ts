export type WhmStockState = 'Checked' | 'Unchecked' | 'In QC' | 'Rejected';

export interface WhmWarehouseStockRow {
  id: string;
  product: string;
  sortNo: string;
  style: string;
  design: string;
  packType: string;
  stockState: WhmStockState;
  total: number;
  blocked: number;
  available: number;
  updatedAt: string;
}

export const DEMO_STOCK_TOTAL = 1847;

export const MOCK_WAREHOUSE_STOCK: WhmWarehouseStockRow[] = [
  {
    id: 's1',
    product: 'HK-D-NORM-01',
    sortNo: 'H0002W',
    style: 'SC-HK-12-001',
    design: 'Plain white — hem',
    packType: '12 pcs / pack',
    stockState: 'Checked',
    total: 420,
    blocked: 180,
    available: 240,
    updatedAt: '2026-11-23T11:22:02.000Z',
  },
  {
    id: 's2',
    product: 'HK-D-NORM-01',
    sortNo: 'H0002W',
    style: 'SC-HK-6-001',
    design: 'Plain white — hem',
    packType: '6 pcs / pack',
    stockState: 'Checked',
    total: 288,
    blocked: 48,
    available: 240,
    updatedAt: '2026-11-23T11:22:02.000Z',
  },
  {
    id: 's3',
    product: 'HK-D-CHK-02',
    sortNo: 'H0006C',
    style: 'SC-HK-12-002',
    design: 'Checks navy — hem',
    packType: '12 pcs / pack',
    stockState: 'Checked',
    total: 156,
    blocked: 0,
    available: 156,
    updatedAt: '2026-11-23T11:22:01.000Z',
  },
  {
    id: 's4',
    product: 'HK-D-CHK-02',
    sortNo: 'H0006C',
    style: 'SC-HK-3-002',
    design: 'Checks navy — hem',
    packType: '3 pcs / pack',
    stockState: 'In QC',
    total: 96,
    blocked: 0,
    available: 0,
    updatedAt: '2026-11-23T11:22:01.000Z',
  },
  {
    id: 's5',
    product: 'HK-D-EMB-03',
    sortNo: 'H0016A',
    style: 'SC-HK-9-003',
    design: 'Embroidery motif',
    packType: '9 pcs / pack',
    stockState: 'Checked',
    total: 324,
    blocked: 120,
    available: 204,
    updatedAt: '2026-11-23T11:22:01.000Z',
  },
  {
    id: 's6',
    product: 'HK-D-EMB-03',
    sortNo: 'H0016A',
    style: 'SC-HK-1-003',
    design: 'Embroidery motif',
    packType: '1 pc / pack',
    stockState: 'Checked',
    total: 48,
    blocked: 0,
    available: 48,
    updatedAt: '2026-11-23T11:22:01.000Z',
  },
  {
    id: 's7',
    product: 'HK-D-NORM-04',
    sortNo: 'H0002W',
    style: 'SC-HK-12-004',
    design: 'Plain ivory — selvedge',
    packType: '12 pcs / pack',
    stockState: 'Unchecked',
    total: 210,
    blocked: 0,
    available: 210,
    updatedAt: '2026-11-23T11:21:58.000Z',
  },
  {
    id: 's8',
    product: 'HK-D-CHK-05',
    sortNo: 'H0006C',
    style: 'SC-HK-6-005',
    design: 'Mini checks — border',
    packType: '6 pcs / pack',
    stockState: 'Checked',
    total: 180,
    blocked: 36,
    available: 144,
    updatedAt: '2026-11-23T11:21:55.000Z',
  },
  {
    id: 's9',
    product: 'HK-D-NORM-01',
    sortNo: 'H0002W',
    style: 'SC-HK-12-001',
    design: 'Plain white — hem',
    packType: '12 pcs / pack',
    stockState: 'Rejected',
    total: 24,
    blocked: 0,
    available: 0,
    updatedAt: '2026-11-23T11:21:50.000Z',
  },
];