/** Hand bundle size on single-piece cutting (matches backend `BUNDLE_SIZE`). */
export const SINGLE_PIECE_BUNDLE_SIZE = 60;

/**
 * Mirrors backend `pourGood`: how many bundles seal and what open qty remains after adding good count.
 */
export function projectPourGood(openQty: number, addGood: number): { sealedFull: number; openAfter: number } {
  const steps = projectPourGoodSteps(openQty, 1, addGood);
  const sealedFull = steps.filter((row) => !row.partial).length;
  const partial = steps.find((row) => row.partial);
  return { sealedFull, openAfter: partial?.qty || 0 };
}

export type BundlePourStep = {
  bundleNumber: number;
  qty: number;
  fromOpen: number;
  fromCut: number;
  partial: boolean;
};

/**
 * Step-by-step bundle fill mirroring backend `pourGood`, with real bundle numbers for the UI.
 * @param openQty pcs already in the open bundle
 * @param firstBundleNumber bundle number for the open bundle (or the next bundle when open is empty)
 * @param addGood good qty entered for this cut
 */
export function projectPourGoodSteps(
  openQty: number,
  firstBundleNumber: number,
  addGood: number
): BundlePourStep[] {
  const start = Math.max(0, Math.floor(openQty));
  const add = Math.max(0, Math.floor(addGood));
  if (add <= 0) return [];

  let bundleQty = start;
  let left = add;
  let bundleNumber = Math.max(1, firstBundleNumber);
  const steps: BundlePourStep[] = [];

  while (left > 0) {
    const openAtStart = bundleQty;
    const room = SINGLE_PIECE_BUNDLE_SIZE - bundleQty;
    if (room <= 0) {
      bundleQty = 0;
      bundleNumber += 1;
      continue;
    }
    const take = Math.min(room, left);
    bundleQty += take;
    left -= take;

    if (bundleQty >= SINGLE_PIECE_BUNDLE_SIZE) {
      steps.push({
        bundleNumber,
        qty: SINGLE_PIECE_BUNDLE_SIZE,
        fromOpen: openAtStart,
        fromCut: SINGLE_PIECE_BUNDLE_SIZE - openAtStart,
        partial: false,
      });
      bundleNumber += 1;
      bundleQty = 0;
    }
  }

  if (bundleQty > 0) {
    const openInBundle = steps.length === 0 ? start : 0;
    steps.push({
      bundleNumber,
      qty: bundleQty,
      fromOpen: openInBundle,
      fromCut: bundleQty - openInBundle,
      partial: true,
    });
  }

  return steps;
}

export function formatBundleProjection(sealedFull: number, openAfter: number): string {
  if (sealedFull === 0 && openAfter === 0) return '';
  const parts: string[] = [];
  if (sealedFull > 0) {
    parts.push(`${sealedFull} bundle${sealedFull === 1 ? '' : 's'} of ${SINGLE_PIECE_BUNDLE_SIZE}`);
  }
  if (openAfter > 0) {
    parts.push(`1 bundle of ${openAfter} (partial, sealed after save)`);
  }
  return parts.join(' · ');
}