import { FabricCatalog } from '@/shared/services/fabricCatalogService';
import { FabricMeasurementLookup } from '@/shared/services/fabricLookupService';
import {
  FabricPoLine,
  defaultMeterUnit,
  fabricColorLabel,
  fabricCountLabel,
  fabricTypeLabel,
  gstNumber,
} from './purchaseOrderFormModel';

/**
 * Line after a fabric-name keystroke. An exact catalog name keeps the snapshot.
 */
export function lineAfterQuery(line: FabricPoLine, query: string, matches: FabricCatalog[]): FabricPoLine {
  const exact = matches.some((fabric) => fabric.name.toLowerCase() === query.trim().toLowerCase());
  if (exact && line.fabricName && line.fabricName.toLowerCase() === query.trim().toLowerCase()) {
    return { ...line, query };
  }
  return {
    ...line,
    query,
    fabricId: exact ? line.fabricId : '',
    fabricName: exact ? line.fabricName : '',
    fabricTypeName: exact ? line.fabricTypeName : '',
    colourName: exact ? line.colourName : '',
    fabricSortNo: exact ? line.fabricSortNo : '',
    millOldFabricSortNo: exact ? line.millOldFabricSortNo : '',
    millNewFabricSortNo: exact ? line.millNewFabricSortNo : '',
    countName: exact ? line.countName : '',
    unmatched: query.trim().length > 0 && matches.length === 0,
  };
}

/**
 * Copies catalog fields onto the line. The unit stays unless the row has none yet.
 */
export function lineAfterPick(line: FabricPoLine, fabric: FabricCatalog, units: FabricMeasurementLookup[]): FabricPoLine {
  const meter = !line.unitId ? defaultMeterUnit(units) : null;
  return {
    ...line,
    query: fabric.name,
    fabricId: fabric.id,
    fabricName: fabric.name,
    fabricTypeName: fabricTypeLabel(fabric),
    colourName: fabricColorLabel(fabric),
    fabricSortNo: fabric.fabricSortNo || '',
    millOldFabricSortNo: fabric.millOldFabricSortNo || '',
    millNewFabricSortNo: fabric.millNewFabricSortNo || '',
    countName: fabricCountLabel(fabric),
    rate: fabric.rate != null ? String(fabric.rate) : '',
    gstPercent: gstNumber(fabric.gst),
    unmatched: false,
    ...(meter ? { unitId: meter.unitId, unitName: meter.unitName } : {}),
  };
}
