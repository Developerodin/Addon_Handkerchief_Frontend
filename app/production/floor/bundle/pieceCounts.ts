import { SINGLE_PIECE_BUNDLE_SIZE } from './bundleProjection';

export type PieceCountEntry = {
  /** Each row is one bundle line (usually 60 before seal). */
  bundleLines: number[];
  /** Good pcs kept in the order open bundle for the next piece. */
  leftover: string;
  m4: string;
};

export const emptyPieceCount = (): PieceCountEntry => ({
  bundleLines: [],
  leftover: '',
  m4: '',
});

export function goodQtyFromEntry(entry: PieceCountEntry): number {
  const fromLines = (entry.bundleLines || []).reduce((sum, line) => sum + line, 0);
  const left = Number(entry.leftover);
  const leftover = Number.isInteger(left) && left >= 0 ? left : 0;
  return fromLines + leftover;
}

export function m4QtyFromEntry(entry: PieceCountEntry): number {
  const m4 = Number(entry.m4);
  return Number.isInteger(m4) && m4 >= 0 ? m4 : NaN;
}

/** Bundles of 60 implied by only the bundle line entries (not leftover). */
export function fullSixtiesFromEntry(entry: PieceCountEntry): number {
  return Math.floor((entry.bundleLines || []).reduce((sum, line) => sum + line, 0) / SINGLE_PIECE_BUNDLE_SIZE);
}