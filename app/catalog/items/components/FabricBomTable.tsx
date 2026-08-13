'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { listFabricCatalogs, FabricCatalog } from '@/shared/services/fabricCatalogService';
import {
  FabricBomItem,
  BomSectionCard,
  BomSectionHeader,
  BomTableShell,
  BOM_TABLE_HEAD,
  BomSelectButton,
  BomNumberInput,
  BomDeleteButton,
} from './ProductBomShared';

interface FabricBomTableProps {
  items: FabricBomItem[];
  onChange: (items: FabricBomItem[]) => void;
  disabled?: boolean;
}

const ITEMS_PER_PAGE = 20;

export function FabricBomTable({ items, onChange, disabled }: FabricBomTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [fabrics, setFabrics] = useState<FabricCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const fetchFabrics = useCallback(async (page: number, searchQuery: string) => {
    setLoading(true);
    try {
      const res = await listFabricCatalogs({
        page,
        limit: ITEMS_PER_PAGE,
        search: searchQuery || undefined,
      });
      setFabrics(res.results);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
    } catch {
      setFabrics([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (modalOpen) setCurrentPage(1);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [modalOpen, searchInput]);

  useEffect(() => {
    if (!modalOpen) return;
    fetchFabrics(currentPage, search);
  }, [modalOpen, currentPage, search, fetchFabrics]);

  const openModal = (index: number) => {
    setSelectedRowIndex(index);
    setSearchInput('');
    setSearch('');
    setCurrentPage(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRowIndex(null);
  };

  const selectFabric = (fabric: FabricCatalog) => {
    if (selectedRowIndex === null) return;
    const next = [...items];
    next[selectedRowIndex] = {
      ...next[selectedRowIndex],
      fabricCatalogId: fabric.id,
      fabricName: fabric.name,
      unitCost: Number(fabric.rate) || next[selectedRowIndex]?.unitCost || 0,
    };
    onChange(next);
    closeModal();
  };

  const updateQuantity = (index: number, value: number) => {
    const next = [...items];
    next[index] = { ...next[index], quantity: value };
    onChange(next);
  };

  const addRow = () => {
    onChange([...items, { fabricCatalogId: '', fabricName: '', quantity: 0, unitCost: 0 }]);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <BomSectionCard>
      <BomSectionHeader
        title="Fabrics"
        description="Select fabric from catalog and specify metres per piece"
        addLabel="Add Fabric"
        onAdd={addRow}
        disabled={disabled}
      />
      <BomTableShell>
        <thead>
          <tr className="bg-gray-50/80">
            <th className={`${BOM_TABLE_HEAD} min-w-[220px]`}>Fabric</th>
            <th className={`${BOM_TABLE_HEAD} w-36`}>Metres</th>
            <th className={`${BOM_TABLE_HEAD} w-16 text-right`}> </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-10 px-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <i className="ri-scissors-cut-line text-purple-400 text-lg" />
                  </div>
                  <p className="text-[12px] font-medium text-gray-600">No fabric lines yet</p>
                  <p className="text-[11px] text-gray-400 max-w-xs">
                    Add fabric from the catalog and specify metres required per finished piece.
                  </p>
                  <button
                    type="button"
                    onClick={addRow}
                    className="mt-1 flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100"
                    disabled={disabled}
                  >
                    <i className="ri-add-line" /> Add first fabric
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            items.map((row, index) => {
              const rowDisabled = disabled || !row.fabricCatalogId;
              return (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/40">
                  <td className="px-3 py-2.5">
                    <BomSelectButton
                      label={row.fabricName}
                      placeholder="Select fabric catalog…"
                      onClick={() => openModal(index)}
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <BomNumberInput
                      value={row.quantity}
                      onChange={(v) => updateQuantity(index, v)}
                      disabled={rowDisabled}
                      placeholder="0.00"
                      suffix="m"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <BomDeleteButton onClick={() => removeRow(index)} disabled={disabled} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </BomTableShell>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="fabric-modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} aria-hidden="true" />
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900" id="fabric-modal-title">
                  Select Fabric Catalog
                </h3>
                <button type="button" onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 text-[12px] border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                    placeholder="Search by name, code, type…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3 opacity-60" />
                    <p className="text-[11px] text-gray-500">Loading fabric catalogs…</p>
                  </div>
                ) : fabrics.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-[11px]">No fabric catalogs found</div>
                ) : (
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                          Name
                        </th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                          Code
                        </th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                          Type
                        </th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fabrics.map((fabric) => (
                        <tr key={fabric.id} className="hover:bg-gray-50/50 border-b border-gray-100">
                          <td className="px-3 py-2 text-[12px] font-medium text-gray-900 border border-gray-200">
                            {fabric.name}
                          </td>
                          <td className="px-3 py-2 text-[12px] text-gray-600 border border-gray-200">
                            {fabric.code || '—'}
                          </td>
                          <td className="px-3 py-2 text-[12px] text-gray-600 border border-gray-200">
                            {fabric.fabricType || '—'}
                          </td>
                          <td className="px-3 py-2 text-right border border-gray-200">
                            <button
                              type="button"
                              onClick={() => selectFabric(fabric)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100 transition-colors"
                            >
                              <i className="ri-check-line" />
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalResults > 0 && (
                <div className="flex justify-between border-t border-gray-200 px-4 py-3 text-[11px] text-gray-600">
                  <span>
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalResults)} of {totalResults}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      Prev
                    </button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages || loading}
                      className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </BomSectionCard>
  );
}
