import { redirect } from 'next/navigation';

/** Legacy URL — fabric racks are managed under Store; floor racks use Production Racks. */
export default function LegacyStorageRacksPage() {
  redirect('/catalog/production-racks');
}