"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { LABEL_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import {
  DeviceRegistry,
  getLabelTemplate,
  listDeviceRegistries,
  updateLabelTemplate,
} from '@/shared/services/phase3CatalogService';

const parseEncodedFields = (input: string): string[] =>
  input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function EditLabelTemplatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [printers, setPrinters] = useState<DeviceRegistry[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    labelType: '' as '' | 'fabric-roll' | 'bundle-sticker' | 'carton' | 'style-ean',
    size: '',
    encodedFields: '',
    barcodeScheme: '',
    printerDevice: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [template, deviceData] = await Promise.all([
          getLabelTemplate(params.id),
          listDeviceRegistries({ page: 1, limit: 100000 }),
        ]);
        setPrinters(deviceData.results.filter((d) => d.deviceType === 'printer'));

        const printerId =
          typeof template.printerDevice === 'object' && template.printerDevice
            ? template.printerDevice.id
            : template.printerDevice || '';

        setFormData({
          name: template.name || '',
          labelType: template.labelType || '',
          size: template.size || '',
          encodedFields: (template.encodedFields || []).join(', '),
          barcodeScheme: template.barcodeScheme || '',
          printerDevice: String(printerId),
          status: template.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching label template:', error);
        toast.error('Failed to load label template');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.labelType) {
      alert('Name and Label Type are required');
      return;
    }

    const loadingToast = toast.loading('Updating label template...');
    try {
      setIsSaving(true);
      await updateLabelTemplate(params.id, {
        name: formData.name.trim(),
        labelType: formData.labelType,
        size: formData.size.trim() || undefined,
        encodedFields: parseEncodedFields(formData.encodedFields),
        barcodeScheme: formData.barcodeScheme.trim() || undefined,
        printerDevice: formData.printerDevice || undefined,
        status: formData.status,
      });
      toast.success('Label template updated successfully', { id: loadingToast });
      router.push('/catalog/label-templates');
    } catch (error) {
      console.error('Error updating label template:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update label template');
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
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Edit Label Template" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Edit Label Template</h1>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link
                  href="/catalog/label-templates"
                  className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                >
                  <i className="ri-home-line mr-2"></i>
                  Label Templates & Device Registry
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                  <span className="text-sm font-medium text-gray-500">Edit Label Template</span>
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
                <label className="form-label">Label Type *</label>
                <select
                  name="labelType"
                  className="form-control"
                  value={formData.labelType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select label type</option>
                  {LABEL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Size</label>
                <input
                  type="text"
                  name="size"
                  className="form-control"
                  value={formData.size}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="form-label">Barcode Scheme</label>
                <input
                  type="text"
                  name="barcodeScheme"
                  className="form-control"
                  value={formData.barcodeScheme}
                  onChange={handleInputChange}
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Encoded Fields</label>
                <input
                  type="text"
                  name="encodedFields"
                  className="form-control"
                  placeholder="Comma-separated fields"
                  value={formData.encodedFields}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="form-label">Printer Device</label>
                <select
                  name="printerDevice"
                  className="form-control"
                  value={formData.printerDevice}
                  onChange={handleInputChange}
                >
                  <option value="">Select printer</option>
                  {printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name}
                      {printer.location ? ` (${printer.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>
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
                onClick={() => router.push('/catalog/label-templates')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditLabelTemplatePageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Label Templates & Device Registry" action="update">
      <EditLabelTemplatePage params={params} />
    </RequireCrudPermission>
  );
}
