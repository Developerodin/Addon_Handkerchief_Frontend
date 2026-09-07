export const PROCESS_DEPARTMENTS = [
  { value: '', label: 'Select Department' },
  { value: 'store', label: 'Store' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'hemming', label: 'Hemming' },
  { value: 'checking', label: 'Checking' },
  { value: 'ironing', label: 'Ironing' },
  { value: 'packing', label: 'Packing' },
  { value: 'dispatch', label: 'Dispatch' },
  { value: 'embroidery', label: 'Embroidery' },
];

export const MACHINE_TYPE_OPTIONS = [
  { value: '', label: 'Select Machine Type' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'half-moon', label: 'Half-moon' },
  { value: 'vertical-hemming', label: 'Vertical Hemming' },
  { value: 'horizontal-hemming', label: 'Horizontal Hemming' },
  { value: 'embroidery', label: 'Embroidery' },
  { value: 'ironing', label: 'Ironing' },
];

export const STOCK_TYPE_OPTIONS = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'wip-bundle', label: 'WIP Bundle' },
  { value: 'finished-carton', label: 'Finished Carton' },
];

export const CONTAINER_TYPE_OPTIONS = [
  { value: 'bundle', label: 'Bundle' },
  { value: 'carton', label: 'Carton' },
  { value: 'trolley', label: 'Trolley' },
  { value: 'crate', label: 'Crate' },
];

export const LABEL_TYPE_OPTIONS = [
  { value: 'fabric-roll', label: 'Fabric Roll' },
  { value: 'bundle-sticker', label: 'Bundle Sticker' },
  { value: 'carton', label: 'Carton' },
  { value: 'style-ean', label: 'Style EAN' },
];

export const DEVICE_TYPE_OPTIONS = [
  { value: 'printer', label: 'Printer' },
  { value: 'scanner', label: 'Scanner' },
];

export const SCANNER_TYPE_OPTIONS = [
  { value: '', label: 'N/A' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'fixed', label: 'Fixed' },
];

/** Common weave types used in handkerchief fabric catalog */
export const FABRIC_WEAVE_OPTIONS = [
  { value: 'Plain', label: 'Plain' },
  { value: 'Twill', label: 'Twill' },
  { value: 'Herringbone', label: 'Herringbone' },
  { value: 'Dobby', label: 'Dobby' },
  { value: 'Jacquard', label: 'Jacquard' },
  { value: 'Satin', label: 'Satin' },
  { value: 'Oxford', label: 'Oxford' },
  { value: 'Poplin', label: 'Poplin' },
  { value: 'Huckaback', label: 'Huckaback' },
  { value: 'Gauze', label: 'Gauze' },
  { value: 'Cambric', label: 'Cambric' },
  { value: 'Basket Weave', label: 'Basket Weave' },
];

export function getFabricWeaveSelectOptions(currentValue?: string) {
  const trimmed = currentValue?.trim();
  if (!trimmed || FABRIC_WEAVE_OPTIONS.some((option) => option.value === trimmed)) {
    return FABRIC_WEAVE_OPTIONS;
  }
  return [...FABRIC_WEAVE_OPTIONS, { value: trimmed, label: trimmed }];
}

export const FABRIC_DESIGN_OPTIONS = [
  { value: '', label: 'Select Design' },
  { value: 'Plain', label: 'Plain' },
  { value: 'Print', label: 'Print' },
] as const;

export const FABRIC_WASH_OPTIONS = [
  { value: '', label: 'Select Wash' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
] as const;

export const FABRIC_FINISH_OPTIONS = [
  { value: '', label: 'Select Finish' },
  { value: 'NA', label: 'NA' },
  { value: 'N9', label: 'N9' },
  { value: 'Silverdor', label: 'Silverdor' },
  { value: 'Anti Micobacterial', label: 'Anti Micobacterial' },
] as const;

export type FabricDesignValue = (typeof FABRIC_DESIGN_OPTIONS)[number]['value'];
export type FabricWashValue = (typeof FABRIC_WASH_OPTIONS)[number]['value'];
export type FabricFinishValue = (typeof FABRIC_FINISH_OPTIONS)[number]['value'];

function normalizeEnumValue(
  value: string | undefined,
  allowed: readonly { value: string; label: string }[],
  fieldLabel: string
): string {
  const trimmed = value?.toString().trim() ?? '';
  if (!trimmed) return '';
  const match = allowed.find(
    (option) => option.value && option.value.toLowerCase() === trimmed.toLowerCase()
  );
  if (!match?.value) {
    throw new Error(`Invalid ${fieldLabel}: "${trimmed}"`);
  }
  return match.value;
}

export function normalizeFabricDesign(value?: string): string {
  return normalizeEnumValue(value, FABRIC_DESIGN_OPTIONS, 'Design');
}

export function normalizeFabricWash(value?: string): string {
  return normalizeEnumValue(value, FABRIC_WASH_OPTIONS, 'Wash');
}

export function normalizeFabricFinish(value?: string): string {
  return normalizeEnumValue(value, FABRIC_FINISH_OPTIONS, 'Finish');
}
