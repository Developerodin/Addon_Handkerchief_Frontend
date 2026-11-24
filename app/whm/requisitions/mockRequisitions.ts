export type WhmRequisitionWorkflow =
  | 'in_requisition'
  | 'sent_to_draft'
  | 'order_placed'
  | 'order_created'
  | 'dismissed';

export type WhmRequisitionPriority = 'urgent' | 'medium' | 'low';

export interface WhmRequisitionRow {
  id: string;
  materialName: string;
  qty: number;
  liveInventory: number;
  draftPoQuantity: number | null;
  priority: WhmRequisitionPriority;
  workflowStage: WhmRequisitionWorkflow;
  lastUpdated: string;
}

export const DEMO_REQUISITION_TOTAL = 28;

export const INITIAL_REQUISITION_ROWS: WhmRequisitionRow[] = [
  {
    id: 'r1',
    materialName: 'Carton — 12-pack white (HK)',
    qty: 500,
    liveInventory: 120,
    draftPoQuantity: null,
    priority: 'urgent',
    workflowStage: 'in_requisition',
    lastUpdated: '2026-11-24T05:33:00.000Z',
  },
  {
    id: 'r2',
    materialName: 'Header card — plain hem series',
    qty: 2000,
    liveInventory: 1450,
    draftPoQuantity: null,
    priority: 'low',
    workflowStage: 'in_requisition',
    lastUpdated: '2026-11-24T05:33:00.000Z',
  },
  {
    id: 'r3',
    materialName: 'Barcode sticker roll (box label)',
    qty: 50,
    liveInventory: 12,
    draftPoQuantity: null,
    priority: 'urgent',
    workflowStage: 'in_requisition',
    lastUpdated: '2026-11-24T05:33:00.000Z',
  },
  {
    id: 'r4',
    materialName: 'PP tape — brown 48mm',
    qty: 100,
    liveInventory: 88,
    draftPoQuantity: null,
    priority: 'medium',
    workflowStage: 'in_requisition',
    lastUpdated: '2026-11-24T05:33:00.000Z',
  },
  {
    id: 'r5',
    materialName: 'Outer shipper — master carton 60×40',
    qty: 200,
    liveInventory: 190,
    draftPoQuantity: 150,
    priority: 'low',
    workflowStage: 'sent_to_draft',
    lastUpdated: '2026-11-23T14:20:00.000Z',
  },
  {
    id: 'r6',
    materialName: 'Tissue wrap — printed logo',
    qty: 800,
    liveInventory: 420,
    draftPoQuantity: 200,
    priority: 'medium',
    workflowStage: 'order_placed',
    lastUpdated: '2026-11-22T10:15:00.000Z',
  },
];

/** @deprecated Use INITIAL_REQUISITION_ROWS — page keeps live state in React. */
export const MOCK_REQUISITION_ROWS = INITIAL_REQUISITION_ROWS;

export function formatUnits(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function workflowStageLabel(stage: WhmRequisitionWorkflow) {
  switch (stage) {
    case 'in_requisition':
      return 'In requisition';
    case 'sent_to_draft':
      return 'Sent to draft';
    case 'order_placed':
      return 'Order placed';
    case 'order_created':
      return 'Order created';
    case 'dismissed':
      return 'Dismissed';
    default:
      return stage;
  }
}

export function canSelectForOrder(row: WhmRequisitionRow) {
  return row.workflowStage === 'in_requisition' || row.workflowStage === 'sent_to_draft';
}

export function priorityLabel(priority: WhmRequisitionPriority) {
  switch (priority) {
    case 'urgent':
      return 'Urgent';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return priority;
  }
}