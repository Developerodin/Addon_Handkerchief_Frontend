'use client';

import React from 'react';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { OrderForm } from '../OrderForm';

/**
 * Draft production order. Release happens on the edit page after the pin preview.
 */
export default function AddProductionOrderPage() {
  return (
    <RequireCrudPermission path="Production / Orders" action="create">
      <OrderForm />
    </RequireCrudPermission>
  );
}
