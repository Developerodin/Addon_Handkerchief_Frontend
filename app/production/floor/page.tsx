'use client';

import Link from 'next/link';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { FLOOR_STAGES } from '@/shared/constants/factoryStages';

export default function FloorIndexPage() {
  return (
    <RequireCrudPermission path="Production / Floor" action="read">
      <CatalogMasterFormPage seoTitle="Floor" title="Floor stages" listHref="/production/orders" listLabel="Production orders" currentLabel="Floor">
        <ul className="grid gap-2 p-4">
          {FLOOR_STAGES.map((stage) => (
            <li key={stage.slug}>
              <Link className="text-primary" href={`/production/floor/${stage.slug}`}>
                {stage.label}
              </Link>
            </li>
          ))}
        </ul>
      </CatalogMasterFormPage>
    </RequireCrudPermission>
  );
}
