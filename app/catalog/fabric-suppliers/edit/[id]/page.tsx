'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage';
import { UiFormFooter } from '@/shared/components/ui';
import {
  getFabricSupplier,
  updateFabricSupplier,
  FabricSupplierFabricDetail,
} from '@/shared/services/fabricSupplierService';
import { FabricSupplierDetailsSection } from '@/shared/components/catalog/FabricSupplierDetailsSection';
import { getLookupId } from '@/shared/services/fabricCatalogService';

function mapFabricDetailsFromApi(details: unknown[] | undefined): FabricSupplierFabricDetail[] {
  if (!Array.isArray(details)) return [];
  return details.map((detail) => {
    const row = detail as FabricSupplierFabricDetail & {
      fabricCatalogId?: string | { id?: string; _id?: string };
    };
    return {
      fabricCatalogId: getLookupId(row.fabricCatalogId),
      fabricName: row.fabricName || '',
      fabricSortNo: row.fabricSortNo || '',
      fabricTypeName: row.fabricTypeName || '',
      colourName: row.colourName || '',
    };
  });
}

function EditFabricSupplierPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fabricDetails, setFabricDetails] = useState<FabricSupplierFabricDetail[]>([]);
  const [formData, setFormData] = useState({
    name: '',
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
    fabricMill: '',
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
          fabricMill: data.fabricMill || '',
          bankName: data.bankDetails?.bankName || '',
          accountHolder: data.bankDetails?.accountHolder || '',
          accountNumber: data.bankDetails?.accountNumber || '',
          ifsc: data.bankDetails?.ifsc || '',
          status: data.status || 'active',
        });
        setFabricDetails(mapFabricDetailsFromApi(data.fabricDetails));
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

    if (fabricDetails.some((detail) => !detail.fabricCatalogId)) {
      alert('Each fabric detail must have a fabric selected');
      return;
    }

    const loadingToast = toast.loading('Updating fabric supplier...');
    try {
      setIsSaving(true);
      await updateFabricSupplier(params.id, {
        name: formData.name.trim(),
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
        fabricMill: formData.fabricMill.trim(),
        fabricDetails: fabricDetails.map((detail) => ({
          fabricCatalogId: detail.fabricCatalogId,
        })),
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
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Edit Supplier"
        title="Edit Supplier"
        listHref="/catalog/fabric-suppliers"
        listLabel="Fabric Suppliers"
        currentLabel="Edit"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label required">Name</label>
            <input type="text" id="name" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="contactPerson" className="form-label required">Contact Person</label>
            <input type="text" id="contactPerson" name="contactPerson" className="form-control" value={formData.contactPerson} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="contactNumber" className="form-label">Contact Number</label>
            <input type="text" id="contactNumber" name="contactNumber" className="form-control" value={formData.contactNumber} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input type="email" id="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="gstin" className="form-label">GSTIN</label>
            <input type="text" id="gstin" name="gstin" className="form-control" value={formData.gstin} onChange={handleInputChange} />
          </div>
          <div className="form-group md:col-span-2">
            <label htmlFor="address" className="form-label required">Address</label>
            <textarea id="address" name="address" className="form-control" value={formData.address} onChange={handleInputChange} rows={3} required />
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
            <input type="text" id="paymentTerms" name="paymentTerms" className="form-control" value={formData.paymentTerms} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="fabricMill" className="form-label">Fabric Mill</label>
            <input type="text" id="fabricMill" name="fabricMill" className="form-control" value={formData.fabricMill} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="status" className="form-label">Status</label>
            <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <FabricSupplierDetailsSection value={fabricDetails} onChange={setFabricDetails} />

          <div className="form-group md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700">Bank Details</h3>
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

          <UiFormFooter
            submitLabel="Update Supplier"
            isLoading={isSaving}
            onCancel={() => router.push('/catalog/fabric-suppliers')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  );
}

export default function EditFabricSupplierPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Fabric Suppliers" action="update">
      <EditFabricSupplierPage params={params} />
    </RequireCrudPermission>
  );
}
