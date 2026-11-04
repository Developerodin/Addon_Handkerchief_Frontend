export interface FloorStage {
  slug: string;
  label: string;
  stage: string;
}

/** One sidebar route per floor stage. The console component is shared. */
export const FLOOR_STAGES: FloorStage[] = [
  { slug: 'vertical-cutting', label: 'Vertical cutting', stage: 'vertical-cut' },
  { slug: 'selvage-cutting', label: 'Selvage cutting', stage: 'selvage' },
  { slug: 'half-moon', label: 'Half moon cutting', stage: 'half-moon' },
  { slug: 'vertical-hem', label: 'Vertical hemming', stage: 'vertical-hem' },
  { slug: 'bundle', label: 'Single piece cutting', stage: 'single-piece-cutting' },
  { slug: 'horizontal-hem', label: 'Horizontal hemming', stage: 'horizontal-hem' },
  { slug: 'thread-cut', label: 'Thread cutting', stage: 'thread-cutting' },
  { slug: 'to-ground', label: 'Move to ground', stage: 'to-ground' },
  { slug: 'iron', label: 'Ironing', stage: 'iron' },
  { slug: 'route-split', label: 'Route split', stage: 'route-split' },
  { slug: 'embroidery', label: 'Embroidery', stage: 'embroidery' },
  { slug: 'embroidery-thread-cut', label: 'Thread cutting after embroidery', stage: 'embroidery-thread-cut' },
  { slug: 'sticker', label: 'Sticker', stage: 'sticker' },
  { slug: 'iron-after', label: 'Ironing after route', stage: 'iron-after' },
];

/**
 * @param slug URL segment under /production/floor
 */
export function floorStageBySlug(slug: string): FloorStage | undefined {
  return FLOOR_STAGES.find((stage) => stage.slug === slug);
}
