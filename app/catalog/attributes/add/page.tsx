"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { uploadOptionalImage } from '@/shared/utils/imageUpload';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';

// Types
interface OptionValue {
  name: string;
  image: File | null;
  sortOrder: string;
}

interface ApiOptionValue {
  name: string;
  image?: string;
  sortOrder: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface AttributePayload {
  name: string;
  type: string;
  attributeType?: string; // 'Manufacturing' | 'Warehouse'
  required?: boolean;
  appliesToCategory?: string[];
  sortOrder: number;
  optionValues: ApiOptionValue[];
}

// Server action to create attribute
async function createAttribute(payload: AttributePayload) {
  console.log('Sending payload:', payload);
  
  try {
    const response = await fetch(`${API_BASE_URL}/product-attributes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Response data:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to create attribute');
    }

    return responseData;
  } catch (error) {
    console.error('Error in createAttribute:', error);
    throw error;
  }
}

const NEEDS_OPTION_VALUES = (type: string) =>
  ['select', 'radio', 'checkbox'].includes(type);

const AddAttributePage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'select', // Default type
    attributeType: 'Manufacturing' as 'Manufacturing' | 'Warehouse',
    required: false,
    appliesToCategory: [] as string[],
    description: '',
    sortOrder: '',
    values: [
      { name: '', image: null, sortOrder: '' }
    ] as OptionValue[]
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
        if (!response.ok) return;
        const data = await response.json();
        setCategories(
          (data.results || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
        );
      } catch {
        // Non-critical
      }
    };
    loadCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      appliesToCategory: prev.appliesToCategory.includes(categoryId)
        ? prev.appliesToCategory.filter((id) => id !== categoryId)
        : [...prev.appliesToCategory, categoryId],
    }));
  };

  const handleValueChange = (index: number, field: keyof OptionValue, value: any) => {
    const newValues = [...formData.values];
    newValues[index] = {
      ...newValues[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      values: newValues
    }));
  };

  const addValueField = () => {
    setFormData(prev => ({
      ...prev,
      values: [...prev.values, { name: '', image: null, sortOrder: '' }]
    }));
  };

  const removeValueField = (index: number) => {
    const newValues = formData.values.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      values: newValues
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started');
    
    try {
      setIsSubmitting(true);

      const errors: string[] = [];

      // Validate required fields
      if (!formData.name.trim()) {
        errors.push('Attribute name is required');
      }

      if (!formData.sortOrder.trim()) {
        errors.push('Sort order is required');
      } else if (isNaN(parseInt(formData.sortOrder))) {
        errors.push('Sort order must be a valid number');
      }

      if (NEEDS_OPTION_VALUES(formData.type)) {
        formData.values.forEach((value, index) => {
          if (!value.name.trim()) {
            errors.push(`Option value #${index + 1}: Name is required`);
          }
          if (!value.sortOrder.trim()) {
            errors.push(`Option value #${index + 1}: Sort order is required`);
          } else if (isNaN(parseInt(value.sortOrder))) {
            errors.push(`Option value #${index + 1}: Sort order must be a valid number`);
          }
        });
      }

      // If there are any validation errors, show them and return
      if (errors.length > 0) {
        errors.forEach(error => {
          console.log('Validation error:', error);
          toast.error(error);
        });
        setIsSubmitting(false);
        return;
      }

      // Upload option value images to S3 (optional per value)
      const optionValues = NEEDS_OPTION_VALUES(formData.type)
        ? await Promise.all(
            formData.values.map(async (value) => {
              const optionValue: ApiOptionValue = {
                name: value.name.trim(),
                sortOrder: parseInt(value.sortOrder),
              };
              const imageUrl = await uploadOptionalImage(value.image);
              if (imageUrl) {
                optionValue.image = imageUrl;
              }
              return optionValue;
            })
          )
        : [];

      const payload: AttributePayload = {
        name: formData.name.trim(),
        type: formData.type,
        attributeType: formData.attributeType,
        required: formData.required,
        appliesToCategory: formData.appliesToCategory,
        sortOrder: parseInt(formData.sortOrder),
        optionValues,
      };

      console.log('Submitting payload:', payload);

      // Submit the form
      const result = await createAttribute(payload);
      console.log('Submission result:', result);
      
      // Reset form to initial state
      setFormData({
        name: '',
        type: 'select',
        attributeType: 'Manufacturing',
        required: false,
        appliesToCategory: [],
        description: '',
        sortOrder: '',
        values: [
          { name: '', image: null, sortOrder: '' }
        ]
      });

      // Show success message
      toast.success('Attribute created successfully');
      
      // Redirect to attributes list after short delay
      setTimeout(() => {
        router.push('/catalog/attributes');
      }, 1000);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred while creating the attribute');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <Seo title="Add Attribute" />
      <Pageheader currentpage="Add Attribute" activepage="Attributes Master" mainpage="Add Attribute" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">Attribute</h5>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  {/* Option Details */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="name" className="form-label required">Attribute Name</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            <i className="ri-translate-2"></i>
                          </span>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            className="form-control !rounded-l-none"
                            placeholder="Attribute Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="type" className="form-label">Type</label>
                        <select
                          id="type"
                          name="type"
                          className="form-select"
                          value={formData.type}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        >
                          <option value="select">Select</option>
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="attributeType" className="form-label">Attribute Type</label>
                        <select
                          id="attributeType"
                          name="attributeType"
                          className="form-select"
                          value={formData.attributeType}
                          onChange={(e) => setFormData(prev => ({ ...prev, attributeType: e.target.value as 'Manufacturing' | 'Warehouse' }))}
                          disabled={isSubmitting}
                        >
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Warehouse">Warehouse</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="sortOrder" className="form-label">Sort Order</label>
                        <input
                          type="text"
                          id="sortOrder"
                          name="sortOrder"
                          className="form-control"
                          placeholder="Sort Order"
                          value={formData.sortOrder}
                          onChange={handleInputChange}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label className="form-label flex items-center gap-2 cursor-pointer mt-8">
                          <input
                            type="checkbox"
                            className="form-checkbox rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={formData.required}
                            onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                            disabled={isSubmitting}
                          />
                          Required
                        </label>
                      </div>
                    </div>

                    <div className="col-span-12">
                      <div className="form-group">
                        <label className="form-label">Applies To Categories</label>
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {categories.length === 0 ? (
                            <p className="text-sm text-gray-400 col-span-full">No categories available</p>
                          ) : (
                            categories.map((cat) => (
                              <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="form-checkbox rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  checked={formData.appliesToCategory.includes(cat.id)}
                                  onChange={() => toggleCategory(cat.id)}
                                  disabled={isSubmitting}
                                />
                                {cat.name}
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Option Values */}
                  {NEEDS_OPTION_VALUES(formData.type) && (
                  <div className="mt-6">
                    <h6 className="text-base font-semibold mb-4">Option Values</h6>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded-lg">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider required border-r border-gray-200 bg-gray-50">
                              Option Value Name
                            </th>
                            <th className="px-6 py-3 text-center text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">
                              Image
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">
                              Sort Order
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.values.map((value, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 border-r border-gray-200">
                                <div className="flex">
                                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    <i className="ri-translate-2"></i>
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control !rounded-l-none"
                                    placeholder="Option Value Name"
                                    value={value.name}
                                    onChange={(e) => handleValueChange(index, 'name', e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 border-r border-gray-200">
                                <div className="w-24 text-center h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary relative">
                                  {value.image ? (
                                    <div className="relative m-auto w-full h-full">
                                      <Image
                                        src={URL.createObjectURL(value.image)}
                                        alt="Preview"
                                        fill
                                        className="object-contain rounded-lg"
                                      />
                                      <button
                                        type="button"
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                                        onClick={() => handleValueChange(index, 'image', null)}
                                        disabled={isSubmitting}
                                      >
                                        <i className="ri-close-line"></i>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-center">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleValueChange(index, 'image', file);
                                          }
                                        }}
                                        disabled={isSubmitting}
                                      />
                                      <i className="ri-upload-cloud-2-line text-2xl text-gray-400"></i>
                                      <div className="mt-1 text-xs text-gray-500">Upload</div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 border-r border-gray-200">
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Sort Order"
                                  value={value.sortOrder}
                                  onChange={(e) => handleValueChange(index, 'sortOrder', e.target.value)}
                                  required
                                  disabled={isSubmitting}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => removeValueField(index)}
                                  disabled={formData.values.length === 1 || isSubmitting}
                                >
                                  <i className="ri-delete-bin-line text-lg"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary"
                        onClick={addValueField}
                        disabled={isSubmitting}
                      >
                        <i className="ri-add-line me-2"></i>
                        Add Option Value
                      </button>
                    </div>
                  </div>
                  )}

                  <div className="flex justify-end space-x-4 mt-6">
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
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
                          <span className="animate-spin inline-block h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AddAttributePageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Attributes Master" action="create">
      <AddAttributePage />
    </RequireCrudPermission>
  );
}
