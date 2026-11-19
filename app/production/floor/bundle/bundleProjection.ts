/** Hand bundle size on single-piece cutting (matches backend `BUNDLE_SIZE`). */
export const SINGLE_PIECE_BUNDLE_SIZE = 60;

/**
 * Mirrors backend `pourGood`: how many bundles seal and what open qty remains after adding good count.
 */
export function projectPourGood(openQty: number, addGood: number): { sealedFull: number; openAfter: number } {
  const start = Math.max(0, Math.floor(openQty));
  const add = Math.max(0, Math.floor(addGood));
  if (add <= 0) {
    return { sealedFull: 0, openAfter: start };
  }

  let bundleQty = start;
  let left = add;
  let sealedFull = 0;

  while (left > 0) {
    if (bundleQty >= SINGLE_PIECE_BUNDLE_SIZE) {
      sealedFull += 1;
      bundleQty = 0;
    }
    const take = Math.min(SINGLE_PIECE_BUNDLE_SIZE - bundleQty, left);
    bundleQty += take;
    left -= take;
    if (bundleQty >= SINGLE_PIECE_BUNDLE_SIZE) {
      sealedFull += 1;
      bundleQty = 0;
    }
  }

  return { sealedFull, openAfter: bundleQty };
}

export function formatBundleProjection(sealedFull: number, openAfter: number): string {
  if (sealedFull === 0 && openAfter === 0) return '';
  const parts: string[] = [];
  if (sealedFull > 0) {
    parts.push(`${sealedFull} bundle${sealedFull === 1 ? '' : 's'} of ${SINGLE_PIECE_BUNDLE_SIZE}`);
  }
  if (openAfter > 0) {
    parts.push(`${openAfter} leftover good (saved for next piece)`);
  }
  return parts.join(' · ');
}