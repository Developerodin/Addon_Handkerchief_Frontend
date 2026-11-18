import { redirect } from 'next/navigation';

export default function LegacyEditStorageRackPage({ params }: { params: { id: string } }) {
  redirect(`/catalog/production-racks/edit/${params.id}`);
}