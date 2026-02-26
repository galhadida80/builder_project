import { apiClient } from './client'
import type { QuantityExtractionResponse } from '../types'

export const quantityExtractionApi = {
  extract: async (file: File, language: string = 'he'): Promise<QuantityExtractionResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(
      `/tools/extract-quantities?language=${language}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      },
    )
    return response.data
  },
}
