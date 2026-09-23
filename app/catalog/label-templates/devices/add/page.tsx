"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { DEVICE_TYPE_OPTIONS, SCANNER_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { UiFormFooter } from '@/shared/components/ui';
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
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Add Device"
        title="Add Device"
        listHref="/catalog/label-templates?tab=devices"
        listLabel="Device Registry"
        currentLabel="Add Device"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
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
            <label htmlFor="deviceType" className="form-label required">Device Type</label>
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
          <UiFormFooter
            submitLabel="Save Device"
            isLoading={isLoading}
            onCancel={() => router.push('/catalog/label-templates?tab=devices')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
};

export default function AddDevicePageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Label Templates & Device Registry" action="create">
      <AddDevicePage />
    </RequireCrudPermission>
  );
}
