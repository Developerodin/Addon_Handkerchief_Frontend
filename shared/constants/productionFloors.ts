import { FLOOR_STAGES } from './factoryStages';

export type EquipmentRole = 'machine' | 'table';

export interface ProductionFloorOption {
  value: string;
  label: string;
}

const QC_FLOORS: ProductionFloorOption[] = [
  { value: 'floor-check', label: 'Floor checks' },
  { value: 'final-qc', label: 'Final QC' },
  { value: 'final-checking', label: 'Final checking' },
];

/** Production stage codes for machine.floor (matches Process.floor in seed). */
export const PRODUCTION_FLOOR_OPTIONS: ProductionFloorOption[] = [
  ...FLOOR_STAGES.map((row) => ({ value: row.stage, label: row.label })),
  ...QC_FLOORS,
];

export const EQUIPMENT_ROLE_OPTIONS: { value: EquipmentRole; label: string }[] = [
  { value: 'machine', label: 'Machine' },
  { value: 'table', label: 'Table' },
];

export function productionFloorLabel(code?: string): string {
  if (!code) return '';
  return PRODUCTION_FLOOR_OPTIONS.find((row) => row.value === code)?.label || code;
}

/** Floors where either machine or table may be used (no equipmentRole API filter). */
const FLOOR_ALLOWS_BOTH = new Set(['selvage', 'half-moon']);

const STAGE_DEFAULT_ROLE: Partial<Record<string, EquipmentRole>> = {
  'vertical-cut': 'machine',
  'single-piece-cutting': 'table',
  'thread-cutting': 'table',
  'horizontal-hem': 'table',
  'vertical-hem': 'machine',
  iron: 'machine',
  'iron-after': 'machine',
  embroidery: 'machine',
  'embroidery-thread-cut': 'table',
  sticker: 'table',
};

/**
 * Query filters for listing catalog equipment on a production console.
 */
export function floorEquipmentFilter(
  floorStage: string,
  stationLabel?: string
): { floor: string; equipmentRole?: EquipmentRole } {
  if (FLOOR_ALLOWS_BOTH.has(floorStage)) {
    return { floor: floorStage };
  }

  const label = (stationLabel || '').toLowerCase();
  if (label === 'table') {
    return { floor: floorStage, equipmentRole: 'table' };
  }
  if (label === 'machine' || label === 'iron') {
    return { floor: floorStage, equipmentRole: 'machine' };
  }

  const role = STAGE_DEFAULT_ROLE[floorStage];
  if (role) {
    return { floor: floorStage, equipmentRole: role };
  }

  return { floor: floorStage, equipmentRole: 'machine' };
}