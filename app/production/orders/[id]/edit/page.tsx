'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { OrderForm } from '../../OrderForm';

/**
 * Edit a draft in full, or notes and priority after release.
 */
export default function EditProductionOrderPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireCrudPermission path="Production / Orders" action="update">
      <OrderForm orderId={params.id} />
    </RequireCrudPermission>
  );
}
