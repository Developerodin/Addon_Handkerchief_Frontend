"use client"
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import Image from 'next/image';
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
  id: string;
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
  image: string | null;
}

function EditPackagingMaterial({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [suppliers, setSuppliers] = useState<FabricSupplier[]>([]);
  const [material, setMaterial] = useState<PackagingMaterialForm>({
    id: '',
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
    image: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

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
        // Non-critical
      }
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        setIsFetching(true);
        const response = await fetch(`${API_BASE_URL}/raw-materials/${params.id}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch packaging material');
        }

        const data = await response.json();
        const supplierId =
          data.supplier && typeof data.supplier === 'object'
            ? data.supplier.id
            : data.supplier || '';

        setMaterial({
          id: data.id,
          name: data.name || '',
          type: data.type || '',
          sizeSpec: data.sizeSpec || data.countSize || '',
          unit: data.unit || '',
          supplier: supplierId,
          supplierName: data.supplierName || (data.supplier?.name || ''),
          rate: data.rate != null ? String(data.rate) : (data.mrp || ''),
          hsnCode: data.hsnCode || '',
          gst: data.gst || '',
          minimumStock: data.minimumStock != null ? String(data.minimumStock) : '',
          description: data.description || '',
          status: data.status === 'inactive' ? 'inactive' : 'active',
          image: data.image || null,
        });
        if (data.image) {
          setImagePreview(data.image);
        }
      } catch (err) {
        console.error('Error fetching packaging material:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to fetch packaging material');
        router.push('/catalog/raw-material');
      } finally {
        setIsFetching(false);
      }
    };

    fetchMaterial();
  }, [params.id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMaterial(prev => {
      if (name === 'supplier') {
        const selected = suppliers.find(s => s.id === value);
        return {
          ...prev,
          supplier: value,
          supplierName: selected?.name || prev.supplierName,
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleDecimalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMaterial(prev => ({
      ...prev,
      [name]: filterDecimalInput(value),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const imageUrl = await uploadOptionalImage(selectedImage);
      const selectedSupplier = suppliers.find(s => s.id === material.supplier);

      const response = await fetch(`${API_BASE_URL}/raw-materials/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: material.name.trim(),
          type: material.type,
          sizeSpec: material.sizeSpec.trim(),
          unit: material.unit,
          supplier: material.supplier || null,
          supplierName: material.supplierName.trim() || selectedSupplier?.name || '',
          rate: material.rate === '' ? 0 : Number(material.rate),
          hsnCode: material.hsnCode.trim(),
          gst: material.gst.trim(),
          minimumStock: material.minimumStock === '' ? 0 : Number(material.minimumStock),
          description: material.description.trim(),
          status: material.status,
          ...(imageUrl ? { image: imageUrl } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update packaging material');
      }

      toast.success('Packaging material updated successfully');
      router.push('/catalog/raw-material');
    } catch (err) {
      console.error('Error updating packaging material:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update packaging material');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Packaging material" />

      <div className="box">
        <div className="box-header">
          <h1 className="box-title text-2xl font-semibold">Edit Packaging material</h1>
        </div>
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Image (Optional)</label>
                <div className="mt-1 flex items-center space-x-4">
                  {imagePreview && (
                    <div className="relative w-32 h-32">
                      <Image
                        src={imagePreview}
                        alt="Material preview"
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <label className="ti-btn ti-btn-primary cursor-pointer">
                    <span>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={material.name}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type <span className="text-red-500">*</span></label>
                <select
                  name="type"
                  value={material.type}
                  onChange={handleChange}
                  className="form-control"
                  required
                >
                  <option value="">Select Type</option>
                  {PACKAGING_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  {material.type && !(PACKAGING_TYPES as readonly string[]).includes(material.type) && (
                    <option value={material.type}>{material.type} (legacy)</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Size / Spec</label>
                <input
                  type="text"
                  name="sizeSpec"
                  value={material.sizeSpec}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="e.g. 12x16, 120 pcs"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit <span className="text-red-500">*</span></label>
                <select
                  name="unit"
                  value={material.unit}
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
                  {material.unit && !['Pcs', 'Meter', 'Kilograms', 'Grams', 'Liter', 'Packet', 'Packs', 'Roll', 'Cone'].includes(material.unit) && (
                    <option value={material.unit}>{material.unit}</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select
                  name="supplier"
                  value={material.supplier}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="">Select Supplier (optional)</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                  {material.supplier && !suppliers.some(s => s.id === material.supplier) && (
                    <option value={material.supplier}>
                      {material.supplierName || 'Current supplier'}
                    </option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Supplier Name (fallback)</label>
                <input
                  type="text"
                  name="supplierName"
                  value={material.supplierName}
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
                  value={material.rate}
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
                  value={material.hsnCode}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">GST</label>
                <input
                  type="text"
                  name="gst"
                  value={material.gst}
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
                  value={material.minimumStock}
                  onChange={handleDecimalChange}
                  className="form-control"
                  inputMode="decimal"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  name="status"
                  value={material.status}
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
                  value={material.description}
                  onChange={handleChange}
                  className="form-control"
                  rows={3}
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/raw-material')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ti-btn ti-btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Packaging material'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditPackagingMaterialPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Packaging materials" action="update">
      <EditPackagingMaterial params={params} />
    </RequireCrudPermission>
  );
}
