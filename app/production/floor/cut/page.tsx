import { redirect } from 'next/navigation';

/**
 * Keeps the old Cut URL pointed at Vertical cutting.
 */
export default function CutRedirectPage() {
  redirect('/production/floor/vertical-cutting');
}
