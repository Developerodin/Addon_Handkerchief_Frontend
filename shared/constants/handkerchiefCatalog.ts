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
