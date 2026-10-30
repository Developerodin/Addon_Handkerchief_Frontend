'use client';

import React from 'react';
import { UiFormFooter } from '@/shared/components/ui';
import { ThreadSupplierThreadDetail } from '@/shared/services/threadSupplierService';
import { ThreadSupplierDetailsSection } from '@/shared/components/catalog/ThreadSupplierDetailsSection';

export interface ThreadSupplierFormState {
  name: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  paymentTerms: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  status: 'active' | 'inactive';
}

interface ThreadSupplierFormProps {
  formData: ThreadSupplierFormState;
  threadDetails: ThreadSupplierThreadDetail[];
  isLoading: boolean;
  submitLabel: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onThreadDetailsChange: (details: ThreadSupplierThreadDetail[]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

/**
 * Shared thread supplier fields: contact, address, thread lines, and bank details.
 */
export function ThreadSupplierForm({
  formData,
  threadDetails,
  isLoading,
  submitLabel,
  onChange,
  onThreadDetailsChange,
  onSubmit,
  onCancel,
}: ThreadSupplierFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="name" className="form-label required">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          className="form-control"
          placeholder="Supplier name"
          value={formData.name}
          onChange={onChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="contactPerson" className="form-label required">
          Contact Person
        </label>
        <input
          type="text"
          id="contactPerson"
          name="contactPerson"
          className="form-control"
          placeholder="Contact person"
          value={formData.contactPerson}
          onChange={onChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="contactNumber" className="form-label">
          Contact Number
        </label>
        <input
          type="text"
          id="contactNumber"
          name="contactNumber"
          className="form-control"
          placeholder="Phone number"
          value={formData.contactNumber}
          onChange={onChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="email" className="form-label">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className="form-control"
          placeholder="Email"
          value={formData.email}
          onChange={onChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="gstin" className="form-label">
          GSTIN
        </label>
        <input
          type="text"
          id="gstin"
          name="gstin"
          className="form-control"
          placeholder="GSTIN"
          value={formData.gstin}
          onChange={onChange}
        />
      </div>
      <div className="form-group md:col-span-2">
        <label htmlFor="address" className="form-label required">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          className="form-control"
          placeholder="Address"
          value={formData.address}
          onChange={onChange}
          rows={3}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="city" className="form-label">
          City
        </label>
        <input type="text" id="city" name="city" className="form-control" value={formData.city} onChange={onChange} />
      </div>
      <div className="form-group">
        <label htmlFor="state" className="form-label">
          State
        </label>
        <input type="text" id="state" name="state" className="form-control" value={formData.state} onChange={onChange} />
      </div>
      <div className="form-group">
        <label htmlFor="pincode" className="form-label">
          Pincode
        </label>
        <input type="text" id="pincode" name="pincode" className="form-control" value={formData.pincode} onChange={onChange} />
      </div>
      <div className="form-group">
        <label htmlFor="country" className="form-label">
          Country
        </label>
        <input type="text" id="country" name="country" className="form-control" value={formData.country} onChange={onChange} />
      </div>
      <div className="form-group">
        <label htmlFor="paymentTerms" className="form-label">
          Payment Terms
        </label>
        <input
          type="text"
          id="paymentTerms"
          name="paymentTerms"
          className="form-control"
          placeholder="e.g. Net 30"
          value={formData.paymentTerms}
          onChange={onChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="status" className="form-label">
          Status
        </label>
        <select id="status" name="status" className="form-select" value={formData.status} onChange={onChange}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <ThreadSupplierDetailsSection value={threadDetails} onChange={onThreadDetailsChange} />

      <div className="form-group md:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Bank Details</h3>
      </div>
      <div className="form-group">
        <label htmlFor="bankName" className="form-label">
          Bank Name
        </label>
        <input type="text" id="bankName" name="bankName" className="form-control" value={formData.bankName} onChange={onChange} />
      </div>
      <div className="form-group">
        <label htmlFor="accountHolder" className="form-label">
          Account Holder
        </label>
        <input
          type="text"
          id="accountHolder"
          name="accountHolder"
          className="form-control"
          value={formData.accountHolder}
          onChange={onChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="accountNumber" className="form-label">
          Account Number
        </label>
        <input
          type="text"
          id="accountNumber"
          name="accountNumber"
          className="form-control"
          value={formData.accountNumber}
          onChange={onChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="ifsc" className="form-label">
          IFSC
        </label>
        <input type="text" id="ifsc" name="ifsc" className="form-control" value={formData.ifsc} onChange={onChange} />
      </div>

      <UiFormFooter submitLabel={submitLabel} isLoading={isLoading} onCancel={onCancel} />
    </form>
  );
}

/**
 * Empty supplier form used by the create page.
 */
export const emptyThreadSupplierForm = (): ThreadSupplierFormState => ({
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
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  ifsc: '',
  status: 'active',
});

/**
 * Builds the API payload from the form. Thread lines send only the catalog id.
 * @param formData - Header and bank fields
 * @param threadDetails - Selected catalog lines
 */
export const toThreadSupplierPayload = (
  formData: ThreadSupplierFormState,
  threadDetails: ThreadSupplierThreadDetail[]
) => ({
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
  threadDetails: threadDetails.map((detail) => ({
    threadCatalogId: detail.threadCatalogId,
  })),
  bankDetails: {
    bankName: formData.bankName.trim(),
    accountHolder: formData.accountHolder.trim(),
    accountNumber: formData.accountNumber.trim(),
    ifsc: formData.ifsc.trim(),
  },
  status: formData.status,
});
