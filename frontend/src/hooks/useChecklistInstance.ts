import { useState, useEffect, useCallback } from 'react'
import { checklistsApi } from '../api/checklists'
import type {
  ChecklistInstance,
  ChecklistItemResponse,
  ChecklistItemResponseCreate,
  ChecklistItemResponseUpdate,
} from '../types'

interface UseChecklistInstanceResult {
  instance: ChecklistInstance | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createResponse: (data: ChecklistItemResponseCreate) => Promise<ChecklistItemResponse>
  updateResponse: (responseId: string, data: ChecklistItemResponseUpdate) => Promise<ChecklistItemResponse>
  uploadFile: (projectId: string, file: File) => Promise<string>
}

export const useChecklistInstance = (instanceId: string | undefined): UseChecklistInstanceResult => {
  const [instance, setInstance] = useState<ChecklistInstance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInstance = useCallback(async () => {
    if (!instanceId) {
      setLoading(false)
      setError('No instance ID provided')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await checklistsApi.getInstance(instanceId)
      setInstance(data)
    } catch (err) {
      console.error('Failed to load checklist instance:', err)
      setError('Failed to load checklist. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => {
    fetchInstance()
  }, [fetchInstance])

  const createResponse = useCallback(
    async (data: ChecklistItemResponseCreate): Promise<ChecklistItemResponse> => {
      if (!instanceId) {
        throw new Error('No instance ID available')
      }

      try {
        const response = await checklistsApi.createResponse(instanceId, data)

        // Optimistically update the instance with the new response
        setInstance((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            responses: [...prev.responses, response],
          }
        })

        return response
      } catch (err) {
        console.error('Failed to create response:', err)
        throw new Error('Failed to save response. Please try again.')
      }
    },
    [instanceId]
  )

  const updateResponse = useCallback(
    async (responseId: string, data: ChecklistItemResponseUpdate): Promise<ChecklistItemResponse> => {
      if (!instanceId) {
        throw new Error('No instance ID available')
      }

      try {
        const updated = await checklistsApi.updateResponse(instanceId, responseId, data)

        // Optimistically update the response in the instance
        setInstance((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            responses: prev.responses.map((r) => (r.id === responseId ? updated : r)),
          }
        })

        return updated
      } catch (err) {
        console.error('Failed to update response:', err)
        throw new Error('Failed to update response. Please try again.')
      }
    },
    [instanceId]
  )

  const uploadFile = useCallback(
    async (projectId: string, file: File): Promise<string> => {
      try {
        const fileAttachment = await checklistsApi.uploadFile(projectId, file)
        return fileAttachment.storagePath
      } catch (err) {
        console.error('Failed to upload file:', err)
        throw new Error('Failed to upload file. Please try again.')
      }
    },
    []
  )

  return {
    instance,
    loading,
    error,
    refetch: fetchInstance,
    createResponse,
    updateResponse,
    uploadFile,
  }
}
