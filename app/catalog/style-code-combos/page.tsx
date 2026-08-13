"use client"
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast, Toaster } from 'react-hot-toast'
import Seo from '@/shared/layout-components/seo/seo'
import {
  styleCodeComboService,
  StyleCodeCombo,
} from '@/shared/services/styleCodeComboService'
import { styleCodeService } from '@/shared/services/styleCodeService'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useCatalogCrud } from '@/shared/hooks/useCatalogCrud'
import CatalogRowActions from '@/shared/components/catalog/CatalogRowActions'
import CatalogPageSizeSelect from '@/shared/components/catalog/CatalogPageSizeSelect'

type Status = 'active' | 'inactive' | ''

const formatMoney = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const parseStatus = (value: unknown): 'active' | 'inactive' => {
  const v = String(value || '').toLowerCase()
  return v === 'inactive' ? 'inactive' : 'active'
}

const getComponentStyleCodeLabel = (comp: StyleCodeCombo['components'][number]): string => {
  const sc = comp.styleCode
  if (!sc) return ''
  if (typeof sc === 'string') return sc
  return sc.styleCode || sc.id || ''
}

const formatComponentsCell = (combo: StyleCodeCombo): string => {
  const parts = (combo.components || [])
    .map((c) => {
      const code = getComponentStyleCodeLabel(c)
      if (!code) return ''
      return `${code}:${c.quantity ?? 1}`
    })
    .filter(Boolean)
  return parts.join(' | ') || '-'
}

/** Parse "STYLECODE:qty | STYLECODE:qty" into [{ code, quantity }] */
const parseComponentsString = (
  raw: string
): Array<{ code: string; quantity: number }> => {
  return String(raw || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [codePart, qtyPart] = part.split(':')
      const code = String(codePart || '').trim()
      const quantity = Number(qtyPart ?? 1)
      return {
        code,
        quantity: !Number.isNaN(quantity) && quantity >= 1 ? quantity : 1,
      }
    })
    .filter((p) => p.code)
}

