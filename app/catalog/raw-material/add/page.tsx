'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { uploadOptionalImage } from '@/shared/utils/imageUpload';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { filterDecimalInput } from '@/shared/utils/formInputFilters';

const PACKAGING_TYPES = [
  'polybag',
  'carton-120',
  'bundle tag',
  'sticker',
  'insert card',
  'embroidery carton',
  'sewing thread',
  'embroidery thread',
  'other',
] as const;

interface FabricSupplier {
  id: string;
  name: string;
}

interface PackagingMaterialForm {
  name: string;
  type: string;
  sizeSpec: string;
  unit: string;
  supplier: string;
  supplierName: string;
  rate: string;
  hsnCode: string;
  gst: string;
  minimumStock: string;
  description: string;
  status: 'active' | 'inactive';
  image?: File;
  imagePreview?: string;
}

function AddPackagingMaterial() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suppliers, setSuppliers] = useState<FabricSupplier[]>([]);
  const [formData, setFormData] = useState<PackagingMaterialForm>({
    name: '',
    type: '',
    sizeSpec: '',
    unit: '',
    supplier: '',
    supplierName: '',
    rate: '',
    hsnCode: '',
    gst: '',
    minimumStock: '',
    description: '',
    status: 'active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/fabric-suppliers?limit=500&status=active`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const data = await response.json();
        setSuppliers(Array.isArray(data.results) ? data.results : []);
      } catch {
        // Non-critical; supplier select stays empty
      }
    };
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const imageUrl = await uploadOptionalImage(formData.image);
      const selectedSupplier = suppliers.find(s => s.id === formData.supplier);

      const requestData = {
        name: formData.name.trim(),
        type: formData.type,
        sizeSpec: formData.sizeSpec.trim(),
        unit: formData.unit,
        supplier: formData.supplier || null,
        supplierName: formData.supplierName.trim() || selectedSupplier?.name || '',
        rate: formData.rate === '' ? 0 : Number(formData.rate),
        hsnCode: formData.hsnCode.trim(),
        gst: formData.gst.trim(),
        minimumStock: formData.minimumStock === '' ? 0 : Number(formData.minimumStock),
        description: formData.description.trim(),
        status: formData.status,
        ...(imageUrl ? { image: imageUrl } : {}),
      };

      const response = await fetch(`${API_BASE_URL}/raw-materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add packaging material');
      }

      toast.success('Packaging material added successfully');
      router.push('/catalog/raw-material');
    } catch (error) {
      console.error('Error adding packaging material:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add packaging material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'supplier') {
        const selected = suppliers.find(s => s.id === value);
        return {
          ...prev,
          supplier: value,
          supplierName: selected?.name || (value ? prev.supplierName : prev.supplierName),
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleDecimalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: filterDecimalInput(value),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Add Packaging material" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Packaging material</h1>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group col-span-2">
                    <label className="form-label">Image (Optional)</label>
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors duration-150"
                        onClick={handleImageClick}
                      >
                        {formData.imagePreview ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={formData.imagePreview}
                              alt="Preview"
                              fill
                              className="object-cover rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="text-center">
                            <i className="ri-image-add-line text-3xl text-gray-400"></i>
                            <p className="text-sm text-gray-500 mt-2">Click to upload</p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Type <span className="text-red-500">*</span></label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="form-control"
                      required
                    >
                      <option value="">Select Type</option>
                      {PACKAGING_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Size / Spec</label>
                    <input
                      type="text"
                      name="sizeSpec"
                      value={formData.sizeSpec}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="e.g. 12x16, 120 pcs"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit <span className="text-red-500">*</span></label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="form-control"
                      required
                    >
                      <option value="">Select Unit</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Meter">Meter</option>
                      <option value="Kilograms">Kilograms</option>
                      <option value="Grams">Grams</option>
                      <option value="Liter">Liter</option>
                      <option value="Packet">Packet</option>
                      <option value="Packs">Packs</option>
                      <option value="Roll">Roll</option>
                      <option value="Cone">Cone</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <select
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
                      className="form-control"
                    >
                      <option value="">Select Supplier (optional)</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supplier Name (fallback)</label>
                    <input
                      type="text"
                      name="supplierName"
                      value={formData.supplierName}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Free-text if not in list"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rate</label>
                    <input
                      type="text"
                      name="rate"
                      value={formData.rate}
                      onChange={handleDecimalChange}
                      className="form-control"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">HSN Code</label>
                    <input
                      type="text"
                      name="hsnCode"
                      value={formData.hsnCode}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST</label>
                    <input
                      type="text"
                      name="gst"
                      value={formData.gst}
                      onChange={handleDecimalChange}
                      className="form-control"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Minimum Stock</label>
                    <input
                      type="text"
                      name="minimumStock"
                      value={formData.minimumStock}
                      onChange={handleDecimalChange}
                      className="form-control"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="form-control"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group md:col-span-2">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="form-control"
                      rows={3}
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="ti-btn ti-btn-light"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      'Add Packaging material'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddPackagingMaterialPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Packaging materials" action="create">
      <AddPackagingMaterial />
    </RequireCrudPermission>
  );
}
