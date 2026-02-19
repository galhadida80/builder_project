import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useChecklistInstance } from './useChecklistInstance'
import { checklistsApi } from '../api/checklists'
import type { ChecklistInstance, ChecklistItemResponse } from '../types'

vi.mock('../api/checklists', () => ({
  checklistsApi: {
    getInstance: vi.fn(),
    createResponse: vi.fn(),
    updateResponse: vi.fn(),
    uploadFile: vi.fn(),
  },
}))

const mockInstance: ChecklistInstance = {
  id: 'instance-1',
  template_id: 'template-1',
  project_id: 'project-1',
  unit_identifier: 'Unit A',
  status: 'in_progress',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  responses: [],
}

const mockResponse: ChecklistItemResponse = {
  id: 'response-1',
  instance_id: 'instance-1',
  item_template_id: 'item-1',
  status: 'approved',
  notes: 'Test note',
  image_urls: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('useChecklistInstance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches instance data on mount', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    expect(result.current.loading).toBe(true)
    expect(result.current.instance).toBe(null)
    expect(result.current.error).toBe(null)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.instance).toEqual(mockInstance)
    expect(result.current.error).toBe(null)
    expect(checklistsApi.getInstance).toHaveBeenCalledWith('project-1', 'instance-1')
  })

  it('handles loading state correctly', async () => {
    vi.mocked(checklistsApi.getInstance).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockInstance), 100))
    )

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('handles error state when fetch fails', async () => {
    vi.mocked(checklistsApi.getInstance).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load checklist. Please try again.')
    expect(result.current.instance).toBe(null)
  })

  it('handles undefined instanceId', async () => {
    const { result } = renderHook(() => useChecklistInstance(undefined, undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('No instance ID provided')
    expect(result.current.instance).toBe(null)
  })

  it('creates response and updates instance optimistically', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.createResponse).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const responseData = {
      item_template_id: 'item-1',
      status: 'approved' as const,
      notes: 'Test note',
      image_urls: [],
    }

    let response: ChecklistItemResponse | undefined
    await act(async () => {
      response = await result.current.createResponse(responseData)
    })

    expect(response).toEqual(mockResponse)
    expect(checklistsApi.createResponse).toHaveBeenCalledWith('instance-1', responseData)
    expect(result.current.instance?.responses).toContainEqual(mockResponse)
  })

  it('updates response and updates instance optimistically', async () => {
    const instanceWithResponse = {
      ...mockInstance,
      responses: [mockResponse],
    }

    vi.mocked(checklistsApi.getInstance).mockResolvedValue(instanceWithResponse)

    const updatedResponse = {
      ...mockResponse,
      status: 'rejected' as const,
      notes: 'Updated note',
    }

    vi.mocked(checklistsApi.updateResponse).mockResolvedValue(updatedResponse)

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updateData = {
      status: 'rejected' as const,
      notes: 'Updated note',
    }

    let response: ChecklistItemResponse | undefined
    await act(async () => {
      response = await result.current.updateResponse('response-1', updateData)
    })

    expect(response).toEqual(updatedResponse)
    expect(checklistsApi.updateResponse).toHaveBeenCalledWith('instance-1', 'response-1', updateData)

    const updatedResponseInInstance = result.current.instance?.responses.find((r) => r.id === 'response-1')
    expect(updatedResponseInInstance?.status).toBe('rejected')
    expect(updatedResponseInInstance?.notes).toBe('Updated note')
  })

  it('uploads file and returns storage path', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.uploadFile).mockResolvedValue({
      id: 'file-1',
      storagePath: 'uploads/test.jpg',
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      projectId: 'project-1',
      uploadedBy: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
    } as never)

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const storagePath = await result.current.uploadFile('project-1', file)

    expect(storagePath).toBe('file-1')
    expect(checklistsApi.uploadFile).toHaveBeenCalledWith('project-1', file)
  })

  it('handles createResponse error', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.createResponse).mockRejectedValue(new Error('API error'))

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const responseData = {
      item_template_id: 'item-1',
      status: 'approved' as const,
      notes: 'Test',
      image_urls: [],
    }

    await expect(result.current.createResponse(responseData)).rejects.toThrow(
      'Failed to save response. Please try again.'
    )
  })

  it('handles updateResponse error', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.updateResponse).mockRejectedValue(new Error('API error'))

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updateData = {
      status: 'rejected' as const,
    }

    await expect(result.current.updateResponse('response-1', updateData)).rejects.toThrow(
      'Failed to update response. Please try again.'
    )
  })

  it('handles uploadFile error', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.uploadFile).mockRejectedValue(new Error('Upload failed'))

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await expect(result.current.uploadFile('project-1', file)).rejects.toThrow(
      'Failed to upload file. Please try again.'
    )
  })

  it('refetches data when refetch is called', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)

    const { result } = renderHook(() => useChecklistInstance('project-1', 'instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(checklistsApi.getInstance).toHaveBeenCalledTimes(1)

    await result.current.refetch()

    expect(checklistsApi.getInstance).toHaveBeenCalledTimes(2)
  })

  it('throws error when createResponse called without instanceId', async () => {
    const { result } = renderHook(() => useChecklistInstance(undefined, undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const responseData = {
      item_template_id: 'item-1',
      status: 'approved' as const,
      notes: '',
      image_urls: [],
    }

    await expect(result.current.createResponse(responseData)).rejects.toThrow('No instance ID available')
  })

  it('throws error when updateResponse called without instanceId', async () => {
    const { result } = renderHook(() => useChecklistInstance(undefined, undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updateData = {
      status: 'rejected' as const,
    }

    await expect(result.current.updateResponse('response-1', updateData)).rejects.toThrow(
      'No instance ID available'
    )
  })
})
