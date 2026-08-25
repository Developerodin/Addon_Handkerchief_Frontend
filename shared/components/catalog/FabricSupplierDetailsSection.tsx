'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CatalogLookupSelectModal } from '@/shared/components/catalog/CatalogLookupSelectModal';
import { FabricCatalog, listFabricCatalogs } from '@/shared/services/fabricCatalogService';
import { FabricSupplierFabricDetail } from '@/shared/services/fabricSupplierService';

export type FabricDetailFormRow = FabricSupplierFabricDetail;

const fabricModalColumns = [
  { key: 'name', label: 'Name', render: (item: FabricCatalog) => item.name },
  {
    key: 'fabricSortNo',
    label: 'Sort No',
    render: (item: FabricCatalog) => item.fabricSortNo || '—',
  },
  {
    key: 'fabricTypeName',
    label: 'Type',
    render: (item: FabricCatalog) => item.fabricTypeName || '—',
  },
  {
    key: 'colourName',
    label: 'Color',
    render: (item: FabricCatalog) => item.colourName || '—',
  },
];

const filterFabricCatalog = (item: FabricCatalog, search: string) => {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [item.name, item.fabricSortNo, item.fabricTypeName, item.colourName].some((value) =>
    String(value ?? '').toLowerCase().includes(query)
  );
};

interface FabricSupplierDetailsSectionProps {
  value: FabricDetailFormRow[];
  onChange: (details: FabricDetailFormRow[]) => void;
}

export function FabricSupplierDetailsSection({ value, onChange }: FabricSupplierDetailsSectionProps) {
  const [fabrics, setFabrics] = useState<FabricCatalog[]>([]);
  const [isLoadingFabrics, setIsLoadingFabrics] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRowIndex, setModalRowIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadFabrics = async () => {
      try {
        setIsLoadingFabrics(true);
        const data = await listFabricCatalogs({ page: 1, limit: 10000, status: 'active' });
        setFabrics(data.results);
      } catch {
        setFabrics([]);
      } finally {
        setIsLoadingFabrics(false);
      }
    };
    loadFabrics();
  }, []);

  const fabricMap = useMemo(
    () =>
      fabrics.reduce<Record<string, FabricCatalog>>((acc, fabric) => {
        acc[fabric.id] = fabric;
        return acc;
      }, {}),
    [fabrics]
  );

  const addFabricDetail = () => {
    onChange([
      {
        fabricCatalogId: '',
        fabricName: '',
        fabricSortNo: '',
        fabricTypeName: '',
        colourName: '',
      },
      ...value,
    ]);
  };

  const removeFabricDetail = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  const openFabricModal = (index: number) => {
    setModalRowIndex(index);
    setModalOpen(true);
  };

  const handleSelectFabric = (fabric: FabricCatalog) => {
    if (modalRowIndex === null) return;
    const duplicate = value.some(
      (detail, idx) => idx !== modalRowIndex && detail.fabricCatalogId === fabric.id
    );
    if (duplicate) {
      alert('This fabric is already added to fabric details');
      return;
    }
    const next = [...value];
    next[modalRowIndex] = {
      fabricCatalogId: fabric.id,
      fabricName: fabric.name || '',
      fabricSortNo: fabric.fabricSortNo || '',
      fabricTypeName: fabric.fabricTypeName || '',
      colourName: fabric.colourName || '',
    };
    onChange(next);
    setModalOpen(false);
    setModalRowIndex(null);
  };

  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Fabric Details</h3>
        <button
          type="button"
          className="ti-btn ti-btn-primary flex items-center gap-1 whitespace-nowrap px-4 py-2"
          onClick={addFabricDetail}
          disabled={isLoadingFabrics || fabrics.length === 0}
        >
          <i className="ri-add-line" /> Add Fabric Detail
        </button>
      </div>

      {isLoadingFabrics && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
          Loading fabric catalog...
        </p>
      )}

      {!isLoadingFabrics && fabrics.length === 0 && (
        <p className="text-sm text-red-500">
          No active fabrics found. Add fabrics in Fabric master before linking them here.
        </p>
      )}

      {value.length === 0 ? (
        <p className="text-sm text-gray-500">
          No fabric details added. Use &quot;Add Fabric Detail&quot; to link fabrics from Fabric master.
        </p>
      ) : (
        value.map((detail, index) => {
          const selectedFabric = detail.fabricCatalogId ? fabricMap[detail.fabricCatalogId] : undefined;
          const displayName = selectedFabric?.name || detail.fabricName || '';
          return (
            <div key={`fabric-detail-${index}`} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
                <div className="md:col-span-3 min-w-0">
                  <label className="form-label">
                    Fabric <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={displayName}
                      onClick={() => !isLoadingFabrics && fabrics.length > 0 && openFabricModal(index)}
                      className="form-control cursor-pointer pr-9 truncate"
                      placeholder="Click to select fabric"
                      disabled={isLoadingFabrics || fabrics.length === 0}
                    />
                    <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm" />
                  </div>
                </div>
                <div className="md:col-span-2 min-w-0">
                  <label className="form-label">Sort No</label>
                  <input
                    type="text"
                    readOnly
                    className="form-control bg-gray-50 truncate"
                    value={selectedFabric?.fabricSortNo || detail.fabricSortNo || '—'}
                  />
                </div>
                <div className="md:col-span-2 min-w-0">
                  <label className="form-label">Type</label>
                  <input
                    type="text"
                    readOnly
                    className="form-control bg-gray-50 truncate"
                    value={selectedFabric?.fabricTypeName || detail.fabricTypeName || '—'}
                  />
                </div>
                <div className="md:col-span-2 min-w-0">
                  <label className="form-label">Color</label>
                  <input
                    type="text"
                    readOnly
                    className="form-control bg-gray-50 truncate"
                    value={selectedFabric?.colourName || detail.colourName || '—'}
                  />
                </div>
                <div className="md:col-span-3 flex md:justify-end">
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger flex items-center gap-1 whitespace-nowrap px-3 py-2 mb-0 w-full md:w-auto"
                    onClick={() => removeFabricDetail(index)}
                  >
                    <i className="ri-delete-bin-line me-1" /> Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      <CatalogLookupSelectModal
        open={modalOpen}
        title="Select Fabric"
        searchPlaceholder="Search by name, sort no, type, color..."
        items={fabrics}
        columns={fabricModalColumns}
        getItemKey={(item) => item.id}
        filterItem={filterFabricCatalog}
        onClose={() => {
          setModalOpen(false);
          setModalRowIndex(null);
        }}
        onSelect={handleSelectFabric}
      />
    </div>
  );
}
