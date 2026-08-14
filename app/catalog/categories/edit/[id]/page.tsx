"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { uploadOptionalImage } from '@/shared/utils/imageUpload';
import {
  CategoryRecord,
  buildParentMap,
  getCategoryLevel,
  getDescendantIds,
  getValidParentOptions,
  getLevelLabel,
} from '@/shared/utils/categoryHierarchy';

interface Category extends CategoryRecord {}

function EditCategoryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Category>({
    id: '',
    name: '',
    parent: null,
    description: '',
    sortOrder: 0,
    status: 'active',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Fetch category data
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch category');
        const data = await response.json();
        
        setFormData({
          id: data.id,
          name: data.name,
          parent: typeof data.parent === 'object' && data.parent ? data.parent.id : (data.parent || null),
          description: data.description || '',
          sortOrder: data.sortOrder,
          status: data.status,
        });

        if (data.image) {
          setImagePreview(data.image);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching category:', error);
        toast.error('Failed to load category');
        setIsLoading(false);
      }
    };

    const fetchParentCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setAllCategories(Array.isArray(data.results) ? data.results : []);
      } catch (error) {
        console.error('Error fetching parent categories:', error);
        toast.error('Failed to load parent categories');
      }
    };

    fetchCategory();
    fetchParentCategories();
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const parentMap = buildParentMap(allCategories);
  const excludeIds = [
    params.id,
    ...getDescendantIds(params.id, parentMap),
  ];
  const parentOptions = getValidParentOptions(allCategories, { excludeIds });
  const currentLevel = formData.id
    ? getCategoryLevel(formData.id, parentMap)
    : 1;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const loadingToast = toast.loading('Updating category...');

    try {
      const imageUrl = await uploadOptionalImage(imageFile);

      const requestBody = {
        name: formData.name,
        description: formData.description || '',
        sortOrder: parseInt(formData.sortOrder.toString()),
        status: formData.status,
        parent: formData.parent || null,
        ...(imageUrl ? { image: imageUrl } : {}),
      };

      const response = await fetch(`${API_BASE_URL}/categories/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = errorData.message || 'Failed to update category';
        toast.dismiss(loadingToast);
        alert(message);
        return;
      }

      toast.success('Category updated successfully', { id: loadingToast });
      router.push('/catalog/categories');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update category');
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
      <Seo title="Edit Category" />
      
      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header">
          <h1 className="box-title text-2xl font-semibold">Edit Category</h1>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Category Name</label>
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
                <label className="form-label">Level</label>
                <input
                  type="text"
                  className="form-control bg-gray-50"
                  value={getLevelLabel(currentLevel)}
                  readOnly
                />
              </div>

              <div>
                <label className="form-label">Parent Category</label>
                <select
                  name="parent"
                  className="form-control"
                  value={formData.parent || ''}
                  onChange={handleInputChange}
                >
                  <option value="">None — top-level Category</option>
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} ({getLevelLabel(option.level + 1)})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hierarchy: Category → Child → Grandchild (max 3 levels)
                </p>
              </div>

              <div>
                <label className="form-label">Sort Order</label>
                <input
                  type="number"
                  name="sortOrder"
                  className="form-control"
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-control"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-control"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              <div className="md:col-span-2">
                <label className="form-label">Category Image</label>
                <input
                  type="file"
                  className="form-control"
                  onChange={handleImageChange}
                  accept="image/*"
                />
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="max-w-xs rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/categories')}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary">
                Update Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditCategoryPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Category" action="update">
      <EditCategoryPage params={params} />
    </RequireCrudPermission>
  );
}