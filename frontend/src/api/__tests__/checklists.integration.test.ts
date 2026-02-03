import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import axios from 'axios'
import { checklistsApi } from '../checklists'
import type {
  ChecklistTemplate,
  ChecklistInstance,
  ChecklistItemResponse,
  ChecklistItemResponseCreate,
  ChecklistItemResponseUpdate,
} from '../../types'

// Mock axios for integration tests
vi.mock('axios')

const mockAxios = axios as any

// Mock API responses
const mockTemplate: ChecklistTemplate = {
  id: 'template-1',
  name: 'Safety Inspection',
  description: 'Standard safety checklist',
  category: 'safety',
  version: 1,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

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
  subsections: [
    {
      id: 'section-1',
      checklistTemplateId: 'template-1',
      order: 1,
      name: 'Section 1',
      description: 'Test section',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      items: [
        {
          id: 'item-1',
          checklistTemplateId: 'template-1',
          subSectionId: 'section-1',
          order: 1,
          name: 'Item 1',
          description: 'Test item',
          mustImage: false,
          mustNote: false,
          mustSignature: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    },
  ],
  responses: [],
  template: mockTemplate,
}

const mockResponse: ChecklistItemResponse = {
  id: 'response-1',
  checklistInstanceId: 'instance-1',
  itemTemplateId: 'item-1',
  status: 'pass',
  notes: 'Test note',
  imageUrls: ['uploads/test.jpg'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockFileAttachment = {
  id: 'file-1',
  storagePath: 'uploads/test.jpg',
  originalName: 'test.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
  projectId: 'project-1',
  uploadedBy: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
}

describe('checklists API integration tests', () => {
  beforeAll(() => {
    // Setup axios mock defaults
    mockAxios.get = vi.fn()
    mockAxios.post = vi.fn()
    mockAxios.put = vi.fn()
    mockAxios.delete = vi.fn()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('fetches checklist templates successfully', async () => {
      mockAxios.get.mockResolvedValue({ data: [mockTemplate] })

      const templates = await checklistsApi.getTemplates()

      expect(mockAxios.get).toHaveBeenCalled()
      expect(templates).toEqual([mockTemplate])
    })

    it('handles error when fetching templates', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'))

      await expect(checklistsApi.getTemplates()).rejects.toThrow()
    })
  })

  describe('getInstance', () => {
    it('fetches checklist instance with sections and items', async () => {
      mockAxios.get.mockResolvedValue({ data: mockInstance })

      const instance = await checklistsApi.getInstance('instance-1')

      expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/checklist-instances/instance-1'))
      expect(instance).toEqual(mockInstance)
      expect(instance.subsections).toHaveLength(1)
      expect(instance.subsections[0].items).toHaveLength(1)
    })

    it('handles 404 when instance not found', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 404 },
        message: 'Not found',
      })

      await expect(checklistsApi.getInstance('invalid-id')).rejects.toThrow()
    })
  })

  describe('createInstance', () => {
    it('creates new checklist instance', async () => {
      const createData = {
        checklistTemplateId: 'template-1',
        projectId: 'project-1',
        inspectionId: 'inspection-1',
      }

      mockAxios.post.mockResolvedValue({ data: mockInstance })

      const instance = await checklistsApi.createInstance('project-1', createData)

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/projects/project-1/checklist-instances'),
        createData
      )
      expect(instance).toEqual(mockInstance)
    })
  })

  describe('createResponse', () => {
    it('creates checklist item response successfully', async () => {
      const responseData: ChecklistItemResponseCreate = {
        itemTemplateId: 'item-1',
        status: 'pass',
        notes: 'Test note',
        imageUrls: ['uploads/test.jpg'],
      }

      mockAxios.post.mockResolvedValue({ data: mockResponse })

      const response = await checklistsApi.createResponse('instance-1', responseData)

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/checklist-instances/instance-1/responses'),
        responseData
      )
      expect(response).toEqual(mockResponse)
      expect(response.status).toBe('pass')
      expect(response.notes).toBe('Test note')
    })

    it('creates response with multiple images', async () => {
      const responseData: ChecklistItemResponseCreate = {
        itemTemplateId: 'item-1',
        status: 'pass',
        notes: '',
        imageUrls: ['uploads/img1.jpg', 'uploads/img2.jpg', 'uploads/img3.jpg'],
      }

      const responseWithMultipleImages = {
        ...mockResponse,
        imageUrls: responseData.imageUrls,
      }

      mockAxios.post.mockResolvedValue({ data: responseWithMultipleImages })

      const response = await checklistsApi.createResponse('instance-1', responseData)

      expect(response.imageUrls).toHaveLength(3)
    })

    it('handles validation errors', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 422,
          data: { detail: 'Validation error' },
        },
      })

      const responseData: ChecklistItemResponseCreate = {
        itemTemplateId: '',
        status: 'pass',
        notes: '',
        imageUrls: [],
      }

      await expect(checklistsApi.createResponse('instance-1', responseData)).rejects.toThrow()
    })
  })

  describe('updateResponse', () => {
    it('updates checklist item response successfully', async () => {
      const updateData: ChecklistItemResponseUpdate = {
        status: 'fail',
        notes: 'Updated note',
      }

      const updatedResponse = {
        ...mockResponse,
        status: 'fail' as const,
        notes: 'Updated note',
      }

      mockAxios.put.mockResolvedValue({ data: updatedResponse })

      const response = await checklistsApi.updateResponse('instance-1', 'response-1', updateData)

      expect(mockAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/checklist-instances/instance-1/responses/response-1'),
        updateData
      )
      expect(response.status).toBe('fail')
      expect(response.notes).toBe('Updated note')
    })

    it('updates only status field', async () => {
      const updateData: ChecklistItemResponseUpdate = {
        status: 'na',
      }

      const updatedResponse = {
        ...mockResponse,
        status: 'na' as const,
      }

      mockAxios.put.mockResolvedValue({ data: updatedResponse })

      const response = await checklistsApi.updateResponse('instance-1', 'response-1', updateData)

      expect(response.status).toBe('na')
    })

    it('adds images to existing response', async () => {
      const updateData: ChecklistItemResponseUpdate = {
        imageUrls: ['uploads/new.jpg'],
      }

      const updatedResponse = {
        ...mockResponse,
        imageUrls: [...mockResponse.imageUrls, 'uploads/new.jpg'],
      }

      mockAxios.put.mockResolvedValue({ data: updatedResponse })

      const response = await checklistsApi.updateResponse('instance-1', 'response-1', updateData)

      expect(response.imageUrls).toContain('uploads/new.jpg')
    })
  })

  describe('uploadFile', () => {
    it('uploads file successfully and returns storage path', async () => {
      mockAxios.post.mockResolvedValue({ data: mockFileAttachment })

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const fileAttachment = await checklistsApi.uploadFile('project-1', file)

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/projects/project-1/files'),
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      )

      expect(fileAttachment.storagePath).toBe('uploads/test.jpg')
      expect(fileAttachment.originalName).toBe('test.jpg')
      expect(fileAttachment.mimeType).toBe('image/jpeg')
    })

    it('handles large file upload', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          ...mockFileAttachment,
          size: 5 * 1024 * 1024, // 5MB
        },
      })

      const largeFile = new File(
        [new ArrayBuffer(5 * 1024 * 1024)],
        'large.jpg',
        { type: 'image/jpeg' }
      )

      const fileAttachment = await checklistsApi.uploadFile('project-1', largeFile)

      expect(fileAttachment.size).toBe(5 * 1024 * 1024)
    })

    it('handles upload error', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 413,
          data: { detail: 'File too large' },
        },
      })

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await expect(checklistsApi.uploadFile('project-1', file)).rejects.toThrow()
    })
  })

  describe('End-to-End checklist completion flow', () => {
    it('completes full checklist workflow', async () => {
      // 1. Create instance
      mockAxios.post.mockResolvedValueOnce({ data: mockInstance })

      const instance = await checklistsApi.createInstance('project-1', {
        checklistTemplateId: 'template-1',
        projectId: 'project-1',
        inspectionId: 'inspection-1',
      })

      expect(instance.status).toBe('in_progress')

      // 2. Upload photos
      mockAxios.post.mockResolvedValueOnce({ data: mockFileAttachment })

      const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
      const fileAttachment = await checklistsApi.uploadFile('project-1', file)

      expect(fileAttachment.storagePath).toBeDefined()

      // 3. Create response with photo
      const responseWithPhoto = {
        ...mockResponse,
        imageUrls: [fileAttachment.storagePath],
      }

      mockAxios.post.mockResolvedValueOnce({ data: responseWithPhoto })

      const response = await checklistsApi.createResponse('instance-1', {
        itemTemplateId: 'item-1',
        status: 'pass',
        notes: 'Completed with photo',
        imageUrls: [fileAttachment.storagePath],
      })

      expect(response.imageUrls).toContain(fileAttachment.storagePath)

      // 4. Get updated instance
      const updatedInstance = {
        ...mockInstance,
        responses: [response],
      }

      mockAxios.get.mockResolvedValueOnce({ data: updatedInstance })

      const finalInstance = await checklistsApi.getInstance('instance-1')

      expect(finalInstance.responses).toHaveLength(1)
      expect(finalInstance.responses[0].imageUrls).toContain(fileAttachment.storagePath)
    })
  })
})
