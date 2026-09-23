"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { uploadOptionalImage } from '@/shared/utils/imageUpload';
import {
  CategoryRecord,
  getValidParentOptions,
  getLevelLabel,
} from '@/shared/utils/categoryHierarchy';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';

interface Category extends CategoryRecord {}

const AddCategoryPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent: '',
    sortOrder: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Fetch parent categories
  useEffect(() => {
    const fetchParentCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch parent categories');
        }

        const data = await response.json();
        setParentCategories(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        console.error('Error fetching parent categories:', err);
        toast.error('Failed to load parent categories');
      }
    };

    fetchParentCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const parentOptions = getValidParentOptions(parentCategories);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sortOrder.trim()) {
      alert('Sort order is required');
      return;
    }
    const sortOrder = parseInt(formData.sortOrder, 10);
    if (isNaN(sortOrder) || sortOrder < 1) {
      alert('Sort order must be a valid number');
      return;
    }
    
    try {
      setIsLoading(true);

      // Upload image to S3 first (optional)
      const imageUrl = await uploadOptionalImage(selectedImage);

      // Prepare category data
      const categoryData = {
        name: formData.name,
        parent: formData.parent || undefined,
        description: formData.description || undefined,
        sortOrder,
        status: formData.status,
        ...(imageUrl ? { image: imageUrl } : {}),
      };

      // Create category
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = errorData.message || 'Failed to create category';
        alert(message);
        return;
      }

      toast.success('Category created successfully');
      router.push('/catalog/categories');
    } catch (err) {
      console.error('Error creating category:', err);
      alert(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Add Category"
        title="Add New Category"
        listHref="/catalog/categories"
        listLabel="Categories"
        currentLabel="Add New Category"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label htmlFor="name" className="form-label required">Category Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                placeholder="Enter category name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="parent" className="form-label">Parent Category</label>
              <select
                id="parent"
                name="parent"
                className="form-select"
                value={formData.parent}
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

            <div className="form-group col-span-1 md:col-span-2">
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                placeholder="Enter category description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
              />
            </div>

            <div className="form-group col-span-1 md:col-span-2">
              <label className="form-label">Category Image</label>
              <div className="mt-2">
                <div className="flex items-center space-x-4">
                  {imagePreview && (
                    <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <label className="ti-btn ti-btn-primary cursor-pointer">
                    <span>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="sortOrder" className="form-label required">Sort Order</label>
              <input
                type="number"
                id="sortOrder"
                name="sortOrder"
                className="form-control"
                placeholder="Enter sort order index..."
                value={formData.sortOrder}
                onChange={handleInputChange}
                min="1"
              />
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
          </div>
          <UiFormFooter
            submitLabel="Save Category"
            isLoading={isLoading}
            onCancel={() => router.push('/catalog/categories')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
};

export default function AddCategoryPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Category" action="create">
      <AddCategoryPage />
    </RequireCrudPermission>
  );
} 