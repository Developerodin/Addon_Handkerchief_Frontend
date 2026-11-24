import { ADDON_HOLDING_MUMBAI, motherWhRef } from '../../whmDemoConstants';

export interface WhmDispatchOrder {
  id: string;
  orderNumber: string;
  motherWhRef: string;
  clientName: string;
  stage: string;
  challanVehicle: string;
  dispatchedBy?: string;
  dispatchDate?: string;
  tab: 'active' | 'shipped';
}

export const MOCK_DISPATCH_ORDERS: WhmDispatchOrder[] = [
  {
    id: 'd1',
    orderNumber: 'WO-2026-00066',
    motherWhRef: motherWhRef(21624),
    clientName: ADDON_HOLDING_MUMBAI,
    stage: 'Billed',
    challanVehicle: '',
    tab: 'active',
  },
  {
    id: 'd2',
    orderNumber: 'WO-2026-00065',
    motherWhRef: motherWhRef(21622),
    clientName: ADDON_HOLDING_MUMBAI,
    stage: 'Ready to dispatch',
    challanVehicle: '',
    tab: 'active',
  },
  {
    id: 's1',
    orderNumber: 'WO-2026-00048',
    motherWhRef: motherWhRef(21420),
    clientName: ADDON_HOLDING_MUMBAI,
    stage: 'Dispatched',
    challanVehicle: 'Challan DN-2026-0048 · Factory truck',
    dispatchedBy: 'SUPER ADMIN',
    dispatchDate: '2026-10-15',
    tab: 'shipped',
  },
  {
    id: 's2',
    orderNumber: 'WO-2026-00058',
    motherWhRef: motherWhRef(21590),
    clientName: ADDON_HOLDING_MUMBAI,
    stage: 'Partial dispatched',
    challanVehicle: 'Challan DN-2026-0058 · MH-04-AB-1234',
    dispatchedBy: 'Pranjali',
    dispatchDate: '2026-10-12',
    tab: 'shipped',
  },
];