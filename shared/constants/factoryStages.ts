export interface FloorStage {
  slug: string;
  label: string;
  stage: string;
}

/** One sidebar route per floor stage. The console component is shared. */
export const FLOOR_STAGES: FloorStage[] = [
  { slug: 'cut', label: 'Cut', stage: 'vertical-cut' },
  { slug: 'selvage', label: 'Selvage', stage: 'selvage' },
  { slug: 'half-moon', label: 'Half moon', stage: 'half-moon' },
  { slug: 'vertical-hem', label: 'Vertical hem', stage: 'vertical-hem' },
  { slug: 'bundle', label: 'Bundle', stage: 'single-piece-cutting' },
  { slug: 'horizontal-hem', label: 'Horizontal hem', stage: 'horizontal-hem' },
  { slug: 'thread-cut', label: 'Thread cut', stage: 'thread-cutting' },
  { slug: 'iron', label: 'Iron', stage: 'iron' },
  { slug: 'route-split', label: 'Route split', stage: 'route-split' },
  { slug: 'embroidery', label: 'Embroidery', stage: 'embroidery' },
  { slug: 'sticker', label: 'Sticker', stage: 'sticker' },
];

/**
 * @param slug URL segment under /production/floor
 */
export function floorStageBySlug(slug: string): FloorStage | undefined {
  return FLOOR_STAGES.find((stage) => stage.slug === slug);
}
