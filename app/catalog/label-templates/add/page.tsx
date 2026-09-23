"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { LABEL_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import { UiFormFooter } from '@/shared/components/ui';
import {
  createLabelTemplate,
  DeviceRegistry,
  listDeviceRegistries,
} from '@/shared/services/phase3CatalogService';

const parseEncodedFields = (input: string): string[] =>
  input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const AddLabelTemplatePage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
    const fetchPrinters = async () => {
      try {
        const data = await listDeviceRegistries({ page: 1, limit: 100000 });
        setPrinters(data.results.filter((d) => d.deviceType === 'printer'));
      } catch (err) {
        console.error('Error fetching printers:', err);
      }
    };
    fetchPrinters();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.labelType) {
      alert('Name and Label Type are required');
      return;
    }

    try {
      setIsLoading(true);
      await createLabelTemplate({
        name: formData.name.trim(),
        labelType: formData.labelType,
        size: formData.size.trim() || undefined,
        encodedFields: parseEncodedFields(formData.encodedFields),
        barcodeScheme: formData.barcodeScheme.trim() || undefined,
        printerDevice: formData.printerDevice || undefined,
        status: formData.status,
      });
      toast.success('Label template created successfully');
      router.push('/catalog/label-templates');
    } catch (err) {
      console.error('Error creating label template:', err);
      alert(err instanceof Error ? err.message : 'Failed to create label template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Add Label Template"
        title="Add Label Template"
        listHref="/catalog/label-templates"
        listLabel="Label Templates & Device Registry"
        currentLabel="Add Label Template"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              placeholder="Template name"
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
              placeholder="e.g. 50x30 mm"
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
              placeholder="Barcode scheme"
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
              placeholder="Comma-separated fields, e.g. styleCode, ean, batchNo"
              value={formData.encodedFields}
              onChange={handleInputChange}
            />
            <p className="text-xs text-gray-500 mt-1">Enter field names separated by commas</p>
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
            submitLabel="Save Template"
            isLoading={isLoading}
            onCancel={() => router.push('/catalog/label-templates')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
};

export default function AddLabelTemplatePageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Label Templates & Device Registry" action="create">
      <AddLabelTemplatePage />
    </RequireCrudPermission>
  );
}
