"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
import { PROCESS_DEPARTMENTS, CONTAINER_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { createContainer, Container } from '@/shared/services/phase3CatalogService';

const AddContainerPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '' as Container['type'] | '',
    capacity: '',
    barcode: '',
    department: '',
    floor: '',
    reusable: false,
    status: 'active' as 'active' | 'inactive',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Code and Name are required');
      return;
    }

    const capacity =
      formData.capacity.trim() === '' ? undefined : parseInt(formData.capacity, 10);
    if (formData.capacity.trim() !== '' && (isNaN(capacity!) || capacity! < 0)) {
      alert('Capacity must be a valid number (0 or greater)');
      return;
    }

    try {
      setIsLoading(true);
      await createContainer({
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type || undefined,
        capacity,
        barcode: formData.barcode.trim(),
        department: formData.department.trim(),
        floor: formData.floor.trim(),
        reusable: formData.reusable,
        status: formData.status,
      });
      toast.success('Container created successfully');
      router.push('/catalog/containers');
    } catch (err) {
      console.error('Error creating container:', err);
      alert(err instanceof Error ? err.message : 'Failed to create container');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Add Container"
        title="Add Container"
        listHref="/catalog/containers"
        listLabel="Containers"
        currentLabel="Add"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="code" className="form-label required">Code</label>
            <input type="text" id="code" name="code" className="form-control" placeholder="Container code" value={formData.code} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
            <input type="text" id="name" name="name" className="form-control" placeholder="Container name" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="type" className="form-label">Type</label>
            <select id="type" name="type" className="form-select" value={formData.type} onChange={handleInputChange}>
              <option value="">Select Type</option>
              {CONTAINER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="capacity" className="form-label">Capacity</label>
            <input type="number" id="capacity" name="capacity" className="form-control" min="0" placeholder="Capacity" value={formData.capacity} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="barcode" className="form-label">Barcode</label>
            <input type="text" id="barcode" name="barcode" className="form-control" placeholder="Barcode" value={formData.barcode} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="department" className="form-label">Department</label>
            <select id="department" name="department" className="form-select" value={formData.department} onChange={handleInputChange}>
              {PROCESS_DEPARTMENTS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="floor" className="form-label">Floor</label>
            <input type="text" id="floor" name="floor" className="form-control" placeholder="Floor" value={formData.floor} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="status" className="form-label">Status</label>
            <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              id="reusable"
              name="reusable"
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
              checked={formData.reusable}
              onChange={handleInputChange}
            />
            <label htmlFor="reusable" className="form-label mb-0">Reusable</label>
          </div>
          <UiFormFooter
            submitLabel="Save Container"
            isLoading={isLoading}
            onCancel={() => router.push('/catalog/containers')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
};

export default function AddContainerPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Containers Master" action="create">
      <AddContainerPage />
    </RequireCrudPermission>
  );
}
