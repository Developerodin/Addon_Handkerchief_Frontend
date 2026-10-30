const TOKEN = /^[A-Z0-9]{1,6}$/;
const BLOCK = /^[A-Z]$/;
const MAX_CODES = 500;

export interface RackCodeInput {
  location: string;
  floor: string;
  block: string;
  sectionStart: string;
  sectionCount: string;
  upperCount: string;
  lowerCount: string;
}

export interface RackCodePlan {
  codes: string[];
  error: string;
  location: string;
  floor: string;
  block: string;
  sectionStart: number;
  sectionCount: number;
  upperCount: number;
  lowerCount: number;
}

/**
 * Whole number from a form field. NaN when the text is not an integer.
 */
function readInt(value: string): number {
  if (!/^-?\d+$/.test(value.trim())) return Number.NaN;
  return Number(value.trim());
}

/**
 * Zero-pads a section number or rack index.
 */
function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/**
 * Rejects a range that cannot be generated. Empty string when the numbers are valid.
 */
function rangeError(
  location: string,
  floor: string,
  block: string,
  sectionStart: number,
  sectionCount: number,
  upperCount: number,
  lowerCount: number,
): string {
  if (!TOKEN.test(location)) return 'Location must be letters and numbers';
  if (!TOKEN.test(floor)) return 'Floor must be letters and numbers';
  if (!BLOCK.test(block)) return 'Block must be one letter';
  if (!Number.isInteger(sectionStart) || sectionStart < 1 || sectionStart > 99) return 'First section must be from 1 to 99';
  if (!Number.isInteger(sectionCount) || sectionCount < 1) return 'Enter how many sections';
  if (sectionStart + sectionCount - 1 > 99) return 'Section numbers must stay within 01–99';
  if (!Number.isInteger(upperCount) || upperCount < 0 || upperCount > 99) return 'Upper racks must be from 0 to 99';
  if (!Number.isInteger(lowerCount) || lowerCount < 0 || lowerCount > 99) return 'Lower racks must be from 0 to 99';
  if (!upperCount && !lowerCount) return 'Enter upper racks, lower racks, or both';
  if (sectionCount * (upperCount + lowerCount) > MAX_CODES) return 'Add at most 500 racks at once';
  return '';
}

/**
 * ST-B-A01-U001 codes for one block. Upper and lower each start at 001.
 * Counts are how many of that kind should exist.
 */
export function planRackCodes(input: RackCodeInput): RackCodePlan {
  const location = input.location.trim().toUpperCase().replace(/\s+/g, '');
  const floor = input.floor.trim().toUpperCase().replace(/\s+/g, '');
  const block = input.block.trim().toUpperCase();
  const sectionStart = readInt(input.sectionStart);
  const sectionCount = readInt(input.sectionCount);
  const upperCount = readInt(input.upperCount);
  const lowerCount = readInt(input.lowerCount);
  const error = rangeError(location, floor, block, sectionStart, sectionCount, upperCount, lowerCount);
  const codes: string[] = [];
  if (!error) {
    for (let offset = 0; offset < sectionCount; offset += 1) {
      const section = `${block}${pad(sectionStart + offset, 2)}`;
      for (let index = 1; index <= upperCount; index += 1) {
        codes.push(`${location}-${floor}-${section}-U${pad(index, 3)}`);
      }
      for (let index = 1; index <= lowerCount; index += 1) {
        codes.push(`${location}-${floor}-${section}-L${pad(index, 3)}`);
      }
    }
  }
  return { codes, error, location, floor, block, sectionStart, sectionCount, upperCount, lowerCount };
}
