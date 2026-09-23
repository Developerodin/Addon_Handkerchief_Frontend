"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
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
        seoTitle="Edit Device"
        title="Edit Device"
        listHref="/catalog/label-templates?tab=devices"
        listLabel="Device Registry"
        currentLabel="Edit Device"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
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
            <input type="text" id="model" name="model" className="form-control" value={formData.model} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="location" className="form-label">Location</label>
            <input type="text" id="location" name="location" className="form-control" value={formData.location} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="labelSize" className="form-label">Label Size</label>
            <input type="text" id="labelSize" name="labelSize" className="form-control" value={formData.labelSize} onChange={handleInputChange} />
          </div>
          {formData.deviceType === 'scanner' && (
            <div className="form-group">
              <label htmlFor="scannerType" className="form-label">Scanner Type</label>
              <select id="scannerType" name="scannerType" className="form-select" value={formData.scannerType} onChange={handleInputChange}>
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
            <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <UiFormFooter
            submitLabel="Update Device"
            isLoading={isSaving}
            onCancel={() => router.push('/catalog/label-templates?tab=devices')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
}

export default function EditDevicePageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Label Templates & Device Registry" action="update">
      <EditDevicePage params={params} />
    </RequireCrudPermission>
  );
}
