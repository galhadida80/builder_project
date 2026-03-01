import { useState, useCallback } from 'react'
import { qrCodeApi } from '../api/qrCodeApi'
import type {
  QRCodeResponse,
  ScanHistoryResponse,
  BulkQRCodeItem,
  ScanHistoryListParams,
} from '../api/qrCodeApi'
import type { PaginatedResponse } from '../api/types'

interface UseQRCodeResult {
  loading: boolean
  error: string | null
  generateQRCode: (
    entityType: string,
    entityId: string,
    format?: 'png' | 'svg',
    size?: number
  ) => Promise<QRCodeResponse | null>
  generateBulkQRCodes: (
    items: BulkQRCodeItem[],
    format?: 'png' | 'svg',
    size?: number
  ) => Promise<QRCodeResponse[] | null>
  generateBulkPDF: (
    items: BulkQRCodeItem[],
    projectId: string,
    language?: 'he' | 'en'
  ) => Promise<Blob | null>
  logScan: (
    projectId: string,
    entityType: string,
    entityId: string
  ) => Promise<ScanHistoryResponse | null>
  getScanHistory: (
    projectId: string,
    params?: ScanHistoryListParams
  ) => Promise<PaginatedResponse<ScanHistoryResponse> | null>
  downloadQRCode: (qrCodeData: string, filename: string) => void
}

export function useQRCode(): UseQRCodeResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateQRCode = useCallback(
    async (
      entityType: string,
      entityId: string,
      format: 'png' | 'svg' = 'png',
      size: number = 300
    ): Promise<QRCodeResponse | null> => {
      try {
        setLoading(true)
        setError(null)
        const result = await qrCodeApi.generateQRCode(entityType, entityId, format, size)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate QR code')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const generateBulkQRCodes = useCallback(
    async (
      items: BulkQRCodeItem[],
      format: 'png' | 'svg' = 'png',
      size: number = 300
    ): Promise<QRCodeResponse[] | null> => {
      try {
        setLoading(true)
        setError(null)
        const result = await qrCodeApi.generateBulkQRCodes({ items, format, size })
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate bulk QR codes')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const generateBulkPDF = useCallback(
    async (
      items: BulkQRCodeItem[],
      projectId: string,
      language: 'he' | 'en' = 'he'
    ): Promise<Blob | null> => {
      try {
        setLoading(true)
        setError(null)
        const result = await qrCodeApi.generateBulkQRCodePDF({ items, projectId, language })
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate QR code PDF')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const logScan = useCallback(
    async (
      projectId: string,
      entityType: string,
      entityId: string
    ): Promise<ScanHistoryResponse | null> => {
      try {
        setLoading(true)
        setError(null)
        const result = await qrCodeApi.logScan(projectId, { entityType, entityId })
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log scan')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const getScanHistory = useCallback(
    async (
      projectId: string,
      params?: ScanHistoryListParams
    ): Promise<PaginatedResponse<ScanHistoryResponse> | null> => {
      try {
        setLoading(true)
        setError(null)
        const result = await qrCodeApi.getScanHistory(projectId, params)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scan history')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const downloadQRCode = useCallback((qrCodeData: string, filename: string) => {
    try {
      if (qrCodeData.startsWith('<svg')) {
        const blob = new Blob([qrCodeData], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        const link = document.createElement('a')
        link.href = qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`
        link.download = filename.endsWith('.png') ? filename : `${filename}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download QR code')
    }
  }, [])

  return {
    loading,
    error,
    generateQRCode,
    generateBulkQRCodes,
    generateBulkPDF,
    logScan,
    getScanHistory,
    downloadQRCode,
  }
}
