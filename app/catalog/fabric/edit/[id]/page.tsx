"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { filterDecimalInput } from '@/shared/utils/formInputFilters';
import { getFabricCatalog, updateFabricCatalog } from '@/shared/services/fabricCatalogService';
import { listFabricSuppliers, FabricSupplier } from '@/shared/services/fabricSupplierService';

function EditFabricPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
        // Non-critical
      }
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchFabric = async () => {
      try {
        const data = await getFabricCatalog(params.id);
        const supplierId =
          data.supplier && typeof data.supplier === 'object'
            ? data.supplier.id
            : (data.supplier as string) || '';

        setFormData({
          name: data.name || '',
          code: data.code || '',
          fabricType: data.fabricType || '',
          composition: data.composition || '',
          gsm: data.gsm != null ? String(data.gsm) : '',
          width: data.width != null ? String(data.width) : '',
          colour: data.colour || '',
          shade: data.shade || '',
          pantone: data.pantone || '',
          design: data.design || '',
          rate: data.rate != null ? String(data.rate) : '',
          gst: data.gst || '',
          hsnCode: data.hsnCode || '',
          minQuantity: data.minQuantity != null ? String(data.minQuantity) : '',
          supplier: supplierId,
          supplierName:
            data.supplierName ||
            (data.supplier && typeof data.supplier === 'object' ? data.supplier.name : '') ||
            '',
          uomRolls: data.uomRolls !== false,
          uomKg: data.uomKg !== false,
          uomMetres: data.uomMetres !== false,
          status: data.status || 'active',
          remark: data.remark || '',
        });
      } catch (error) {
        console.error('Error fetching fabric:', error);
        toast.error('Failed to load fabric');
        router.push('/catalog/fabric');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFabric();
  }, [params.id, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === formData.supplier);
    const loadingToast = toast.loading('Updating fabric...');
    try {
      setIsSaving(true);
      await updateFabricCatalog(params.id, {
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
      toast.success('Fabric updated successfully', { id: loadingToast });
      router.push('/catalog/fabric');
    } catch (error) {
      console.error('Error updating fabric:', error);
      toast.dismiss(loadingToast);
      alert(error instanceof Error ? error.message : 'Failed to update fabric');
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
      <Seo title="Edit Fabric" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Edit Fabric</h1>
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
                  <span className="text-sm font-medium text-gray-500">Edit Fabric</span>
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
                <label className="form-label">Fabric Type</label>
                <input type="text" name="fabricType" className="form-control" value={formData.fabricType} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Composition</label>
                <input type="text" name="composition" className="form-control" value={formData.composition} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">GSM</label>
                <input type="text" name="gsm" className="form-control" inputMode="decimal" value={formData.gsm} onChange={handleDecimalChange} />
              </div>
              <div>
                <label className="form-label">Width</label>
                <input type="text" name="width" className="form-control" inputMode="decimal" value={formData.width} onChange={handleDecimalChange} />
              </div>
              <div>
                <label className="form-label">Colour</label>
                <input type="text" name="colour" className="form-control" value={formData.colour} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Shade</label>
                <input type="text" name="shade" className="form-control" value={formData.shade} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Pantone</label>
                <input type="text" name="pantone" className="form-control" value={formData.pantone} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Design</label>
                <input type="text" name="design" className="form-control" value={formData.design} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Rate</label>
                <input type="text" name="rate" className="form-control" inputMode="decimal" value={formData.rate} onChange={handleDecimalChange} />
              </div>
              <div>
                <label className="form-label">GST</label>
                <input type="text" name="gst" className="form-control" value={formData.gst} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">HSN Code</label>
                <input type="text" name="hsnCode" className="form-control" value={formData.hsnCode} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Min Quantity</label>
                <input type="text" name="minQuantity" className="form-control" inputMode="decimal" value={formData.minQuantity} onChange={handleDecimalChange} />
              </div>
              <div>
                <label className="form-label">Supplier</label>
                <select name="supplier" className="form-control" value={formData.supplier} onChange={handleInputChange}>
                  <option value="">Select Supplier (optional)</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Supplier Name (fallback)</label>
                <input type="text" name="supplierName" className="form-control" value={formData.supplierName} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
                <label className="form-label">Remark</label>
                <textarea name="remark" className="form-control" rows={3} value={formData.remark} onChange={handleInputChange} />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/fabric')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Fabric'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditFabricPageWrapper({ params }: { params: { id: string } }) {
  return (
    <RequireCrudPermission path="Catalog.Fabric master" action="update">
      <EditFabricPage params={params} />
    </RequireCrudPermission>
  );
}
