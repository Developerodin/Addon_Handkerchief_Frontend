import { motherWhRef } from '../../whmDemoConstants';

export type WhmPickBatchType = 'single' | 'combined';
export type WhmPickBatchStatus = 'picking' | 'sent-to-scanning' | 'cancelled';

export interface WhmPickBatch {
  id: string;
  batchNumber: string;
  type: WhmPickBatchType;
  orderNumbers: string[];
  motherWhRefs: string[];
  itemCount: number;
  picked: number;
  required: number;
  status: WhmPickBatchStatus;
  createdAt: string;
  active: boolean;
}

export const MOCK_PICK_BATCHES: WhmPickBatch[] = [
  {
    id: 'b1',
    batchNumber: 'PLB-20261015-0002',
    type: 'single',
    orderNumbers: ['WO-2026-00066'],
    motherWhRefs: [motherWhRef(21624)],
    itemCount: 28,
    picked: 387,
    required: 405,
    status: 'picking',
    createdAt: '2026-10-15T10:52:52.000Z',
    active: true,
  },
  {
    id: 'b2',
    batchNumber: 'PLB-20261015-0001',
    type: 'single',
    orderNumbers: ['WO-2026-00065'],
    motherWhRefs: [motherWhRef(21622)],
    itemCount: 12,
    picked: 31,
    required: 34,
    status: 'picking',
    createdAt: '2026-10-15T10:45:32.000Z',
    active: true,
  },
  {
    id: 'b3',
    batchNumber: 'PLB-20261014-0002',
    type: 'combined',
    orderNumbers: ['WO-2026-00061', 'WO-2026-00058'],
    motherWhRefs: [motherWhRef(21620), motherWhRef(21590)],
    itemCount: 44,
    picked: 210,
    required: 720,
    status: 'picking',
    createdAt: '2026-10-14T16:10:00.000Z',
    active: true,
  },
  {
    id: 'b4',
    batchNumber: 'PLB-20261012-0001',
    type: 'combined',
    orderNumbers: ['WO-2026-00055', 'WO-2026-00050'],
    motherWhRefs: [motherWhRef(21501), motherWhRef(21444)],
    itemCount: 8,
    picked: 48,
    required: 48,
    status: 'sent-to-scanning',
    createdAt: '2026-10-12T14:00:00.000Z',
    active: false,
  },
  {
    id: 'b5',
    batchNumber: 'PLB-20261010-0001',
    type: 'single',
    orderNumbers: ['WO-2026-00048'],
    motherWhRefs: [motherWhRef(21420)],
    itemCount: 14,
    picked: 96,
    required: 96,
    status: 'sent-to-scanning',
    createdAt: '2026-10-10T09:00:00.000Z',
    active: false,
  },
];