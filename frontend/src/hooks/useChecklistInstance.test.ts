import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChecklistInstance } from './useChecklistInstance'
import { checklistsApi } from '../api/checklists'
import type { ChecklistInstance, ChecklistItemResponse } from '../types'

// Mock the API
vi.mock('../api/checklists', () => ({
  checklistsApi: {
    getInstance: vi.fn(),
    createResponse: vi.fn(),
    updateResponse: vi.fn(),
    uploadFile: vi.fn(),
  },
}))

// Mock data
const mockInstance: ChecklistInstance = {
  id: 'instance-1',
  checklistTemplateId: 'template-1',
  projectId: 'project-1',
  inspectionId: 'inspection-1',
  status: 'in_progress',
  startedAt: '2024-01-01T00:00:00Z',
  completedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  subsections: [],
  responses: [],
  template: {
    id: 'template-1',
    name: 'Safety Inspection',
    description: 'Standard safety checklist',
    category: 'safety',
    version: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
}

const mockResponse: ChecklistItemResponse = {
  id: 'response-1',
  checklistInstanceId: 'instance-1',
  itemTemplateId: 'item-1',
  status: 'pass',
  notes: 'Test note',
  imageUrls: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('useChecklistInstance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches instance data on mount', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.instance).toBe(null)
    expect(result.current.error).toBe(null)

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.instance).toEqual(mockInstance)
    expect(result.current.error).toBe(null)
    expect(checklistsApi.getInstance).toHaveBeenCalledWith('instance-1')
  })

  it('handles loading state correctly', async () => {
    vi.mocked(checklistsApi.getInstance).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockInstance), 100))
    )

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('handles error state when fetch fails', async () => {
    vi.mocked(checklistsApi.getInstance).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load checklist. Please try again.')
    expect(result.current.instance).toBe(null)
  })

  it('handles undefined instanceId', async () => {
    const { result } = renderHook(() => useChecklistInstance(undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('No instance ID provided')
    expect(result.current.instance).toBe(null)
  })

  it('creates response and updates instance optimistically', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.createResponse).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Create response
    const responseData = {
      itemTemplateId: 'item-1',
      status: 'pass' as const,
      notes: 'Test note',
      imageUrls: [],
    }

    const response = await result.current.createResponse(responseData)

    expect(response).toEqual(mockResponse)
    expect(checklistsApi.createResponse).toHaveBeenCalledWith('instance-1', responseData)

    // Instance should be updated with new response
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
      status: 'fail' as const,
      notes: 'Updated note',
    }

    vi.mocked(checklistsApi.updateResponse).mockResolvedValue(updatedResponse)

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Update response
    const updateData = {
      status: 'fail' as const,
      notes: 'Updated note',
    }

    const response = await result.current.updateResponse('response-1', updateData)

    expect(response).toEqual(updatedResponse)
    expect(checklistsApi.updateResponse).toHaveBeenCalledWith('instance-1', 'response-1', updateData)

    // Instance should be updated with modified response
    const updatedInstance = result.current.instance
    const updatedResponseInInstance = updatedInstance?.responses.find((r) => r.id === 'response-1')

    expect(updatedResponseInInstance?.status).toBe('fail')
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
    })

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const storagePath = await result.current.uploadFile('project-1', file)

    expect(storagePath).toBe('uploads/test.jpg')
    expect(checklistsApi.uploadFile).toHaveBeenCalledWith('project-1', file)
  })

  it('handles createResponse error', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.createResponse).mockRejectedValue(new Error('API error'))

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const responseData = {
      itemTemplateId: 'item-1',
      status: 'pass' as const,
      notes: 'Test',
      imageUrls: [],
    }

    await expect(result.current.createResponse(responseData)).rejects.toThrow(
      'Failed to save response. Please try again.'
    )
  })

  it('handles updateResponse error', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.updateResponse).mockRejectedValue(new Error('API error'))

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updateData = {
      status: 'fail' as const,
    }

    await expect(result.current.updateResponse('response-1', updateData)).rejects.toThrow(
      'Failed to update response. Please try again.'
    )
  })

  it('handles uploadFile error', async () => {
    vi.mocked(checklistsApi.getInstance).mockResolvedValue(mockInstance)
    vi.mocked(checklistsApi.uploadFile).mockRejectedValue(new Error('Upload failed'))

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

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

    const { result } = renderHook(() => useChecklistInstance('instance-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(checklistsApi.getInstance).toHaveBeenCalledTimes(1)

    // Call refetch
    await result.current.refetch()

    expect(checklistsApi.getInstance).toHaveBeenCalledTimes(2)
  })

  it('throws error when createResponse called without instanceId', async () => {
    const { result } = renderHook(() => useChecklistInstance(undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const responseData = {
      itemTemplateId: 'item-1',
      status: 'pass' as const,
      notes: '',
      imageUrls: [],
    }

    await expect(result.current.createResponse(responseData)).rejects.toThrow('No instance ID available')
  })

  it('throws error when updateResponse called without instanceId', async () => {
    const { result } = renderHook(() => useChecklistInstance(undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updateData = {
      status: 'fail' as const,
    }

    await expect(result.current.updateResponse('response-1', updateData)).rejects.toThrow(
      'No instance ID available'
    )
  })
})
