"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { createFabricSupplier } from '@/shared/services/fabricSupplierService';

const AddFabricSupplierPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsLoading(true);
      await createFabricSupplier({
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
      toast.success('Fabric supplier created successfully');
      router.push('/catalog/fabric-suppliers');
    } catch (err) {
      console.error('Error creating fabric supplier:', err);
      alert(err instanceof Error ? err.message : 'Failed to create fabric supplier');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Add Supplier" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Supplier</h1>
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
                      <span className="text-sm font-medium text-gray-500">Add Supplier</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Name *</label>
                    <input type="text" id="name" name="name" className="form-control" placeholder="Supplier name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="code" className="form-label">Code</label>
                    <input type="text" id="code" name="code" className="form-control" placeholder="Supplier code" value={formData.code} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contactPerson" className="form-label">Contact Person *</label>
                    <input type="text" id="contactPerson" name="contactPerson" className="form-control" placeholder="Contact person" value={formData.contactPerson} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contactNumber" className="form-label">Contact Number</label>
                    <input type="text" id="contactNumber" name="contactNumber" className="form-control" placeholder="Phone number" value={formData.contactNumber} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input type="email" id="email" name="email" className="form-control" placeholder="Email" value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gstin" className="form-label">GSTIN</label>
                    <input type="text" id="gstin" name="gstin" className="form-control" placeholder="GSTIN" value={formData.gstin} onChange={handleInputChange} />
                  </div>
                  <div className="form-group col-span-1 md:col-span-2">
                    <label htmlFor="address" className="form-label">Address *</label>
                    <textarea id="address" name="address" className="form-control" placeholder="Address" value={formData.address} onChange={handleInputChange} rows={3} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">City</label>
                    <input type="text" id="city" name="city" className="form-control" value={formData.city} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state" className="form-label">State</label>
                    <input type="text" id="state" name="state" className="form-control" value={formData.state} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pincode" className="form-label">Pincode</label>
                    <input type="text" id="pincode" name="pincode" className="form-control" value={formData.pincode} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="country" className="form-label">Country</label>
                    <input type="text" id="country" name="country" className="form-control" value={formData.country} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="paymentTerms" className="form-label">Payment Terms</label>
                    <input type="text" id="paymentTerms" name="paymentTerms" className="form-control" placeholder="e.g. Net 30" value={formData.paymentTerms} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="leadTimeDays" className="form-label">Lead Time Days</label>
                    <input type="number" id="leadTimeDays" name="leadTimeDays" className="form-control" min="0" value={formData.leadTimeDays} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Bank Details</h3>
                  </div>
                  <div className="form-group">
                    <label htmlFor="bankName" className="form-label">Bank Name</label>
                    <input type="text" id="bankName" name="bankName" className="form-control" value={formData.bankName} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="accountHolder" className="form-label">Account Holder</label>
                    <input type="text" id="accountHolder" name="accountHolder" className="form-control" value={formData.accountHolder} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="accountNumber" className="form-label">Account Number</label>
                    <input type="text" id="accountNumber" name="accountNumber" className="form-control" value={formData.accountNumber} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ifsc" className="form-label">IFSC</label>
                    <input type="text" id="ifsc" name="ifsc" className="form-control" value={formData.ifsc} onChange={handleInputChange} />
                  </div>

                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Supplier'}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/catalog/fabric-suppliers')}
                      disabled={isLoading}
                    >
                      Cancel
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

export default function AddFabricSupplierPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Fabric Suppliers" action="create">
      <AddFabricSupplierPage />
    </RequireCrudPermission>
  );
}
