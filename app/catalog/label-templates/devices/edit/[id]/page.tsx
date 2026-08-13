"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { DEVICE_TYPE_OPTIONS, SCANNER_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { getDeviceRegistry, updateDeviceRegistry } from '@/shared/services/phase3CatalogService';

function EditDevicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    deviceType: '' as '' | 'printer' | 'scanner',
    model: '',
    location: '',
    labelSize: '',
    scannerType: '' as '' | 'handheld' | 'fixed',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const data = await getDeviceRegistry(params.id);
        setFormData({
          name: data.name || '',
          deviceType: data.deviceType || '',
          model: data.model || '',
          location: data.location || '',
          labelSize: data.labelSize || '',
          scannerType: data.scannerType || '',
          status: data.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching device:', error);
        toast.error('Failed to load device');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDevice();
  }, [params.id]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.deviceType) {
      alert('Name and Device Type are required');
      return;
    }

    const loadingToast = toast.loading('Updating device...');
    try {
      setIsSaving(true);
      await updateDeviceRegistry(params.id, {
        name: formData.name.trim(),
        deviceType: formData.deviceType,
        model: formData.model.trim() || undefined,
        location: formData.location.trim() || undefined,
        labelSize: formData.labelSize.trim() || undefined,
        scannerType: formData.deviceType === 'scanner' ? formData.scannerType || undefined : undefined,
        status: formData.status,
      });
      toast.success('Device updated successfully', { id: loadingToast });
      router.push('/catalog/label-templates?tab=devices');
    } catch (error) {
      console.error('Error updating device:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update device');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Device" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Edit Device</h1>
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
                  <span className="text-sm font-medium text-gray-500">Edit Device</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Device Type *</label>
                <select
                  name="deviceType"
                  className="form-control"
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
              <div>
                <label className="form-label">Model</label>
                <input type="text" name="model" className="form-control" value={formData.model} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Location</label>
                <input type="text" name="location" className="form-control" value={formData.location} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Label Size</label>
                <input type="text" name="labelSize" className="form-control" value={formData.labelSize} onChange={handleInputChange} />
              </div>
              {formData.deviceType === 'scanner' && (
                <div>
                  <label className="form-label">Scanner Type</label>
                  <select name="scannerType" className="form-control" value={formData.scannerType} onChange={handleInputChange}>
                    {SCANNER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/label-templates?tab=devices')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Device'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditDevicePageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Label Templates & Device Registry" action="update">
      <EditDevicePage params={params} />
    </RequireCrudPermission>
  );
}
