"use client"
import React, { useEffect, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { filterDecimalInput } from '@/shared/utils/formInputFilters';
import { createFabricCatalog } from '@/shared/services/fabricCatalogService';
import { listFabricSuppliers, FabricSupplier } from '@/shared/services/fabricSupplierService';

const AddFabricPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<FabricSupplier[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    fabricType: '',
    composition: '',
    gsm: '',
    width: '',
    colour: '',
    shade: '',
    pantone: '',
    design: '',
    rate: '',
    gst: '',
    hsnCode: '',
    minQuantity: '',
    supplier: '',
    supplierName: '',
    uomRolls: true,
    uomKg: true,
    uomMetres: true,
    status: 'active' as 'active' | 'inactive',
    remark: '',
  });

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const data = await listFabricSuppliers({ page: 1, limit: 500, status: 'active' });
        setSuppliers(data.results);
      } catch {
        // Non-critical; supplier select stays empty
      }
    };
    fetchSuppliers();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === 'supplier') {
      const selected = suppliers.find((s) => s.id === value);
      setFormData((prev) => ({
        ...prev,
        supplier: value,
        supplierName: selected?.name || prev.supplierName,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDecimalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: filterDecimalInput(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === formData.supplier);

    try {
      setIsLoading(true);
      await createFabricCatalog({
        name: formData.name.trim(),
        code: formData.code.trim(),
        fabricType: formData.fabricType.trim(),
        composition: formData.composition.trim(),
        gsm: formData.gsm === '' ? 0 : Number(formData.gsm),
        width: formData.width === '' ? 0 : Number(formData.width),
        colour: formData.colour.trim(),
        shade: formData.shade.trim(),
        pantone: formData.pantone.trim(),
        design: formData.design.trim(),
        rate: formData.rate === '' ? 0 : Number(formData.rate),
        gst: formData.gst.trim(),
        hsnCode: formData.hsnCode.trim(),
        minQuantity: formData.minQuantity === '' ? 0 : Number(formData.minQuantity),
        supplier: formData.supplier || null,
        supplierName: formData.supplierName.trim() || selectedSupplier?.name || '',
        uomRolls: formData.uomRolls,
        uomKg: formData.uomKg,
        uomMetres: formData.uomMetres,
        status: formData.status,
        remark: formData.remark.trim(),
      });
      toast.success('Fabric created successfully');
      router.push('/catalog/fabric');
    } catch (err) {
      console.error('Error creating fabric:', err);
      alert(err instanceof Error ? err.message : 'Failed to create fabric');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Fabric" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Fabric</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link
                      href="/catalog/fabric"
                      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                    >
                      <i className="ri-home-line mr-2"></i>
                      Fabric master
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add Fabric</span>
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
                    <input type="text" id="name" name="name" className="form-control" placeholder="Fabric name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="code" className="form-label">Code</label>
                    <input type="text" id="code" name="code" className="form-control" placeholder="Fabric code" value={formData.code} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fabricType" className="form-label">Fabric Type</label>
                    <input type="text" id="fabricType" name="fabricType" className="form-control" placeholder="e.g. Voile, Cambric" value={formData.fabricType} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="composition" className="form-label">Composition</label>
                    <input type="text" id="composition" name="composition" className="form-control" placeholder="e.g. 100% Cotton" value={formData.composition} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gsm" className="form-label">GSM</label>
                    <input type="text" id="gsm" name="gsm" className="form-control" inputMode="decimal" value={formData.gsm} onChange={handleDecimalChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="width" className="form-label">Width</label>
                    <input type="text" id="width" name="width" className="form-control" inputMode="decimal" value={formData.width} onChange={handleDecimalChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="colour" className="form-label">Colour</label>
                    <input type="text" id="colour" name="colour" className="form-control" value={formData.colour} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="shade" className="form-label">Shade</label>
                    <input type="text" id="shade" name="shade" className="form-control" value={formData.shade} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pantone" className="form-label">Pantone</label>
                    <input type="text" id="pantone" name="pantone" className="form-control" value={formData.pantone} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="design" className="form-label">Design</label>
                    <input type="text" id="design" name="design" className="form-control" value={formData.design} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rate" className="form-label">Rate</label>
                    <input type="text" id="rate" name="rate" className="form-control" inputMode="decimal" value={formData.rate} onChange={handleDecimalChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gst" className="form-label">GST</label>
                    <input type="text" id="gst" name="gst" className="form-control" value={formData.gst} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="hsnCode" className="form-label">HSN Code</label>
                    <input type="text" id="hsnCode" name="hsnCode" className="form-control" value={formData.hsnCode} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="minQuantity" className="form-label">Min Quantity</label>
                    <input type="text" id="minQuantity" name="minQuantity" className="form-control" inputMode="decimal" value={formData.minQuantity} onChange={handleDecimalChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="supplier" className="form-label">Supplier</label>
                    <select id="supplier" name="supplier" className="form-select" value={formData.supplier} onChange={handleInputChange}>
                      <option value="">Select Supplier (optional)</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="supplierName" className="form-label">Supplier Name (fallback)</label>
                    <input type="text" id="supplierName" name="supplierName" className="form-control" placeholder="Free-text if not in list" value={formData.supplierName} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select id="status" name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group col-span-1 md:col-span-2">
                    <label className="form-label mb-2">Units of Measure</label>
                    <div className="flex flex-wrap gap-6">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" name="uomRolls" checked={formData.uomRolls} onChange={handleInputChange} className="rounded border-gray-300 text-purple-600 focus:ring-0" />
                        Rolls
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" name="uomKg" checked={formData.uomKg} onChange={handleInputChange} className="rounded border-gray-300 text-purple-600 focus:ring-0" />
                        Kg
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" name="uomMetres" checked={formData.uomMetres} onChange={handleInputChange} className="rounded border-gray-300 text-purple-600 focus:ring-0" />
                        Metres
                      </label>
                    </div>
                  </div>

                  <div className="form-group col-span-1 md:col-span-2">
                    <label htmlFor="remark" className="form-label">Remark</label>
                    <textarea id="remark" name="remark" className="form-control" rows={3} value={formData.remark} onChange={handleInputChange} />
                  </div>

                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button type="submit" className="ti-btn ti-btn-primary" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Fabric'}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/catalog/fabric')}
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

export default function AddFabricPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Fabric master" action="create">
      <AddFabricPage />
    </RequireCrudPermission>
  );
}
