import { API_BASE_URL } from '@/shared/data/utilities/api'
import Cookies from 'js-cookie'
import type { StyleCode } from './styleCodeService'

export interface StyleCodeComboComponent {
  styleCode: string | StyleCode
  quantity: number
}

export interface StyleCodeCombo {
  id: string
  comboCode: string
  eanCode: string
  mrp: number
  brand?: string
  pack?: string
  components: StyleCodeComboComponent[]
  status: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

export interface StyleCodeComboQueryParams {
  comboCode?: string
  eanCode?: string
  status?: 'active' | 'inactive'
  search?: string
  sortBy?: string
  limit?: number
  page?: number
}

export interface PaginatedStyleCodeCombos {
  results: StyleCodeCombo[]
  page: number
  limit: number
  totalPages: number
  totalResults: number
}

export type StyleCodeComboCreatePayload = {
  comboCode: string
  eanCode: string
  mrp: number
  brand?: string
  pack?: string
  components: Array<{ styleCode: string; quantity: number }>
  status?: 'active' | 'inactive'
}

export type StyleCodeComboUpdatePayload = Partial<StyleCodeComboCreatePayload>

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null
  try {
    const tokenFromJsCookie = Cookies.get('accessToken')
    if (tokenFromJsCookie) return tokenFromJsCookie
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'accessToken') return decodeURIComponent(value)
    }
    return null
  } catch (error) {
    console.error('Error reading access token from cookies:', error)
    return null
  }
}

class StyleCodeComboService {
  private baseUrl = `${API_BASE_URL}/style-code-combos`

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken()
    if (!token) {
      throw new Error('No access token found. Please login again.')
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text}`)
    }

    if (res.status === 204) {
      return {} as T
    }

    return (await res.json()) as T
  }

  async list(params?: StyleCodeComboQueryParams): Promise<PaginatedStyleCodeCombos> {
    const searchParams = new URLSearchParams()
    if (params?.comboCode) searchParams.append('comboCode', params.comboCode)
    if (params?.eanCode) searchParams.append('eanCode', params.eanCode)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.page) searchParams.append('page', params.page.toString())

    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    return this.request<PaginatedStyleCodeCombos>(`${query}`)
  }

  async get(comboId: string): Promise<StyleCodeCombo> {
    if (!comboId) throw new Error('comboId is required')
    return this.request<StyleCodeCombo>(`/${comboId}`)
  }

  async create(payload: StyleCodeComboCreatePayload): Promise<StyleCodeCombo> {
    return this.request<StyleCodeCombo>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async update(comboId: string, payload: StyleCodeComboUpdatePayload): Promise<StyleCodeCombo> {
    if (!comboId) throw new Error('comboId is required')
    return this.request<StyleCodeCombo>(`/${comboId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  async remove(comboId: string): Promise<void> {
    if (!comboId) throw new Error('comboId is required')
    await this.request<void>(`/${comboId}`, { method: 'DELETE' })
  }
}

export const styleCodeComboService = new StyleCodeComboService()
