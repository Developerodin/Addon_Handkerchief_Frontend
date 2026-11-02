const TOKEN = /^[A-Z0-9]{1,6}$/;
const SECTION = /^[A-Z]$/;
const MAX_CODES = 500;

export interface RackCodeInput {
  location: string;
  floor: string;
  block: string;
  sectionStart: string;
  sectionCount: string;
  rackCount: string;
}

export interface RackCodePlan {
  codes: string[];
  error: string;
  location: string;
  floor: string;
  block: string;
  sectionStart: string;
  sectionCount: number;
  rackCount: number;
}

/**
 * Whole number from a form field. NaN when the text is not an integer.
 */
function readInt(value: string): number {
  if (!/^-?\d+$/.test(value.trim())) return Number.NaN;
  return Number(value.trim());
}

/**
 * Zero-pads a block number or rack index.
 */
function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/**
 * Block digits stored as three characters. "1" and "001" both become "001".
 * Empty string when the text is not 001–999.
 */
function normalizeBlock(value: string): string {
  const digits = value.trim();
  if (!/^\d{1,3}$/.test(digits)) return '';
  const number = Number(digits);
  if (number < 1 || number > 999) return '';
  return pad(number, 3);
}

/**
 * Rejects a range that cannot be generated. Empty string when the values are valid.
 */
function rangeError(
  location: string,
  floor: string,
  block: string,
  sectionStart: string,
  sectionCount: number,
  rackCount: number,
): string {
  if (!TOKEN.test(location)) return 'Location must be letters and numbers';
  if (!TOKEN.test(floor)) return 'Floor must be letters and numbers';
  if (!block) return 'Block must be from 001 to 999';
  if (!SECTION.test(sectionStart)) return 'First section must be one letter';
  if (!Number.isInteger(sectionCount) || sectionCount < 1) return 'Enter how many sections';
  const last = sectionStart.charCodeAt(0) + sectionCount - 1;
  if (last > 'Z'.charCodeAt(0)) return 'Section letters must stay within A–Z';
  if (!Number.isInteger(rackCount) || rackCount < 1 || rackCount > 99) return 'Racks per section must be from 1 to 99';
  if (sectionCount * rackCount > MAX_CODES) return 'Add at most 500 racks at once';
  return '';
}

/**
 * ST-B-001-A01 codes for one block. Section letters run from the first letter.
 * Rack indexes start at 01 and the count is how many should exist in each section.
 */
export function planRackCodes(input: RackCodeInput): RackCodePlan {
  const location = input.location.trim().toUpperCase().replace(/\s+/g, '');
  const floor = input.floor.trim().toUpperCase().replace(/\s+/g, '');
  const block = normalizeBlock(input.block);
  const sectionStart = input.sectionStart.trim().toUpperCase();
  const sectionCount = readInt(input.sectionCount);
  const rackCount = readInt(input.rackCount);
  const error = rangeError(location, floor, block, sectionStart, sectionCount, rackCount);
  const codes: string[] = [];
  if (!error) {
    const start = sectionStart.charCodeAt(0);
    for (let offset = 0; offset < sectionCount; offset += 1) {
      const section = String.fromCharCode(start + offset);
      for (let index = 1; index <= rackCount; index += 1) {
        codes.push(`${location}-${floor}-${block}-${section}${pad(index, 2)}`);
      }
    }
  }
  return { codes, error, location, floor, block, sectionStart, sectionCount, rackCount };
}
