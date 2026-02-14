import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { equipmentTemplatesApi, type EquipmentTemplate } from '../api/equipmentTemplates'
import { materialTemplatesApi, type MaterialTemplate } from '../api/materialTemplates'
import { inspectionsApi } from '../api/inspections'
import { useAuth } from './AuthContext'
import type { InspectionConsultantType } from '../types'

const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const CACHE_KEYS = {
  equipmentTemplates: 'cache_equipment_templates',
  materialTemplates: 'cache_material_templates',
  consultantTypes: 'cache_consultant_types',
} as const

interface CachedItem<T> {
  data: T
  timestamp: number
}

interface ReferenceDataContextType {
  equipmentTemplates: EquipmentTemplate[]
  materialTemplates: MaterialTemplate[]
  consultantTypes: InspectionConsultantType[]
  loading: boolean
  refreshReferenceData: () => void
}

const ReferenceDataContext = createContext<ReferenceDataContextType | undefined>(undefined)

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached: CachedItem<T> = JSON.parse(raw)
    if (Date.now() - cached.timestamp > CACHE_TTL) return null
    return cached.data
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const item: CachedItem<T> = { data, timestamp: Date.now() }
    localStorage.setItem(key, JSON.stringify(item))
  } catch {
    // localStorage full or unavailable
  }
}

function initFromCache() {
  const token = localStorage.getItem('authToken')
  if (!token) return { eq: [], mat: [], con: [], allCached: false }
  const eq = readCache<EquipmentTemplate[]>(CACHE_KEYS.equipmentTemplates) || []
  const mat = readCache<MaterialTemplate[]>(CACHE_KEYS.materialTemplates) || []
  const con = readCache<InspectionConsultantType[]>(CACHE_KEYS.consultantTypes) || []
  const allCached = eq.length > 0 && mat.length > 0 && con.length > 0
  return { eq, mat, con, allCached }
}

export function ReferenceDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const initial = initFromCache()
  const [equipmentTemplates, setEquipmentTemplates] = useState<EquipmentTemplate[]>(initial.eq)
  const [materialTemplates, setMaterialTemplates] = useState<MaterialTemplate[]>(initial.mat)
  const [consultantTypes, setConsultantTypes] = useState<InspectionConsultantType[]>(initial.con)
  const [loading, setLoading] = useState(!initial.allCached)

  const loadAll = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setLoading(false)
      return
    }

    if (!forceRefresh) {
      const cached = initFromCache()
      if (cached.allCached) {
        setEquipmentTemplates(cached.eq)
        setMaterialTemplates(cached.mat)
        setConsultantTypes(cached.con)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    try {
      const [eqTemplates, matTemplates, conTypes] = await Promise.all([
        equipmentTemplatesApi.list(),
        materialTemplatesApi.list(),
        inspectionsApi.getConsultantTypes(),
      ])

      setEquipmentTemplates(eqTemplates)
      setMaterialTemplates(matTemplates)
      setConsultantTypes(conTypes)

      writeCache(CACHE_KEYS.equipmentTemplates, eqTemplates)
      writeCache(CACHE_KEYS.materialTemplates, matTemplates)
      writeCache(CACHE_KEYS.consultantTypes, conTypes)
    } catch {
      console.error('Failed to load reference data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadAll()
    }
  }, [loadAll, user])

  const refreshReferenceData = useCallback(() => {
    loadAll(true)
  }, [loadAll])

  const value = useMemo(
    () => ({ equipmentTemplates, materialTemplates, consultantTypes, loading, refreshReferenceData }),
    [equipmentTemplates, materialTemplates, consultantTypes, loading, refreshReferenceData]
  )

  return (
    <ReferenceDataContext.Provider value={value}>
      {children}
    </ReferenceDataContext.Provider>
  )
}

export function useReferenceData() {
  const context = useContext(ReferenceDataContext)
  if (!context) {
    throw new Error('useReferenceData must be used within a ReferenceDataProvider')
  }
  return context
}
