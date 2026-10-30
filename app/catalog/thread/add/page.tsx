'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
import { createThreadCatalog } from '@/shared/services/threadCatalogService';

/**
 * Create form for a thread catalog row.
 */
const AddThreadPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    threadCode: '',
    threadType: '',
    status: 'active' as 'active' | 'inactive',
  });

  /**
   * Writes one field into form state.
   * @param e - Input or select change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Creates the thread and returns to the list.
   * @param e - Form submit
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.threadCode.trim() || !formData.threadType.trim()) {
      alert('Thread code and thread type are required');
      return;
    }
    try {
      setIsLoading(true);
      await createThreadCatalog({
        threadCode: formData.threadCode.trim(),
        threadType: formData.threadType.trim(),
        status: formData.status,
      });
      toast.success('Thread created successfully');
      router.push('/catalog/thread');
    } catch (err) {
      console.error('Error creating thread:', err);
      alert(err instanceof Error ? err.message : 'Failed to create thread');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage seoTitle="Add Thread" title="Add Thread" listHref="/catalog/thread" listLabel="Thread Catalog" currentLabel="Add">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="threadCode" className="form-label required">
              Thread code
            </label>
            <input
              type="text"
              id="threadCode"
              name="threadCode"
              className="form-control"
              placeholder="Thread code"
              value={formData.threadCode}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="threadType" className="form-label required">
              Thread type
            </label>
            <input
              type="text"
              id="threadType"
              name="threadType"
              className="form-control"
              placeholder="Thread type"
              value={formData.threadType}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <UiFormFooter submitLabel="Save Thread" isLoading={isLoading} onCancel={() => router.push('/catalog/thread')} />
        </form>
      </CatalogMasterFormPage>
    </>
  );
};

/**
 * Create page guarded by Thread Catalog create permission.
 */
export default function AddThreadPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Thread Catalog" action="create">
      <AddThreadPage />
    </RequireCrudPermission>
  );
}
