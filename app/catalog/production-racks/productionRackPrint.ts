import { productionFloorLabel } from '@/shared/constants/productionFloors';
import { ProductionRack } from '@/shared/services/phase3CatalogService';
import { RackPrintItem } from '@/shared/utils/qzRackPrint';

/** Label payload for QZ / browser rack printing. */
export function productionRackPrintItem(rack: ProductionRack): RackPrintItem {
  const barcode = (rack.barcode || rack.code || '').trim();
  return {
    rackCode: rack.name || rack.code,
    barcode,
    shelf: rack.code || '—',
    floor: productionFloorLabel(rack.floor) || rack.floor || '—',
    zone: rack.zone || '',
  };
}