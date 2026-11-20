import { factoryRequest } from '@/shared/services/factoryApi';
import {
  downloadDispatchChallanDocument,
  printDispatchChallanDocument,
  type DispatchChallanBoxRow,
  type DispatchChallanSnapshot,
} from '@/shared/utils/dispatchChallanPrint';

/** @deprecated use DispatchChallanBoxRow — kept for order drawer lists */
export interface DispatchChallanBox {
  barcode: string;
  pieceQty: number;
  bundleCount: number;
  scaleWeight: number;
  rackCode?: string;
  vehicleNumber?: string;
}

export interface DispatchChallanOrder {
  orderNumber: string;
  buyer?: string;
  targetQty: number;
  dispatchedQty: number;
  dispatchStatus: string;
}

export interface ShipmentChallanSource {
  id?: string;
  productionOrderId?: string;
  shipmentCode: string;
  challanNumber?: string;
  orderNumber: string;
  buyer?: string;
  vehicleNumber?: string;
  pieceQty: number;
  status: string;
  dispatchedAt?: string | null;
  targetQty?: number;
  dispatchedQty?: number;
  boxLines: { boxBarcode: string; pieceQty: number; scaleWeight: number; rackCode?: string }[];
}

function snapshotFromShipment(shipment: ShipmentChallanSource): DispatchChallanSnapshot {
  const lines = shipment.boxLines || [];
  const boxes: DispatchChallanBoxRow[] = lines.map((line) => ({
    barcode: line.boxBarcode,
    pieceQty: line.pieceQty,
    scaleWeight: line.scaleWeight,
    rackCode: line.rackCode,
    vehicleNumber: shipment.vehicleNumber,
  }));
  return {
    challanNumber: shipment.challanNumber || shipment.shipmentCode,
    shipmentCode: shipment.shipmentCode,
    dispatchDate: shipment.dispatchedAt || new Date(),
    orderNumber: shipment.orderNumber || '—',
    buyer: shipment.buyer,
    vehicleNumber: shipment.vehicleNumber,
    dispatchStatus: shipment.status,
    targetQty: shipment.targetQty,
    dispatchedQty: shipment.dispatchedQty ?? shipment.pieceQty,
    boxes,
  };
}

async function enrichShipmentRecord(shipment: ShipmentChallanSource): Promise<ShipmentChallanSource> {
  let record = shipment;
  if ((!record.boxLines || !record.boxLines.length) && shipment.id) {
    record = await factoryRequest<ShipmentChallanSource>(`/warehouse/dispatch/shipments/${shipment.id}`);
  }
  if (record.productionOrderId && (record.targetQty == null || record.dispatchedQty == null)) {
    const pack = await factoryRequest<{ order: DispatchChallanOrder }>(`/warehouse/dispatch/order/${record.productionOrderId}`);
    record = {
      ...record,
      targetQty: pack.order.targetQty,
      dispatchedQty: pack.order.dispatchedQty,
      status: record.status || pack.order.dispatchStatus,
      buyer: record.buyer || pack.order.buyer,
      orderNumber: record.orderNumber || pack.order.orderNumber,
    };
  }
  return record;
}

/** GRN-style delivery challan print for one dispatch batch. */
export async function printShipmentBatchChallanById(shipment: ShipmentChallanSource) {
  await printDispatchChallanDocument(snapshotFromShipment(await enrichShipmentRecord(shipment)));
}

/** Download HTML challan (same layout as print). */
export async function downloadShipmentBatchChallan(shipment: ShipmentChallanSource) {
  await downloadDispatchChallanDocument(snapshotFromShipment(await enrichShipmentRecord(shipment)));
}

/** Legacy hook — builds a single-batch snapshot from order + box list (open note). */
export async function printDispatchChallan(order: DispatchChallanOrder, boxes: DispatchChallanBox[]) {
  await printDispatchChallanDocument({
    challanNumber: order.orderNumber,
    shipmentCode: 'NOTE',
    dispatchDate: new Date(),
    orderNumber: order.orderNumber,
    buyer: order.buyer,
    dispatchStatus: order.dispatchStatus,
    targetQty: order.targetQty,
    dispatchedQty: order.dispatchedQty,
    boxes: boxes.map((row) => ({
      barcode: row.barcode,
      pieceQty: row.pieceQty,
      scaleWeight: row.scaleWeight,
      rackCode: row.rackCode,
      vehicleNumber: row.vehicleNumber,
    })),
  });
}

export async function downloadDispatchChallan(order: DispatchChallanOrder, boxes: DispatchChallanBox[]) {
  await downloadDispatchChallanDocument({
    challanNumber: order.orderNumber,
    shipmentCode: 'NOTE',
    dispatchDate: new Date(),
    orderNumber: order.orderNumber,
    buyer: order.buyer,
    dispatchStatus: order.dispatchStatus,
    targetQty: order.targetQty,
    dispatchedQty: order.dispatchedQty,
    boxes: boxes.map((row) => ({
      barcode: row.barcode,
      pieceQty: row.pieceQty,
      scaleWeight: row.scaleWeight,
      rackCode: row.rackCode,
      vehicleNumber: row.vehicleNumber,
    })),
  });
}