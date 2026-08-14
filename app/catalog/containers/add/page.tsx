"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
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
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Add Container" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Container</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link
                      href="/catalog/containers"
                      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                    >
                      <i className="ri-home-line mr-2"></i>
                      Containers
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add Container</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="code" className="form-label">Code *</label>
                    <input type="text" id="code" name="code" className="form-control" placeholder="Container code" value={formData.code} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Name *</label>
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

                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Container'}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/catalog/containers')}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AddContainerPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Containers Master" action="create">
      <AddContainerPage />
    </RequireCrudPermission>
  );
}
