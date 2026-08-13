"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { STOCK_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { createStorageRack } from '@/shared/services/phase3CatalogService';

const AddStorageRackPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsLoading(true);
      await createStorageRack({
        code: formData.code.trim(),
        name: formData.name.trim(),
        floor: formData.floor.trim(),
        zone: formData.zone.trim(),
        stockType: formData.stockType || undefined,
        capacity,
        barcode: formData.barcode.trim(),
        status: formData.status,
      });
      toast.success('Storage rack created successfully');
      router.push('/catalog/storage-racks');
    } catch (err) {
      console.error('Error creating storage rack:', err);
      alert(err instanceof Error ? err.message : 'Failed to create storage rack');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Storage Rack" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Storage Rack</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link
                      href="/catalog/storage-racks"
                      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                    >
                      <i className="ri-home-line mr-2"></i>
                      Storage Racks
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add Storage Rack</span>
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
                    <input type="text" id="code" name="code" className="form-control" placeholder="Rack code" value={formData.code} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Name *</label>
                    <input type="text" id="name" name="name" className="form-control" placeholder="Rack name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="floor" className="form-label">Floor</label>
                    <input type="text" id="floor" name="floor" className="form-control" placeholder="Floor" value={formData.floor} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="zone" className="form-label">Zone</label>
                    <input type="text" id="zone" name="zone" className="form-control" placeholder="Zone" value={formData.zone} onChange={handleInputChange} />
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
                    <input type="number" id="capacity" name="capacity" className="form-control" min="0" placeholder="Capacity" value={formData.capacity} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="barcode" className="form-label">Barcode</label>
                    <input type="text" id="barcode" name="barcode" className="form-control" placeholder="Barcode" value={formData.barcode} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Rack'}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/catalog/storage-racks')}
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

export default function AddStorageRackPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Storage Racks" action="create">
      <AddStorageRackPage />
    </RequireCrudPermission>
  );
}