const StyleCodeCombosPage = () => {
  const { canCreate, canUpdate, canDelete, canImport, guardDelete } = useCatalogCrud('style-code-combos')
  const [rows, setRows] = useState<StyleCodeCombo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPage(1)
  }, [search, status])

  useEffect(() => {
    void fetchCombos()
  }, [page, limit, search, status])

  const fetchCombos = async () => {
    try {
      setIsLoading(true)
      const resp = await styleCodeComboService.list({
        search: search || undefined,
        status: status || undefined,
        sortBy: 'comboCode:asc',
        limit,
        page,
      })
      setRows(resp.results || [])
      setTotalPages(resp.totalPages || 1)
      setTotalResults(resp.totalResults || 0)
    } catch (error) {
      console.error('Failed to load combos', error)
      toast.error('Failed to load combos')
      setRows([])
      setTotalPages(1)
      setTotalResults(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!guardDelete()) return
    if (!window.confirm('Delete this combo?')) return
    try {
      setDeletingId(id)
      await styleCodeComboService.remove(id)
      toast.success('Combo deleted')
      await fetchCombos()
    } catch (error) {
      console.error('Delete failed', error)
      toast.error('Failed to delete combo')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        ID: '',
        'Combo Code': 'COMBO-001',
        EAN: 'EANCOMBO1',
        MRP: 399,
        Brand: 'Brand A',
        Pack: '2-pack',
        Components: 'SC-001:1 | SC-002:1',
        Status: 'active',
      },
      {
        ID: '',
        'Combo Code': 'COMBO-002',
        EAN: 'EANCOMBO2',
        MRP: 499,
        Brand: 'Brand B',
        Pack: '3-pack',
        Components: 'SC-003:2',
        Status: 'inactive',
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Combos')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, 'style-code-combos-template.xlsx')
    toast.success('Template downloaded')
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const exportLimit = 500
      let allRows: StyleCodeCombo[] = []
      let currentPage = 1
      let totalToFetch = 1

      do {
        const resp = await styleCodeComboService.list({
          sortBy: 'comboCode:asc',
          limit: exportLimit,
          page: currentPage,
        })
        const results = resp.results || []
        allRows = allRows.concat(results)
        totalToFetch = resp.totalResults ?? allRows.length
        if (results.length < exportLimit || allRows.length >= totalToFetch) break
        currentPage += 1
      } while (allRows.length < totalToFetch)

      if (allRows.length === 0) {
        toast.error('No combos to export')
        return
      }

      const exportRows = allRows.map((row) => ({
        ID: row.id,
        'Combo Code': row.comboCode,
        EAN: row.eanCode,
        MRP: row.mrp ?? 0,
        Brand: row.brand ?? '',
        Pack: row.pack ?? '',
        Components: formatComponentsCell(row) === '-' ? '' : formatComponentsCell(row),
        Status: row.status ?? 'active',
      }))
      const ws = XLSX.utils.json_to_sheet(exportRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Combos')
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const filename = `style-code-combos-export-${new Date().toISOString().slice(0, 10)}.xlsx`
      saveAs(blob, filename)
      toast.success(`Exported all ${allRows.length} combo(s)`)
    } catch (error) {
      console.error('Export failed', error)
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const loadStyleCodeMap = async (): Promise<Map<string, string>> => {
    const map = new Map<string, string>()
    let currentPage = 1
    let totalPagesLocal = 1
    do {
      const resp = await styleCodeService.list({
        limit: 500,
        page: currentPage,
        sortBy: 'styleCode:asc',
      })
      for (const sc of resp.results || []) {
        if (sc.styleCode && sc.id) {
          map.set(sc.styleCode.trim().toLowerCase(), sc.id)
        }
      }
      totalPagesLocal = resp.totalPages || 1
      currentPage += 1
    } while (currentPage <= totalPagesLocal)
    return map
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rowsJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet || {}, { defval: '' })
      if (!rowsJson.length) {
        toast.error('No rows found in file')
        return
      }

      const styleCodeMap = await loadStyleCodeMap()

      // Build comboCode -> id lookup for upsert without ID
      const existingByCode = new Map<string, string>()
      {
        let currentPage = 1
        let totalPagesLocal = 1
        do {
          const resp = await styleCodeComboService.list({
            limit: 500,
            page: currentPage,
            sortBy: 'comboCode:asc',
          })
          for (const c of resp.results || []) {
            if (c.comboCode && c.id) existingByCode.set(c.comboCode.trim().toLowerCase(), c.id)
          }
          totalPagesLocal = resp.totalPages || 1
          currentPage += 1
        } while (currentPage <= totalPagesLocal)
      }

      let created = 0
      let updated = 0
      let failed = 0

      for (const row of rowsJson) {
        try {
          const comboCode = String(
            row['Combo Code'] ?? row.comboCode ?? row.ComboCode ?? ''
          ).trim()
          const eanCode = String(row.EAN ?? row.eanCode ?? row['EAN Code'] ?? '').trim()
          const mrp = Number(row.MRP ?? row.mrp ?? 0)
          const brand = String(row.Brand ?? row.brand ?? '').trim()
          const pack = String(row.Pack ?? row.pack ?? '').trim()
          const statusVal = parseStatus(row.Status ?? row.status)
          const id = String(row.ID ?? row.id ?? row.Id ?? '').trim()
          const componentsRaw = String(row.Components ?? row.components ?? '').trim()
          const parsedComponents = parseComponentsString(componentsRaw)

          if (!comboCode || !eanCode || Number.isNaN(mrp) || parsedComponents.length === 0) {
            failed += 1
            continue
          }

          const components: Array<{ styleCode: string; quantity: number }> = []
          let resolveFailed = false
          for (const pc of parsedComponents) {
            const styleCodeId = styleCodeMap.get(pc.code.toLowerCase())
            if (!styleCodeId) {
              resolveFailed = true
              break
            }
            components.push({ styleCode: styleCodeId, quantity: pc.quantity })
          }
          if (resolveFailed || components.length === 0) {
            failed += 1
            continue
          }

          const payload = {
            comboCode,
            eanCode,
            mrp,
            brand: brand || undefined,
            pack: pack || undefined,
            components,
            status: statusVal,
          }

          const existingId = id || existingByCode.get(comboCode.toLowerCase())
          if (existingId) {
            await styleCodeComboService.update(existingId, payload)
            updated += 1
          } else {
            const createdCombo = await styleCodeComboService.create(payload)
            if (createdCombo?.id) existingByCode.set(comboCode.toLowerCase(), createdCombo.id)
            created += 1
          }
        } catch {
          failed += 1
        }
      }

      toast.success(`Imported: ${created} new, ${updated} updated. Failed: ${failed}`)
      await fetchCombos()
    } catch (error) {
      console.error('Import failed', error)
      toast.error('Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Style Code Combos" />
      <Toaster position="top-right" />

      <div className="bg-white shadow-sm border border-gray-100 mx-0 catalog-list-card relative">
        <div className="p-[10px] catalog-list-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Style Code Combos</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/catalog/style-codes"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <i className="ri-arrow-left-line text-xs" />
                Style Codes
              </Link>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search combo / EAN / brand..."
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <CatalogPageSizeSelect
                value={limit}
                onChange={(v) => {
                  setLimit(v)
                  setPage(1)
                }}
                options={[10, 20, 50, 100]}
              />
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <i className="ri-download-line text-xs" />
                Template
              </button>
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-file-excel-2-line text-xs" />
                )}
                Export All
              </button>
              {canImport && (
                <>
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isImporting ? (
                      <i className="ri-loader-4-line text-xs animate-spin" />
                    ) : (
                      <i className="ri-upload-cloud-line text-xs" />
                    )}
                    Import
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImport}
                  />
                </>
              )}
              {canCreate && (
                <Link
                  href="/catalog/style-code-combos/add"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs" />
                  Add Combo
                </Link>
              )}
            </div>
          </div>
        </div>

        {isImporting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 rounded">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200 border-t-purple-600 mb-3" />
            <p className="text-[11px] font-bold text-gray-700">Importing Excel…</p>
            <p className="text-[10px] text-gray-500 mt-1">Resolving style codes and upserting</p>
          </div>
        )}

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-stack-line text-xl text-gray-200" />
              </div>
              <h3 className="text-[11px] font-bold text-gray-400 mb-1">No combos found</h3>
              <p className="text-[10px] text-gray-500">Try adjusting search or filters.</p>
              {canCreate && (
                <Link
                  href="/catalog/style-code-combos/add"
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <i className="ri-add-line text-xs" />
                  Add First Combo
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Combo Code
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    EAN
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    MRP
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Brand
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Pack
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Components
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Status
                  </th>
                  {(canUpdate || canDelete) && (
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                      {row.comboCode}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-700 border border-gray-200">
                      {row.eanCode}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-700 border border-gray-200">
                      {formatMoney(row.mrp)}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {row.brand || '-'}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {row.pack || '-'}
                    </td>
                    <td className="px-1.5 py-2.5 text-[11px] font-medium text-gray-600 border border-gray-200 max-w-[280px]">
                      {formatComponentsCell(row)}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                          row.status === 'active'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            row.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <CatalogRowActions
                          segment="style-code-combos"
                          editHref={`/catalog/style-code-combos/edit/${row.id}`}
                          onDelete={() => handleDelete(row.id)}
                          deleteDisabled={deletingId === row.id}
                          deleteLoading={deletingId === row.id}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && rows.length > 0 && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalResults)} of{' '}
              {totalResults} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => page > 1 && setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="text-[11px] font-medium text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => page < totalPages && setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StyleCodeCombosPage
