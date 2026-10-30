'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
import { getThreadCatalog, updateThreadCatalog } from '@/shared/services/threadCatalogService';

/**
 * Edit form for one thread catalog row.
 */
function EditThreadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    threadCode: '',
    threadType: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const fetchThread = async () => {
      try {
        const data = await getThreadCatalog(params.id);
        setFormData({
          threadCode: data.threadCode || '',
          threadType: data.threadType || '',
          status: data.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching thread:', error);
        toast.error('Failed to load thread');
      } finally {
        setIsLoading(false);
      }
    };
    fetchThread();
  }, [params.id]);

  /**
   * Writes one field into form state.
   * @param e - Input or select change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Saves the thread and returns to the list.
   * @param e - Form submit
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.threadCode.trim() || !formData.threadType.trim()) {
      alert('Thread code and thread type are required');
      return;
    }
    const loadingToast = toast.loading('Updating thread...');
    try {
      setIsSaving(true);
      await updateThreadCatalog(params.id, {
        threadCode: formData.threadCode.trim(),
        threadType: formData.threadType.trim(),
        status: formData.status,
      });
      toast.success('Thread updated successfully', { id: loadingToast });
      router.push('/catalog/thread');
    } catch (error) {
      console.error('Error updating thread:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update thread');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content catalog-master-form" role="status" aria-label="Loading thread">
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
        seoTitle="Edit Thread"
        title="Edit Thread"
        listHref="/catalog/thread"
        listLabel="Thread Catalog"
        currentLabel="Edit"
      >
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
          <UiFormFooter submitLabel="Update Thread" isLoading={isSaving} onCancel={() => router.push('/catalog/thread')} />
        </form>
      </CatalogMasterFormPage>
    </>
  );
}

/**
 * Edit page guarded by Thread Catalog update permission.
 */
export default function EditThreadPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Thread Catalog" action="update">
      <EditThreadPage params={params} />
    </RequireCrudPermission>
  );
}
