import { redirect } from 'next/navigation';

export default function LegacyAddStorageRackPage() {
  redirect('/catalog/production-racks/add');
}