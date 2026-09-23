"use client"
import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast, Toaster } from 'react-hot-toast'
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService'
import { listProducts, ProductListItem } from '@/shared/services/productService'
import { API_BASE_URL } from '@/shared/data/utilities/api'
import { RawMaterialBomTable, RawMaterialBomItem } from '@/app/catalog/items/components/RawMaterialBomTable'
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission'
import { CatalogMasterFormPage } from '@/shared/components/catalog/CatalogMasterFormPage'
import { UiFormFooter } from '@/shared/components/ui'

type Status = 'active' | 'inactive'

interface FormState {
  styleCode: string
  eanCode: string
  mrp: number | ''
  brand: string
  pack: string
  bundleQty: number | ''
  cartonQty: number | ''
  linkedItem: string
  status: Status
}

const resolveLinkedItemId = (linked?: StyleCode['linkedItem']): string => {
  if (!linked) return ''
  if (typeof linked === 'string') return linked
  return linked.id || linked._id || ''
}

const EditStyleCodePage = () => {
  const router = useRouter()
  const params = useParams()
  const styleCodeId = params?.id as string
  const [brandOptions, setBrandOptions] = useState<string[]>([])
  const [packOptions, setPackOptions] = useState<string[]>([])
  const [productOptions, setProductOptions] = useState<ProductListItem[]>([])

  const [form, setForm] = useState<FormState>({
    styleCode: '',
    eanCode: '',
    mrp: '',
    brand: '',
    pack: '',
    bundleQty: 60,
    cartonQty: 120,
    linkedItem: '',
    status: 'active',
  })
  const [bomItems, setBomItems] = useState<RawMaterialBomItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (styleCodeId) {
      void loadStyleCode(styleCodeId)
    }
  }, [styleCodeId])

  useEffect(() => {
    const fetchBrandPack = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/product-attributes?limit=1000`)
        if (!res.ok) throw new Error('Failed to fetch attributes')
        const data = await res.json()
        const attributes = data?.results || []
        const getValues = (name: string) =>
          attributes
            .filter((attr: any) => (attr?.name || '').toLowerCase() === name.toLowerCase())
            .flatMap((attr: any) => attr?.optionValues || [])
            .map((val: any) => val?.name)
            .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
        setBrandOptions(getValues('Brand'))
        setPackOptions(getValues('Pack'))
      } catch (error) {
        console.error('Failed to load brand/pack options', error)
      }
    }
    const fetchProducts = async () => {
      try {
        const resp = await listProducts({ page: 1, limit: 200 })
        setProductOptions(resp.results || [])
      } catch (error) {
        console.error('Failed to load products', error)
      }
    }
    fetchBrandPack()
    void fetchProducts()
  }, [])

  const loadStyleCode = async (id: string) => {
    try {
      setLoading(true)
      const data = await styleCodeService.get(id)
      setForm({
        styleCode: data.styleCode,
        eanCode: data.eanCode,
        mrp: data.mrp,
        brand: data.brand || '',
        pack: data.pack || '',
        bundleQty: data.bundleQty ?? 60,
        cartonQty: data.cartonQty ?? 120,
        linkedItem: resolveLinkedItemId(data.linkedItem),
        status: data.status,
      })
      const rawBom = (data as any).bom
      if (Array.isArray(rawBom) && rawBom.length > 0) {
        setBomItems(
          rawBom.map((b: any) => {
            const rm = b.rawMaterial
            const id = typeof rm === 'string' ? rm : rm?._id ?? rm?.id ?? ''
            const name = typeof rm === 'object' && rm ? rm.name ?? '' : ''
            return {
              rawMaterialId: id,
              rawMaterialName: name,
              quantity: Number(b.quantity) ?? 0,
            }
          })
        )
      }
    } catch (error) {
      console.error('Failed to load style code', error)
      toast.error('Failed to load style code')
      router.push('/catalog/style-codes')
    } finally {
      setLoading(false)
    }
  }

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}
    if (!form.styleCode.trim()) nextErrors.styleCode = 'Style code is required'
    if (!form.eanCode.trim()) nextErrors.eanCode = 'EAN is required'
    if (form.mrp === '' || Number(form.mrp) < 0) nextErrors.mrp = 'MRP must be 0 or more'
    if (form.bundleQty === '' || Number(form.bundleQty) < 1) nextErrors.bundleQty = 'Bundle qty must be at least 1'
    if (form.cartonQty === '' || Number(form.cartonQty) < 1) nextErrors.cartonQty = 'Carton qty must be at least 1'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!styleCodeId) return
    try {
      setSubmitting(true)
      const bom =
        bomItems
          .filter((rm) => rm.rawMaterialId && (rm.quantity ?? 0) >= 0)
          .map((rm) => ({
            rawMaterial: rm.rawMaterialId,
            quantity: Number(rm.quantity),
          })) || []
      await styleCodeService.update(styleCodeId, {
        styleCode: form.styleCode.trim(),
        eanCode: form.eanCode.trim(),
        mrp: Number(form.mrp),
        brand: form.brand.trim() || undefined,
        pack: form.pack.trim() || undefined,
        bundleQty: Number(form.bundleQty),
        cartonQty: Number(form.cartonQty),
        linkedItem: form.linkedItem.trim() || null,
        status: form.status,
        bom,
      })
      toast.success('Style code updated')
      router.push('/catalog/style-codes')
    } catch (error) {
      console.error('Update failed', error)
      toast.error('Failed to update style code')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="main-content catalog-master-form">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      <CatalogMasterFormPage
        seoTitle="Edit Style Code"
        title="Edit Style Code"
        listHref="/catalog/style-codes"
        listLabel="Style codes"
        currentLabel="Edit Style Code"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="form-label required">Style Code</label>
              <input
                type="text"
                className={`form-control ${errors.styleCode ? 'border-red-500' : ''}`}
                value={form.styleCode}
                onChange={(e) => handleChange('styleCode', e.target.value)}
                placeholder="SC-001"
              />
              {errors.styleCode && <p className="text-xs text-red-500 mt-1">{errors.styleCode}</p>}
            </div>
            <div>
              <label className="form-label required">EAN</label>
              <input
                type="text"
                className={`form-control ${errors.eanCode ? 'border-red-500' : ''}`}
                value={form.eanCode}
                onChange={(e) => handleChange('eanCode', e.target.value)}
                placeholder="EAN123"
              />
              {errors.eanCode && <p className="text-xs text-red-500 mt-1">{errors.eanCode}</p>}
            </div>
            <div>
              <label className="form-label required">MRP</label>
              <input
                type="number"
                min={0}
                className={`form-control ${errors.mrp ? 'border-red-500' : ''}`}
                value={form.mrp}
                onChange={(e) => handleChange('mrp', Number(e.target.value))}
                placeholder="199"
              />
              {errors.mrp && <p className="text-xs text-red-500 mt-1">{errors.mrp}</p>}
            </div>
            <div>
              <label className="form-label">Brand</label>
              <select
                className="form-select"
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
              <label className="form-label">Pack</label>
              <select
                className="form-select"
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
              <label className="form-label required">Bundle Qty</label>
              <input
                type="number"
                min={1}
                className={`form-control ${errors.bundleQty ? 'border-red-500' : ''}`}
                value={form.bundleQty}
                onChange={(e) => handleChange('bundleQty', e.target.value ? Number(e.target.value) : '')}
                placeholder="60"
              />
              {errors.bundleQty && <p className="text-xs text-red-500 mt-1">{errors.bundleQty}</p>}
            </div>
            <div>
              <label className="form-label required">Carton Qty</label>
              <input
                type="number"
                min={1}
                className={`form-control ${errors.cartonQty ? 'border-red-500' : ''}`}
                value={form.cartonQty}
                onChange={(e) => handleChange('cartonQty', e.target.value ? Number(e.target.value) : '')}
                placeholder="120"
              />
              {errors.cartonQty && <p className="text-xs text-red-500 mt-1">{errors.cartonQty}</p>}
            </div>
            <div>
              <label className="form-label">Linked Item</label>
              <select
                className="form-select"
                value={form.linkedItem}
                onChange={(e) => handleChange('linkedItem', e.target.value)}
              >
                <option value="">None</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.factoryCode || p.id}
                  </option>
                ))}
                {form.linkedItem && !productOptions.some((p) => p.id === form.linkedItem) && (
                  <option value={form.linkedItem}>{form.linkedItem}</option>
                )}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <RawMaterialBomTable
            items={bomItems}
            onChange={setBomItems}
            disabled={submitting}
          />

          <UiFormFooter
            submitLabel="Update"
            isLoading={submitting}
            onCancel={() => router.push('/catalog/style-codes')}
          />
        </form>
      </CatalogMasterFormPage>
    </>
  )
}

export default function EditStyleCodePageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Style codes" action="update">
      <EditStyleCodePage />
    </RequireCrudPermission>
  )
}
