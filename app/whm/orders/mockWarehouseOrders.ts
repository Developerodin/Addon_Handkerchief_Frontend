import { ADDON_HOLDING_MUMBAI, motherWhRef } from '../whmDemoConstants';

export type WhmOrderStatus = 'draft' | 'pending' | 'in-progress' | 'packed' | 'dispatched' | 'cancelled';

export type WhmClientType = 'Holding' | 'Replenishment' | 'Urgent';

export interface WhmWarehouseOrder {
  id: string;
  orderNumber: string;
  motherWhRef: string;
  clientName: string;
  billCode: string;
  clientType: WhmClientType;
  qty: number;
  singleRows: number;
  multiRows: number;
  status: WhmOrderStatus;
  flowStage: string;
  createdAt: string;
  fromMotherWh?: boolean;
  motherWhSynced?: boolean;
}

/** Static demo rows — replace with API later. */
export const MOCK_WAREHOUSE_ORDERS: WhmWarehouseOrder[] = [
  {
    id: '1',
    orderNumber: 'WO-2026-00066',
    motherWhRef: motherWhRef(21624),
    clientName: ADDON_HOLDING_MUMBAI,
    billCode: '',
    clientType: 'Holding',
    qty: 184,
    singleRows: 3,
    multiRows: 25,
    status: 'packed',
    flowStage: 'billed',
    createdAt: '2026-10-15T10:30:00.000Z',
    fromMotherWh: true,
    motherWhSynced: true,
  },
  {
    id: '2',
    orderNumber: 'WO-2026-00065',
    motherWhRef: motherWhRef(21622),
    clientName: ADDON_HOLDING_MUMBAI,
    billCode: '',
    clientType: 'Holding',
    qty: 48,
    singleRows: 1,
    multiRows: 4,
    status: 'in-progress',
    flowStage: 'picking',
    createdAt: '2026-10-15T09:15:00.000Z',
    fromMotherWh: true,
    motherWhSynced: true,
  },
  {
    id: '3',
    orderNumber: 'WO-2026-00062',
    motherWhRef: '',
    clientName: ADDON_HOLDING_MUMBAI,
    billCode: 'AHM-REPL-0010',
    clientType: 'Replenishment',
    qty: 24,
    singleRows: 2,
    multiRows: 1,
    status: 'draft',
    flowStage: 'order-created',
    createdAt: '2026-10-14T14:00:00.000Z',
    fromMotherWh: true,
  },
  {
    id: '4',
    orderNumber: 'WO-2026-00061',
    motherWhRef: motherWhRef(21620),
    clientName: ADDON_HOLDING_MUMBAI,
    billCode: '',
    clientType: 'Holding',
    qty: 600,
    singleRows: 12,
    multiRows: 10,
    status: 'packed',
    flowStage: 'billed',
    createdAt: '2026-10-14T11:20:00.000Z',
    fromMotherWh: true,
    motherWhSynced: true,
  },
  {
    id: '5',
    orderNumber: 'WO-2026-00058',
    motherWhRef: motherWhRef(21590),
    clientName: ADDON_HOLDING_MUMBAI,
    billCode: '',
    clientType: 'Holding',
    qty: 120,
    singleRows: 4,
    multiRows: 8,
    status: 'pending',
    flowStage: 'order-created',
    createdAt: '2026-10-13T08:00:00.000Z',
    fromMotherWh: true,
    motherWhSynced: true,
  },
  {
    id: '6',
    orderNumber: 'WO-2026-00055',
    motherWhRef: motherWhRef(21501),
    clientName: ADDON_HOLDING_MUMBAI,
    billCode: 'AHM-REPL-0042',
    clientType: 'Replenishment',
    qty: 36,
    singleRows: 1,
    multiRows: 2,
    status: 'in-progress',
    flowStage: 'scanning',
    createdAt: '2026-10-12T16:45:00.000Z',
    fromMotherWh: true,
  },
  {
    id: '7',
    orderNumber: 'WO-2026-00050',
    motherWhRef: motherWhRef(21444),
    clientName: ADDON_HOLDING_MUMBAI,
    billCode: '',
    clientType: 'Urgent',
    qty: 12,
    singleRows: 1,
    multiRows: 0,
    status: 'pending',
    flowStage: 'order-created',
    createdAt: '2026-10-11T12:00:00.000Z',
    fromMotherWh: true,
    motherWhSynced: true,
  },
  {
    id: '8',
    orderNumber: 'WO-2026-00048',
    motherWhRef: motherWhRef(21420),
    clientName: ADDON_HOLDING_MUMBAI,
    billCode: '',
    clientType: 'Holding',
    qty: 96,
    singleRows: 2,
    multiRows: 6,
    status: 'dispatched',
    flowStage: 'dispatched',
    createdAt: '2026-10-10T09:30:00.000Z',
    fromMotherWh: true,
    motherWhSynced: true,
  },
];

export const WHM_ORDER_STATUS_LABEL: Record<WhmOrderStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  'in-progress': 'In-Progress',
  packed: 'Packed',
  dispatched: 'Dispatched',
  cancelled: 'Cancelled',
};

export const WHM_FLOW_STAGE_LABEL: Record<string, string> = {
  'order-created': 'Order Created',
  picking: 'Picking',
  scanning: 'Scanning',
  'packing-done': 'Packing done',
  billed: 'Billed',
  'sent-to-billing': 'Sent to billing',
  'ready-to-dispatch': 'Ready to dispatch',
  dispatched: 'Dispatched',
};

export function groupOrdersByDate(orders: WhmWarehouseOrder[]) {
  const map = new Map<string, WhmWarehouseOrder[]>();
  for (const order of orders) {
    const day = order.createdAt.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(order);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateKey, rows]) => {
      const date = new Date(`${dateKey}T12:00:00`);
      const label = date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return { dateKey, label, orders: rows };
    });
}