"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
import { STOCK_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import {
  getStorageRack,
  updateStorageRack,
} from '@/shared/services/phase3CatalogService';

function EditStorageRackPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    floor: '',
    zone: '',
    stockType: '' as '' | 'fabric' | 'wip-bundle' | 'finished-carton',
    capacity: '',
    barcode: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const fetchRack = async () => {
      try {
        const data = await getStorageRack(params.id);
        setFormData({
          code: data.code || '',
          name: data.name || '',
          floor: data.floor || '',
          zone: data.zone || '',
          stockType: data.stockType || '',
          capacity: data.capacity !== undefined ? String(data.capacity) : '',
          barcode: data.barcode || '',
          status: data.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching storage rack:', error);
        toast.error('Failed to load storage rack');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRack();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Code and Name are required');
      return;
    }

    const capacity = formData.capacity.trim()
      ? parseInt(formData.capacity, 10)
      : undefined;
    if (formData.capacity.trim() && (isNaN(capacity!) || capacity! < 0)) {
      alert('Capacity must be a valid number (0 or greater)');
      return;
    }

    const loadingToast = toast.loading('Updating storage rack...');
    try {
      setIsSaving(true);
      await updateStorageRack(params.id, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        floor: formData.floor.trim(),
        zone: formData.zone.trim(),
        stockType: formData.stockType || undefined,
        capacity,
        barcode: formData.barcode.trim(),
        status: formData.status,
      });
      toast.success('Storage rack updated successfully', { id: loadingToast });
      router.push('/catalog/storage-racks');
    } catch (error) {
      console.error('Error updating storage rack:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update storage rack');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content catalog-master-form">
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
        seoTitle="Edit Storage Rack"
        title="Edit Storage Rack"
        listHref="/catalog/storage-racks"
        listLabel="Storage Racks"
        currentLabel="Edit"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="code" className="form-label required">Code</label>
            <input type="text" id="code" name="code" className="form-control" value={formData.code} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
            <input type="text" id="name" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="floor" className="form-label">Floor</label>
            <input type="text" id="floor" name="floor" className="form-control" value={formData.floor} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="zone" className="form-label">Zone</label>
            <input type="text" id="zone" name="zone" className="form-control" value={formData.zone} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="stockType" className="form-label">Stock Type</label>
            <select id="stockType" name="stockType" className="form-select" value={formData.stockType} onChange={handleInputChange}>
              <option value="">Select Stock Type</option>
              {STOCK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="capacity" className="form-label">Capacity</label>
            <input type="number" id="capacity" name="capacity" className="form-control" min="0" value={formData.capacity} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="barcode" className="form-label">Barcode</label>
            <input type="text" id="barcode" name="barcode" className="form-control" value={formData.barcode} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="status" className="form-label">Status</label>
            <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <UiFormFooter
            submitLabel="Update Rack"
            isLoading={isSaving}
            onCancel={() => router.push('/catalog/storage-racks')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
}

export default function EditStorageRackPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Storage Racks" action="update">
      <EditStorageRackPage params={params} />
    </RequireCrudPermission>
  );
}
