"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'
import Seo from '@/shared/layout-components/seo/seo'
import { styleCodeComboService } from '@/shared/services/styleCodeComboService'
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService'
import { API_BASE_URL } from '@/shared/data/utilities/api'
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission'

type Status = 'active' | 'inactive'

interface ComponentRow {
  styleCodeId: string
  quantity: number | ''
}

interface FormState {
  comboCode: string
  eanCode: string
  mrp: number | ''
  brand: string
  pack: string
  status: Status
}

const AddStyleCodeComboPage = () => {
  const router = useRouter()
  const [brandOptions, setBrandOptions] = useState<string[]>([])
  const [packOptions, setPackOptions] = useState<string[]>([])
  const [styleCodeOptions, setStyleCodeOptions] = useState<StyleCode[]>([])
  const [form, setForm] = useState<FormState>({
    comboCode: '',
    eanCode: '',
    mrp: '',
    brand: '',
    pack: '',
    status: 'active',
  })
  const [components, setComponents] = useState<ComponentRow[]>([{ styleCodeId: '', quantity: 1 }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [attrRes, scRes] = await Promise.all([
          fetch(`${API_BASE_URL}/product-attributes?limit=1000`),
          styleCodeService.list({ limit: 500, sortBy: 'styleCode:asc' }),
        ])
        if (attrRes.ok) {
          const data = await attrRes.json()
          const attributes = data?.results || []
          const getValues = (name: string) =>
            attributes
              .filter((attr: any) => (attr?.name || '').toLowerCase() === name.toLowerCase())
              .flatMap((attr: any) => attr?.optionValues || [])
              .map((val: any) => val?.name)
              .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
          setBrandOptions(getValues('Brand'))
          setPackOptions(getValues('Pack'))
        }
        setStyleCodeOptions(scRes.results || [])
      } catch (error) {
        console.error('Failed to load options', error)
      }
    }
    void fetchOptions()
  }, [])

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}
    if (!form.comboCode.trim()) nextErrors.comboCode = 'Combo code is required'
    if (!form.eanCode.trim()) nextErrors.eanCode = 'EAN is required'
    if (form.mrp === '' || Number(form.mrp) < 0) nextErrors.mrp = 'MRP must be 0 or more'
    const validComponents = components.filter(
      (c) => c.styleCodeId && Number(c.quantity) >= 1
    )
    if (validComponents.length === 0) {
      nextErrors.components = 'Add at least one style code with quantity ≥ 1'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const updateComponent = (index: number, field: keyof ComponentRow, value: string | number) => {
    setComponents((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    if (errors.components) setErrors((prev) => ({ ...prev, components: '' }))
  }

  const addComponentRow = () => {
    setComponents((prev) => [...prev, { styleCodeId: '', quantity: 1 }])
  }

  const removeComponentRow = (index: number) => {
    setComponents((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      setSubmitting(true)
      const payloadComponents = components
        .filter((c) => c.styleCodeId && Number(c.quantity) >= 1)
        .map((c) => ({
          styleCode: c.styleCodeId,
          quantity: Number(c.quantity),
        }))
      await styleCodeComboService.create({
        comboCode: form.comboCode.trim(),
        eanCode: form.eanCode.trim(),
        mrp: Number(form.mrp),
        brand: form.brand.trim() || undefined,
        pack: form.pack.trim() || undefined,
        status: form.status,
        components: payloadComponents,
      })
      toast.success('Combo created')
      router.push('/catalog/style-code-combos')
    } catch (error) {
      console.error('Create failed', error)
      toast.error('Failed to create combo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="main-content">
      <Seo title="Add Style Code Combo" />
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
          <h1 className="text-lg font-semibold text-gray-900">Add Combo</h1>
        </div>
        <Link
          href="/catalog/style-code-combos"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100"
        >
          <i className="ri-arrow-left-line" />
          Back
        </Link>
      </div>

      <div className="box">
        <div className="box-header">
          <h3 className="box-title text-sm font-semibold">Details</h3>
        </div>
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="form-label text-[12px]">Combo Code *</label>
                <input
                  type="text"
                  className={`form-control h-9 text-sm ${errors.comboCode ? 'border-red-500' : ''}`}
                  value={form.comboCode}
                  onChange={(e) => handleChange('comboCode', e.target.value)}
                  placeholder="COMBO-001"
                />
                {errors.comboCode && <p className="text-xs text-red-500 mt-1">{errors.comboCode}</p>}
              </div>
              <div>
                <label className="form-label text-[12px]">EAN *</label>
                <input
                  type="text"
                  className={`form-control h-9 text-sm ${errors.eanCode ? 'border-red-500' : ''}`}
                  value={form.eanCode}
                  onChange={(e) => handleChange('eanCode', e.target.value)}
                  placeholder="EANCOMBO1"
                />
                {errors.eanCode && <p className="text-xs text-red-500 mt-1">{errors.eanCode}</p>}
              </div>
              <div>
                <label className="form-label text-[12px]">MRP *</label>
                <input
                  type="number"
                  min={0}
                  className={`form-control h-9 text-sm ${errors.mrp ? 'border-red-500' : ''}`}
                  value={form.mrp}
                  onChange={(e) => handleChange('mrp', e.target.value ? Number(e.target.value) : '')}
                  placeholder="399"
                />
                {errors.mrp && <p className="text-xs text-red-500 mt-1">{errors.mrp}</p>}
              </div>
              <div>
                <label className="form-label text-[12px]">Brand</label>
                <select
                  className="form-select h-9 text-sm"
                  value={form.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                >
                  <option value="">Select brand</option>
                  {brandOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {form.brand && !brandOptions.includes(form.brand) && (
                    <option value={form.brand}>{form.brand}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label text-[12px]">Pack</label>
                <select
                  className="form-select h-9 text-sm"
                  value={form.pack}
                  onChange={(e) => handleChange('pack', e.target.value)}
                >
                  <option value="">Select pack</option>
                  {packOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {form.pack && !packOptions.includes(form.pack) && (
                    <option value={form.pack}>{form.pack}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label text-[12px]">Status</label>
                <select
                  className="form-select h-9 text-sm"
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className={errors.components ? 'border border-red-200 rounded p-3' : ''}>
              <div className="flex items-center justify-between mb-2">
                <label className="form-label text-[12px] mb-0">Components *</label>
                <button
                  type="button"
                  onClick={addComponentRow}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded border border-gray-200 bg-gray-50 hover:bg-gray-100"
                >
                  <i className="ri-add-line" />
                  Add row
                </button>
              </div>
              <div className="space-y-2">
                {components.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_120px_40px] gap-2 items-end">
                    <div>
                      <label className="form-label text-[11px]">Style code</label>
                      <select
                        className="form-select h-9 text-sm"
                        value={row.styleCodeId}
                        onChange={(e) => updateComponent(index, 'styleCodeId', e.target.value)}
                        disabled={submitting}
                      >
                        <option value="">Select style code</option>
                        {styleCodeOptions.map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.styleCode}
                            {sc.eanCode ? ` (${sc.eanCode})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label text-[11px]">Qty</label>
                      <input
                        type="number"
                        min={1}
                        className="form-control h-9 text-sm"
                        value={row.quantity}
                        onChange={(e) =>
                          updateComponent(
                            index,
                            'quantity',
                            e.target.value ? Number(e.target.value) : ''
                          )
                        }
                        disabled={submitting}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeComponentRow(index)}
                      disabled={submitting || components.length <= 1}
                      className="h-9 w-9 flex items-center justify-center rounded border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40"
                      title="Remove"
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.components && (
                <p className="text-xs text-red-500 mt-2">{errors.components}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Link
                href="/catalog/style-code-combos"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-purple-200 bg-purple-600 text-white text-[12px] font-semibold hover:bg-purple-700"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AddStyleCodeComboPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Style codes" action="create">
      <AddStyleCodeComboPage />
    </RequireCrudPermission>
  )
}
