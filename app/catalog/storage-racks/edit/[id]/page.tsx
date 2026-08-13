"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { STOCK_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import {
  getStorageRack,
  updateStorageRack,
} from '@/shared/services/phase3CatalogService';

function EditStorageRackPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    const fetchRack = async () => {
      try {
        const data = await getStorageRack(params.id);
        setFormData({
          code: data.code || '',
          name: data.name || '',
          floor: data.floor || '',
          zone: data.zone || '',
          stockType: data.stockType || '',
          capacity: data.capacity !== undefined ? String(data.capacity) : '',
          barcode: data.barcode || '',
          status: data.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching storage rack:', error);
        toast.error('Failed to load storage rack');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRack();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const loadingToast = toast.loading('Updating storage rack...');
    try {
      setIsSaving(true);
      await updateStorageRack(params.id, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        floor: formData.floor.trim(),
        zone: formData.zone.trim(),
        stockType: formData.stockType || undefined,
        capacity,
        barcode: formData.barcode.trim(),
        status: formData.status,
      });
      toast.success('Storage rack updated successfully', { id: loadingToast });
      router.push('/catalog/storage-racks');
    } catch (error) {
      console.error('Error updating storage rack:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update storage rack');
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
      <Seo title="Edit Storage Rack" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Edit Storage Rack</h1>
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
                  <span className="text-sm font-medium text-gray-500">Edit Storage Rack</span>
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
                <label className="form-label">Code *</label>
                <input type="text" name="code" className="form-control" value={formData.code} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="form-label">Name *</label>
                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="form-label">Floor</label>
                <input type="text" name="floor" className="form-control" value={formData.floor} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Zone</label>
                <input type="text" name="zone" className="form-control" value={formData.zone} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Stock Type</label>
                <select name="stockType" className="form-control" value={formData.stockType} onChange={handleInputChange}>
                  <option value="">Select Stock Type</option>
                  {STOCK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Capacity</label>
                <input type="number" name="capacity" className="form-control" min="0" value={formData.capacity} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Barcode</label>
                <input type="text" name="barcode" className="form-control" value={formData.barcode} onChange={handleInputChange} />
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
                onClick={() => router.push('/catalog/storage-racks')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Rack'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditStorageRackPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Storage Racks" action="update">
      <EditStorageRackPage params={params} />
    </RequireCrudPermission>
  );
}
