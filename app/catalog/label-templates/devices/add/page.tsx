"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { DEVICE_TYPE_OPTIONS, SCANNER_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { createDeviceRegistry } from '@/shared/services/phase3CatalogService';

const AddDevicePage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    deviceType: '' as '' | 'printer' | 'scanner',
    model: '',
    location: '',
    labelSize: '',
    scannerType: '' as '' | 'handheld' | 'fixed',
    status: 'active' as 'active' | 'inactive',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'deviceType' && value !== 'scanner') {
        next.scannerType = '';
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.deviceType) {
      alert('Name and Device Type are required');
      return;
    }

    try {
      setIsLoading(true);
      await createDeviceRegistry({
        name: formData.name.trim(),
        deviceType: formData.deviceType,
        model: formData.model.trim() || undefined,
        location: formData.location.trim() || undefined,
        labelSize: formData.labelSize.trim() || undefined,
        scannerType: formData.deviceType === 'scanner' ? formData.scannerType || undefined : undefined,
        status: formData.status,
      });
      toast.success('Device registered successfully');
      router.push('/catalog/label-templates?tab=devices');
    } catch (err) {
      console.error('Error creating device:', err);
      alert(err instanceof Error ? err.message : 'Failed to register device');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Add Device" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Device</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link
                      href="/catalog/label-templates?tab=devices"
                      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                    >
                      <i className="ri-home-line mr-2"></i>
                      Device Registry
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add Device</span>
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
                    <label htmlFor="name" className="form-label">Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="Device name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="deviceType" className="form-label">Device Type *</label>
                    <select
                      id="deviceType"
                      name="deviceType"
                      className="form-select"
                      value={formData.deviceType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select device type</option>
                      {DEVICE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="model" className="form-label">Model</label>
                    <input
                      type="text"
                      id="model"
                      name="model"
                      className="form-control"
                      placeholder="Make / model"
                      value={formData.model}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="location" className="form-label">Location</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      className="form-control"
                      placeholder="Floor / department"
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="labelSize" className="form-label">Label Size</label>
                    <input
                      type="text"
                      id="labelSize"
                      name="labelSize"
                      className="form-control"
                      placeholder="e.g. 50x30 mm"
                      value={formData.labelSize}
                      onChange={handleInputChange}
                    />
                  </div>
                  {formData.deviceType === 'scanner' && (
                    <div className="form-group">
                      <label htmlFor="scannerType" className="form-label">Scanner Type</label>
                      <select
                        id="scannerType"
                        name="scannerType"
                        className="form-select"
                        value={formData.scannerType}
                        onChange={handleInputChange}
                      >
                        {SCANNER_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select
                      id="status"
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Device'}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/catalog/label-templates?tab=devices')}
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

export default function AddDevicePageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Label Templates & Device Registry" action="create">
      <AddDevicePage />
    </RequireCrudPermission>
  );
}
