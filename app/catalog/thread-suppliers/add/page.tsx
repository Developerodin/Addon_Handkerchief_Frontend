'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import {
  emptyThreadSupplierForm,
  ThreadSupplierForm,
  toThreadSupplierPayload,
} from '@/shared/components/catalog/ThreadSupplierForm';
import { createThreadSupplier, ThreadSupplierThreadDetail } from '@/shared/services/threadSupplierService';

/**
 * Create page for a thread supplier.
 */
const AddThreadSupplierPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [threadDetails, setThreadDetails] = useState<ThreadSupplierThreadDetail[]>([]);
  const [formData, setFormData] = useState(emptyThreadSupplierForm);

  /**
   * Writes one field into form state.
   * @param e - Input, select, or textarea change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Creates the supplier and returns to the list.
   * @param e - Form submit
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contactPerson.trim() || !formData.address.trim()) {
      alert('Name, Contact Person, and Address are required');
      return;
    }
    if (threadDetails.some((detail) => !detail.threadCatalogId)) {
      alert('Each thread detail must have a thread selected');
      return;
    }
    try {
      setIsLoading(true);
      await createThreadSupplier(toThreadSupplierPayload(formData, threadDetails));
      toast.success('Thread supplier created successfully');
      router.push('/catalog/thread-suppliers');
    } catch (err) {
      console.error('Error creating thread supplier:', err);
      alert(err instanceof Error ? err.message : 'Failed to create thread supplier');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Add Thread Supplier"
        title="Add Supplier"
        listHref="/catalog/thread-suppliers"
        listLabel="Thread Suppliers"
        currentLabel="Add"
      >
        <ThreadSupplierForm
          formData={formData}
          threadDetails={threadDetails}
          isLoading={isLoading}
          submitLabel="Save Supplier"
          onChange={handleInputChange}
          onThreadDetailsChange={setThreadDetails}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/catalog/thread-suppliers')}
        />
      </CatalogMasterFormPage>
    </>
  );
};

/**
 * Create page guarded by Thread Suppliers create permission.
 */
export default function AddThreadSupplierPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Thread Suppliers" action="create">
      <AddThreadSupplierPage />
    </RequireCrudPermission>
  );
}
