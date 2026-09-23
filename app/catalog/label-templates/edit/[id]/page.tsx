"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
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
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Edit Label Template"
        title="Edit Label Template"
        listHref="/catalog/label-templates"
        listLabel="Label Templates & Device Registry"
        currentLabel="Edit Label Template"
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
            <label htmlFor="labelType" className="form-label required">Label Type</label>
            <select
              id="labelType"
              name="labelType"
              className="form-select"
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
          <div className="form-group">
            <label htmlFor="size" className="form-label">Size</label>
            <input
              type="text"
              id="size"
              name="size"
              className="form-control"
              value={formData.size}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="barcodeScheme" className="form-label">Barcode Scheme</label>
            <input
              type="text"
              id="barcodeScheme"
              name="barcodeScheme"
              className="form-control"
              value={formData.barcodeScheme}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group md:col-span-2">
            <label htmlFor="encodedFields" className="form-label">Encoded Fields</label>
            <input
              type="text"
              id="encodedFields"
              name="encodedFields"
              className="form-control"
              placeholder="Comma-separated fields"
              value={formData.encodedFields}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="printerDevice" className="form-label">Printer Device</label>
            <select
              id="printerDevice"
              name="printerDevice"
              className="form-select"
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
          <div className="form-group">
            <label htmlFor="status" className="form-label">Status</label>
            <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <UiFormFooter
            submitLabel="Update Template"
            isLoading={isSaving}
            onCancel={() => router.push('/catalog/label-templates')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
}

export default function EditLabelTemplatePageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Label Templates & Device Registry" action="update">
      <EditLabelTemplatePage params={params} />
    </RequireCrudPermission>
  );
}
