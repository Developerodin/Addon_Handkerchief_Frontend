"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { PROCESS_DEPARTMENTS, CONTAINER_TYPE_OPTIONS } from '@/shared/constants/handkerchiefCatalog';
import {
  getContainer,
  updateContainer,
  Container,
} from '@/shared/services/phase3CatalogService';

function EditContainerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '' as Container['type'] | '',
    capacity: '',
    barcode: '',
    department: '',
    floor: '',
    reusable: false,
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const fetchContainer = async () => {
      try {
        const data = await getContainer(params.id);
        setFormData({
          code: data.code || '',
          name: data.name || '',
          type: data.type || '',
          capacity: data.capacity != null ? String(data.capacity) : '',
          barcode: data.barcode || '',
          department: data.department || '',
          floor: data.floor || '',
          reusable: data.reusable ?? false,
          status: data.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching container:', error);
        toast.error('Failed to load container');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContainer();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Code and Name are required');
      return;
    }

    const capacity =
      formData.capacity.trim() === '' ? undefined : parseInt(formData.capacity, 10);
    if (formData.capacity.trim() !== '' && (isNaN(capacity!) || capacity! < 0)) {
      alert('Capacity must be a valid number (0 or greater)');
      return;
    }

    const loadingToast = toast.loading('Updating container...');
    try {
      setIsSaving(true);
      await updateContainer(params.id, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type || undefined,
        capacity,
        barcode: formData.barcode.trim(),
        department: formData.department.trim(),
        floor: formData.floor.trim(),
        reusable: formData.reusable,
        status: formData.status,
      });
      toast.success('Container updated successfully', { id: loadingToast });
      router.push('/catalog/containers');
    } catch (error) {
      console.error('Error updating container:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update container');
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
      <Seo title="Edit Container" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Edit Container</h1>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link
                  href="/catalog/containers"
                  className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                >
                  <i className="ri-home-line mr-2"></i>
                  Containers
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                  <span className="text-sm font-medium text-gray-500">Edit Container</span>
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
                <label className="form-label">Type</label>
                <select name="type" className="form-control" value={formData.type} onChange={handleInputChange}>
                  <option value="">Select Type</option>
                  {CONTAINER_TYPE_OPTIONS.map((opt) => (
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
                <label className="form-label">Department</label>
                <select name="department" className="form-control" value={formData.department} onChange={handleInputChange}>
                  {PROCESS_DEPARTMENTS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Floor</label>
                <input type="text" name="floor" className="form-control" value={formData.floor} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  id="reusable"
                  name="reusable"
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  checked={formData.reusable}
                  onChange={handleInputChange}
                />
                <label htmlFor="reusable" className="form-label mb-0">Reusable</label>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/containers')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Container'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditContainerPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Containers Master" action="update">
      <EditContainerPage params={params} />
    </RequireCrudPermission>
  );
}
