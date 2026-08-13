"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { uploadOptionalImage } from '@/shared/utils/imageUpload';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { filterDigitsOnly } from '@/shared/utils/formInputFilters';

interface ProcessStep {
  stepTitle: string;
  stepDescription: string;
  duration: number;
}

interface ProcessFormData {
  name: string;
  code: string;
  description: string;
  type: string;
  department: string;
  floor: string;
  standardTime: number;
  machineType: string;
  standardRate: number;
  qcCheckpoint: boolean;
  reworkEligible: boolean;
  sortOrder: number;
  image: File | null;
  status: 'active' | 'inactive';
  steps: ProcessStep[];
}

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'Select Department' },
  { value: 'store', label: 'Store' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'hemming', label: 'Hemming' },
  { value: 'checking', label: 'Checking' },
  { value: 'ironing', label: 'Ironing' },
  { value: 'packing', label: 'Packing' },
  { value: 'dispatch', label: 'Dispatch' },
  { value: 'embroidery', label: 'Embroidery' },
];

const MACHINE_TYPE_OPTIONS = [
  { value: '', label: 'Select Machine Type' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'half-moon', label: 'Half-moon' },
  { value: 'vertical-hemming', label: 'Vertical Hemming' },
  { value: 'horizontal-hemming', label: 'Horizontal Hemming' },
  { value: 'embroidery', label: 'Embroidery' },
  { value: 'ironing', label: 'Ironing' },
  { value: 'none', label: 'None' },
];

const AddProcessPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<ProcessFormData>({
    name: '',
    code: '',
    description: '',
    type: '',
    department: '',
    floor: '',
    standardTime: 0,
    machineType: '',
    standardRate: 0,
    qcCheckpoint: false,
    reworkEligible: false,
    sortOrder: 0,
    image: null,
    status: 'active',
    steps: [{ stepTitle: '', stepDescription: '', duration: 0 }]
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'sortOrder' || name === 'standardTime') {
      const filtered = filterDigitsOnly(value);
      setFormData(prev => ({
        ...prev,
        [name]: filtered === '' ? 0 : parseInt(filtered, 10),
      }));
      return;
    }
    if (name === 'standardRate') {
      const cleaned = value.replace(/[^\d.]/g, '');
      setFormData(prev => ({
        ...prev,
        standardRate: cleaned === '' ? 0 : parseFloat(cleaned) || 0,
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleStepChange = (index: number, field: keyof ProcessStep, value: string) => {
    const newSteps = [...formData.steps];
    if (field === 'duration') {
      const filtered = filterDigitsOnly(value);
      newSteps[index] = {
        ...newSteps[index],
        duration: filtered === '' ? 0 : parseInt(filtered, 10),
      };
    } else {
      newSteps[index] = {
        ...newSteps[index],
        [field]: value,
      };
    }
    setFormData(prev => ({
      ...prev,
      steps: newSteps,
    }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { stepTitle: '', stepDescription: '', duration: 0 }]
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        steps: newSteps
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating process...');

    try {
      const imageUrl = await uploadOptionalImage(formData.image);

      const processData = {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        description: formData.description || ' ',
        department: formData.department,
        floor: formData.floor,
        standardTime: formData.standardTime,
        machineType: formData.machineType,
        standardRate: formData.standardRate,
        qcCheckpoint: formData.qcCheckpoint,
        reworkEligible: formData.reworkEligible,
        sortOrder: formData.sortOrder,
        status: formData.status,
        steps: formData.steps,
        ...(imageUrl ? { image: imageUrl } : {}),
      };

      const response = await fetch(`${API_BASE_URL}/processes`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create process');
      }

      toast.success('Process created successfully', { id: loadingToast });
      setTimeout(() => router.push('/catalog/processes'), 800);
    } catch (error) {
      console.error('Error creating process:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create process', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <Seo title="Add Process" />
      <Pageheader currentpage="Add Process" activepage="Process Master" mainpage="Add Process" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">Add New Process</h5>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-6">
                      <div className="form-group">
                        <label htmlFor="name" className="form-label required">Process Name</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          className="form-control"
                          placeholder="Enter process name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <div className="form-group">
                        <label htmlFor="code" className="form-label">Code</label>
                        <input
                          type="text"
                          id="code"
                          name="code"
                          className="form-control"
                          placeholder="e.g. CUT, HEM"
                          value={formData.code}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <div className="form-group">
                        <label htmlFor="type" className="form-label required">Process Type</label>
                        <select
                          id="type"
                          name="type"
                          className="form-select"
                          value={formData.type}
                          onChange={handleInputChange}
                          required
                          disabled={isSubmitting}
                        >
                          <option value="">Select Type</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Assembly">Assembly</option>
                          <option value="Quality Control">Quality Control</option>
                          <option value="Packaging">Packaging</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <div className="form-group">
                        <label htmlFor="department" className="form-label">Department</label>
                        <select
                          id="department"
                          name="department"
                          className="form-select"
                          value={formData.department}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        >
                          {DEPARTMENT_OPTIONS.map((opt) => (
                            <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-span-12">
                      <div className="form-group">
                        <label htmlFor="description" className="form-label">Description</label>
                        <textarea
                          id="description"
                          name="description"
                          className="form-control"
                          placeholder="Enter process description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={4}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="floor" className="form-label">Floor</label>
                        <input
                          type="text"
                          id="floor"
                          name="floor"
                          className="form-control"
                          placeholder="e.g. 1, 2"
                          value={formData.floor}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="standardTime" className="form-label">Standard Time (min)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          id="standardTime"
                          name="standardTime"
                          className="form-control"
                          placeholder="Minutes"
                          value={formData.standardTime === 0 ? '' : String(formData.standardTime)}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="machineType" className="form-label">Machine Type</label>
                        <select
                          id="machineType"
                          name="machineType"
                          className="form-select"
                          value={formData.machineType}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        >
                          {MACHINE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="standardRate" className="form-label">Standard Rate</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          id="standardRate"
                          name="standardRate"
                          className="form-control"
                          placeholder="Rate"
                          value={formData.standardRate === 0 ? '' : String(formData.standardRate)}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="sortOrder" className="form-label">Sort Order</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          id="sortOrder"
                          name="sortOrder"
                          className="form-control"
                          placeholder="Enter sort order"
                          value={formData.sortOrder === 0 ? '' : String(formData.sortOrder)}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="status" className="form-label">Status</label>
                        <select
                          id="status"
                          name="status"
                          className="form-select"
                          value={formData.status}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <div className="form-group">
                        <label className="form-label flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="form-checkbox rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={formData.qcCheckpoint}
                            onChange={(e) => setFormData(prev => ({ ...prev, qcCheckpoint: e.target.checked }))}
                            disabled={isSubmitting}
                          />
                          QC Checkpoint
                        </label>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <div className="form-group">
                        <label className="form-label flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="form-checkbox rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={formData.reworkEligible}
                            onChange={(e) => setFormData(prev => ({ ...prev, reworkEligible: e.target.checked }))}
                            disabled={isSubmitting}
                          />
                          Rework Eligible
                        </label>
                      </div>
                    </div>

                    <div className="col-span-12">
                      <div className="form-group">
                        <label className="form-label">Process Image</label>
                        <div className="flex items-center space-x-4">
                          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative">
                            {imagePreview ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={imagePreview}
                                  alt="Preview"
                                  fill
                                  className="object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, image: null }));
                                    setImagePreview('');
                                  }}
                                  disabled={isSubmitting}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </div>
                            ) : (
                              <div className="text-center">
                                <i className="ri-upload-2-line text-4xl text-gray-400"></i>
                                <p className="text-sm text-gray-500 mt-2">Upload Image</p>
                              </div>
                            )}
                            <input
                              type="file"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={handleImageChange}
                              accept="image/*"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h6 className="text-base font-semibold">Process Steps</h6>
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary"
                        onClick={addStep}
                        disabled={isSubmitting}
                      >
                        <i className="ri-add-line me-2"></i>Add Step
                      </button>
                    </div>

                    {formData.steps.map((step, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg relative">
                        <div className="col-span-12 md:col-span-4">
                          <div className="form-group">
                            <label className="form-label required">Step Title</label>
                            <input
                              type="text"
                              className="form-control"
                              value={step.stepTitle}
                              onChange={(e) => handleStepChange(index, 'stepTitle', e.target.value)}
                              required
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div className="col-span-12 md:col-span-6">
                          <div className="form-group">
                            <label className="form-label required">Step Description</label>
                            <input
                              type="text"
                              className="form-control"
                              value={step.stepDescription}
                              onChange={(e) => handleStepChange(index, 'stepDescription', e.target.value)}
                              required
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div className="col-span-12 md:col-span-2">
                          <div className="form-group">
                            <label className="form-label required">Duration (min)</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="form-control"
                              value={step.duration === 0 ? '' : String(step.duration)}
                              onChange={(e) => handleStepChange(index, 'duration', e.target.value)}
                              required
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        {formData.steps.length > 1 && (
                          <button
                            type="button"
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            onClick={() => removeStep(index)}
                            disabled={isSubmitting}
                          >
                            <i className="ri-delete-bin-line text-lg"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-4 mt-6">
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/catalog/processes')}
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
                          Creating...
                        </>
                      ) : (
                        'Create Process'
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

export default function AddProcessPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Process Master" action="create">
      <AddProcessPage />
    </RequireCrudPermission>
  );
}
