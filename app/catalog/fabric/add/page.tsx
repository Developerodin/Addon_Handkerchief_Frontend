'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { filterDecimalInput } from '@/shared/utils/formInputFilters';
import { createFabricCatalog } from '@/shared/services/fabricCatalogService';
import { CatalogLookupField } from '@/shared/components/catalog/CatalogLookupField';
import { fabricCatalogLookupFields, fabricWeaveItems } from '@/shared/config/fabricCatalogLookupFields';
import {
  FABRIC_DESIGN_OPTIONS,
  FABRIC_FINISH_OPTIONS,
  FABRIC_WASH_OPTIONS,
} from '@/shared/constants/handkerchiefCatalog';
import {
  fabricTypeApi,
  fabricColorApi,
  fabricQualityApi,
  fabricYarnApi,
  fabricCountApi,
  fabricMeasurementApi,
  FabricColorLookup,
  FabricCountLookup,
  FabricMeasurementLookup,
  FabricQualityLookup,
  FabricTypeLookup,
  FabricYarnLookup,
} from '@/shared/services/fabricLookupService';

const AddFabricPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [fabricTypes, setFabricTypes] = useState<FabricTypeLookup[]>([]);
  const [colors, setColors] = useState<FabricColorLookup[]>([]);
  const [qualities, setQualities] = useState<FabricQualityLookup[]>([]);
  const [yarns, setYarns] = useState<FabricYarnLookup[]>([]);
  const [counts, setCounts] = useState<FabricCountLookup[]>([]);
  const [measurements, setMeasurements] = useState<FabricMeasurementLookup[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    fabricSortNo: '',
    millOldFabricSortNo: '',
    millNewFabricSortNo: '',
    fabricType: '',
    color: '',
    quality: '',
    yarn: '',
    count: '',
    construction: '',
    weave: '',
    design: '',
    wash: '',
    finish: '',
    glm: '',
    glmMeasurement: '',
    finishedWidth: '',
    finishedWidthMeasurement: '',
    rate: '',
    gst: '',
    hsnCode: '',
    minQuantity: '',
    status: 'active' as 'active' | 'inactive',
    remark: '',
  });

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [typesData, colorsData, qualitiesData, yarnsData, countsData, measurementsData] =
          await Promise.all([
            fabricTypeApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricColorApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricQualityApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricYarnApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricCountApi.list({ page: 1, limit: 1000, status: 'active' }),
            fabricMeasurementApi.list({ page: 1, limit: 1000, status: 'active' }),
          ]);
        setFabricTypes(typesData.results);
        setColors(colorsData.results);
        setQualities(qualitiesData.results);
        setYarns(yarnsData.results);
        setCounts(countsData.results);
        setMeasurements(measurementsData.results);
      } catch {
        // Non-critical
      }
    };
    loadLookups();
  }, []);

  const weightMeasurements = measurements.filter((m) => m.category === 'weight');
  const lengthMeasurements = measurements.filter((m) => m.category === 'length');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDecimalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: filterDecimalInput(value) }));
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    fabricSortNo: formData.fabricSortNo.trim(),
    millOldFabricSortNo: formData.millOldFabricSortNo.trim(),
    millNewFabricSortNo: formData.millNewFabricSortNo.trim(),
    fabricType: formData.fabricType || null,
    color: formData.color || null,
    quality: formData.quality || null,
    yarn: formData.yarn || null,
    count: formData.count || null,
    construction: formData.construction.trim(),
    weave: formData.weave.trim(),
    design: formData.design,
    wash: formData.wash,
    finish: formData.finish,
    glm: formData.glm === '' ? 0 : Number(formData.glm),
    glmMeasurement: formData.glmMeasurement || null,
    finishedWidth: formData.finishedWidth === '' ? 0 : Number(formData.finishedWidth),
    finishedWidthMeasurement: formData.finishedWidthMeasurement || null,
    rate: formData.rate === '' ? 0 : Number(formData.rate),
    gst: formData.gst.trim(),
    hsnCode: formData.hsnCode.trim(),
    minQuantity: formData.minQuantity === '' ? 0 : Number(formData.minQuantity),
    status: formData.status,
    remark: formData.remark.trim(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    try {
      setIsLoading(true);
      await createFabricCatalog(buildPayload());
      toast.success('Fabric created successfully');
      router.push('/catalog/fabric');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create fabric');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content catalog-master-form">
      <Toaster position="top-right" />
      <Seo title="Add Fabric" />
      <div className="box !bg-transparent border-0 shadow-none">
        <div className="box-header flex justify-between items-center">
          <h1 className="box-title text-2xl font-semibold">Add Fabric</h1>
          <Link href="/catalog/fabric" className="text-sm text-gray-500 hover:text-primary">
            Fabric master
          </Link>
        </div>
      </div>
      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fabric Sort No.</label>
              <input name="fabricSortNo" className="form-control" value={formData.fabricSortNo} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Mill Old Fabric Sort No.</label>
              <input name="millOldFabricSortNo" className="form-control" value={formData.millOldFabricSortNo} onChange={handleInputChange} placeholder="e.g. 17223" />
            </div>
            <div className="form-group">
              <label className="form-label">Mill New Fabric Sort No.</label>
              <input name="millNewFabricSortNo" className="form-control" value={formData.millNewFabricSortNo} onChange={handleInputChange} placeholder="e.g. AW0017223AB0586" />
            </div>
            <CatalogLookupField
              label="Fabric Type"
              value={formData.fabricType}
              items={fabricTypes}
              onChange={(id) => setFormData((prev) => ({ ...prev, fabricType: id }))}
              {...fabricCatalogLookupFields.fabricType}
            />
            <CatalogLookupField
              label="Color"
              value={formData.color}
              items={colors}
              onChange={(id) => setFormData((prev) => ({ ...prev, color: id }))}
              {...fabricCatalogLookupFields.color}
            />
            <CatalogLookupField
              label="Quality"
              value={formData.quality}
              items={qualities}
              onChange={(id) => setFormData((prev) => ({ ...prev, quality: id }))}
              {...fabricCatalogLookupFields.quality}
            />
            <CatalogLookupField
              label="Yarn"
              value={formData.yarn}
              items={yarns}
              onChange={(id) => setFormData((prev) => ({ ...prev, yarn: id }))}
              {...fabricCatalogLookupFields.yarn}
            />
            <CatalogLookupField
              label="Count"
              value={formData.count}
              items={counts}
              onChange={(id) => setFormData((prev) => ({ ...prev, count: id }))}
              {...fabricCatalogLookupFields.count}
            />
            <div className="form-group">
              <label className="form-label">Construction</label>
              <input name="construction" className="form-control" value={formData.construction} onChange={handleInputChange} />
            </div>
            <CatalogLookupField
              label="Weave"
              value={formData.weave}
              items={
                formData.weave && !fabricWeaveItems.some((item) => item.id === formData.weave)
                  ? [...fabricWeaveItems, { id: formData.weave, name: formData.weave }]
                  : fabricWeaveItems
              }
              onChange={(id) => setFormData((prev) => ({ ...prev, weave: id }))}
              {...fabricCatalogLookupFields.weave}
            />
            <div className="form-group">
              <label className="form-label">Design</label>
              <select name="design" className="form-select" value={formData.design} onChange={handleInputChange}>
                {FABRIC_DESIGN_OPTIONS.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Wash</label>
              <select name="wash" className="form-select" value={formData.wash} onChange={handleInputChange}>
                {FABRIC_WASH_OPTIONS.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Finish</label>
              <select name="finish" className="form-select" value={formData.finish} onChange={handleInputChange}>
                {FABRIC_FINISH_OPTIONS.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">GLM (weight)</label>
              <input name="glm" className="form-control" inputMode="decimal" value={formData.glm} onChange={handleDecimalChange} />
            </div>
            <CatalogLookupField
              label="GLM Measurement"
              value={formData.glmMeasurement}
              items={weightMeasurements}
              onChange={(id) => setFormData((prev) => ({ ...prev, glmMeasurement: id }))}
              {...fabricCatalogLookupFields.measurement}
              modalTitle="Select GLM Measurement"
            />
            <div className="form-group">
              <label className="form-label">Finished Width</label>
              <input name="finishedWidth" className="form-control" inputMode="decimal" value={formData.finishedWidth} onChange={handleDecimalChange} />
            </div>
            <CatalogLookupField
              label="Finished Width Measurement"
              value={formData.finishedWidthMeasurement}
              items={lengthMeasurements}
              onChange={(id) => setFormData((prev) => ({ ...prev, finishedWidthMeasurement: id }))}
              {...fabricCatalogLookupFields.measurement}
              modalTitle="Select Finished Width Measurement"
            />
            <div className="form-group">
              <label className="form-label">Rate</label>
              <input name="rate" className="form-control" inputMode="decimal" value={formData.rate} onChange={handleDecimalChange} />
            </div>
            <div className="form-group">
              <label className="form-label">GST</label>
              <input name="gst" className="form-control" value={formData.gst} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">HSN Code</label>
              <input name="hsnCode" className="form-control" value={formData.hsnCode} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Quantity in Kg</label>
              <input name="minQuantity" className="form-control" inputMode="decimal" value={formData.minQuantity} onChange={handleDecimalChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select name="status" className="form-select" value={formData.status} onChange={handleInputChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label">Remarks</label>
              <textarea name="remark" className="form-control" rows={3} value={formData.remark} onChange={handleInputChange} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="ti-btn ti-btn-primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Fabric'}
              </button>
              <button type="button" className="ti-btn ti-btn-secondary" onClick={() => router.push('/catalog/fabric')}>
                Cancel
              </button>
            </div>
          </form>
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
