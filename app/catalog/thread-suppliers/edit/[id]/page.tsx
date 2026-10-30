'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import {
  emptyThreadSupplierForm,
  ThreadSupplierForm,
  ThreadSupplierFormState,
  toThreadSupplierPayload,
} from '@/shared/components/catalog/ThreadSupplierForm';
import {
  getThreadSupplier,
  ThreadSupplierThreadDetail,
  updateThreadSupplier,
} from '@/shared/services/threadSupplierService';
import { getThreadCatalogId } from '@/shared/services/threadCatalogService';

/**
 * Maps stored thread lines onto the form, including populated catalog ids.
 * @param details - Lines returned by the API
 */
function mapThreadDetailsFromApi(details: unknown[] | undefined): ThreadSupplierThreadDetail[] {
  if (!Array.isArray(details)) return [];
  return details.map((detail) => {
    const row = detail as ThreadSupplierThreadDetail & {
      threadCatalogId?: string | { id?: string; _id?: string };
    };
    return {
      threadCatalogId: getThreadCatalogId(row.threadCatalogId),
      threadCode: row.threadCode || '',
      threadType: row.threadType || '',
    };
  });
}

/**
 * Edit page for one thread supplier.
 */
function EditThreadSupplierPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [threadDetails, setThreadDetails] = useState<ThreadSupplierThreadDetail[]>([]);
  const [formData, setFormData] = useState<ThreadSupplierFormState>(emptyThreadSupplierForm);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const data = await getThreadSupplier(params.id);
        setFormData({
          name: data.name || '',
          contactPerson: data.contactPerson || '',
          contactNumber: data.contactNumber || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          country: data.country || 'India',
          gstin: data.gstin || '',
          paymentTerms: data.paymentTerms || '',
          bankName: data.bankDetails?.bankName || '',
          accountHolder: data.bankDetails?.accountHolder || '',
          accountNumber: data.bankDetails?.accountNumber || '',
          ifsc: data.bankDetails?.ifsc || '',
          status: data.status || 'active',
        });
        setThreadDetails(mapThreadDetailsFromApi(data.threadDetails));
      } catch (error) {
        console.error('Error fetching thread supplier:', error);
        toast.error('Failed to load thread supplier');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSupplier();
  }, [params.id]);

  /**
   * Writes one field into form state.
   * @param e - Input, select, or textarea change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Saves the supplier and returns to the list.
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
    const loadingToast = toast.loading('Updating thread supplier...');
    try {
      setIsSaving(true);
      await updateThreadSupplier(params.id, toThreadSupplierPayload(formData, threadDetails));
      toast.success('Thread supplier updated successfully', { id: loadingToast });
      router.push('/catalog/thread-suppliers');
    } catch (error) {
      console.error('Error updating thread supplier:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update thread supplier');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content catalog-master-form" role="status" aria-label="Loading thread supplier">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Edit Thread Supplier"
        title="Edit Supplier"
        listHref="/catalog/thread-suppliers"
        listLabel="Thread Suppliers"
        currentLabel="Edit"
      >
        <ThreadSupplierForm
          formData={formData}
          threadDetails={threadDetails}
          isLoading={isSaving}
          submitLabel="Update Supplier"
          onChange={handleInputChange}
          onThreadDetailsChange={setThreadDetails}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/catalog/thread-suppliers')}
        />
      </CatalogMasterFormPage>
    </>
  );
}

/**
 * Edit page guarded by Thread Suppliers update permission.
 */
export default function EditThreadSupplierPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Thread Suppliers" action="update">
      <EditThreadSupplierPage params={params} />
    </RequireCrudPermission>
  );
}
