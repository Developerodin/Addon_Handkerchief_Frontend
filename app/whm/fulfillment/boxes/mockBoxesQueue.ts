import { ADDON_HOLDING_MUMBAI, motherWhRef } from '../../whmDemoConstants';

export interface WhmBoxQueueRow {
  id: string;
  orderNumber: string;
  motherWhRef: string;
  clientName: string;
  batch: string;
  stage: string;
  scanner: string;
  date: string;
  scanningInProgress: boolean;
  active: boolean;
}

export interface WhmBoxHistoryRow {
  id: string;
  orderNumber: string;
  motherWhRef: string;
  completedBy: string;
  completedAt: string;
  matchSummary: string;
}

export const MOCK_BOX_QUEUE: WhmBoxQueueRow[] = [
  {
    id: 'q1',
    orderNumber: 'WO-2026-00066',
    motherWhRef: motherWhRef(21624),
    clientName: ADDON_HOLDING_MUMBAI,
    batch: 'PLB-20261015-0002',
    stage: 'Boxing in progress',
    scanner: '',
    date: '2026-10-15',
    scanningInProgress: false,
    active: true,
  },
  {
    id: 'q2',
    orderNumber: 'WO-2026-00065',
    motherWhRef: motherWhRef(21622),
    clientName: ADDON_HOLDING_MUMBAI,
    batch: 'PLB-20261015-0001',
    stage: 'Boxing in progress',
    scanner: '',
    date: '2026-10-15',
    scanningInProgress: false,
    active: true,
  },
  {
    id: 'q3',
    orderNumber: 'WO-2026-00055',
    motherWhRef: motherWhRef(21501),
    clientName: ADDON_HOLDING_MUMBAI,
    batch: 'PLB-20261012-0003',
    stage: 'Boxing in progress',
    scanner: 'Pranjali',
    date: '2026-10-12',
    scanningInProgress: true,
    active: true,
  },
  {
    id: 'q4',
    orderNumber: 'WO-2026-00061',
    motherWhRef: motherWhRef(21620),
    clientName: ADDON_HOLDING_MUMBAI,
    batch: 'PLB-20261014-0001',
    stage: 'Outer carton scan',
    scanner: 'SUPER ADMIN',
    date: '2026-10-14',
    scanningInProgress: true,
    active: true,
  },
];

export const MOCK_BOX_HISTORY: WhmBoxHistoryRow[] = [
  {
    id: 'h1',
    orderNumber: 'WO-2026-00048',
    motherWhRef: motherWhRef(21420),
    completedBy: 'SUPER ADMIN',
    completedAt: '2026-10-10T14:22:00.000Z',
    matchSummary: '12 inner cartons · 2 master cartons · 96 pcs HK-D-NORM-01',
  },
  {
    id: 'h2',
    orderNumber: 'WO-2026-00050',
    motherWhRef: motherWhRef(21444),
    completedBy: 'Pranjali',
    completedAt: '2026-10-11T11:05:00.000Z',
    matchSummary: '1 master carton · 12 pcs SC-HK-12-001',
  },
];