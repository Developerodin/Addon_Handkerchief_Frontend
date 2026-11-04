import { redirect } from 'next/navigation';

/**
 * Keeps the old Selvage URL pointed at Selvage cutting.
 */
export default function SelvageRedirectPage() {
  redirect('/production/floor/selvage-cutting');
}
