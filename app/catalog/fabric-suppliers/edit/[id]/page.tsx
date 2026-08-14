"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import {
  getFabricSupplier,
  updateFabricSupplier,
} from '@/shared/services/fabricSupplierService';

function EditFabricSupplierPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    gstin: '',
    paymentTerms: '',
    leadTimeDays: '0',
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    ifsc: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const data = await getFabricSupplier(params.id);
        setFormData({
          name: data.name || '',
          code: data.code || '',
          contactPerson: data.contactPerson || '',
          contactNumber: data.contactNumber || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          country: data.country || 'India',
          gstin: data.gstin || '',
          paymentTerms: data.paymentTerms || '',
          leadTimeDays: String(data.leadTimeDays ?? 0),
          bankName: data.bankDetails?.bankName || '',
          accountHolder: data.bankDetails?.accountHolder || '',
          accountNumber: data.bankDetails?.accountNumber || '',
          ifsc: data.bankDetails?.ifsc || '',
          status: data.status || 'active',
        });
      } catch (error) {
        console.error('Error fetching fabric supplier:', error);
        toast.error('Failed to load fabric supplier');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSupplier();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.contactPerson.trim() || !formData.address.trim()) {
      alert('Name, Contact Person, and Address are required');
      return;
    }

    const leadTimeDays = parseInt(formData.leadTimeDays || '0', 10);
    if (isNaN(leadTimeDays) || leadTimeDays < 0) {
      alert('Lead time days must be a valid number (0 or greater)');
      return;
    }

    const loadingToast = toast.loading('Updating fabric supplier...');
    try {
      setIsSaving(true);
      await updateFabricSupplier(params.id, {
        name: formData.name.trim(),
        code: formData.code.trim(),
        contactPerson: formData.contactPerson.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        country: formData.country.trim() || 'India',
        gstin: formData.gstin.trim(),
        paymentTerms: formData.paymentTerms.trim(),
        leadTimeDays,
        bankDetails: {
          bankName: formData.bankName.trim(),
          accountHolder: formData.accountHolder.trim(),
          accountNumber: formData.accountNumber.trim(),
          ifsc: formData.ifsc.trim(),
        },
        status: formData.status,
      });
      toast.success('Fabric supplier updated successfully', { id: loadingToast });
      router.push('/catalog/fabric-suppliers');
    } catch (error) {
      console.error('Error updating fabric supplier:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update fabric supplier');
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
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Edit Supplier" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Edit Supplier</h1>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link
                  href="/catalog/fabric-suppliers"
                  className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                >
                  <i className="ri-home-line mr-2"></i>
                  Fabric Suppliers
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                  <span className="text-sm font-medium text-gray-500">Edit Supplier</span>
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
                <label className="form-label">Name *</label>
                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="form-label">Code</label>
                <input type="text" name="code" className="form-control" value={formData.code} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Contact Person *</label>
                <input type="text" name="contactPerson" className="form-control" value={formData.contactPerson} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="form-label">Contact Number</label>
                <input type="text" name="contactNumber" className="form-control" value={formData.contactNumber} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">GSTIN</label>
                <input type="text" name="gstin" className="form-control" value={formData.gstin} onChange={handleInputChange} />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Address *</label>
                <textarea name="address" className="form-control" value={formData.address} onChange={handleInputChange} rows={3} required />
              </div>
              <div>
                <label className="form-label">City</label>
                <input type="text" name="city" className="form-control" value={formData.city} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">State</label>
                <input type="text" name="state" className="form-control" value={formData.state} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Pincode</label>
                <input type="text" name="pincode" className="form-control" value={formData.pincode} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Country</label>
                <input type="text" name="country" className="form-control" value={formData.country} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Payment Terms</label>
                <input type="text" name="paymentTerms" className="form-control" value={formData.paymentTerms} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Lead Time Days</label>
                <input type="number" name="leadTimeDays" className="form-control" min="0" value={formData.leadTimeDays} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-gray-700">Bank Details</h3>
              </div>
              <div>
                <label className="form-label">Bank Name</label>
                <input type="text" name="bankName" className="form-control" value={formData.bankName} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Account Holder</label>
                <input type="text" name="accountHolder" className="form-control" value={formData.accountHolder} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Account Number</label>
                <input type="text" name="accountNumber" className="form-control" value={formData.accountNumber} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">IFSC</label>
                <input type="text" name="ifsc" className="form-control" value={formData.ifsc} onChange={handleInputChange} />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/fabric-suppliers')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Supplier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditFabricSupplierPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Fabric Suppliers" action="update">
      <EditFabricSupplierPage params={params} />
    </RequireCrudPermission>
  );
}
