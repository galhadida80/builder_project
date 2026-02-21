import { apiClient } from './client'
import type { Task, TaskSummary } from '../types'

export interface TaskCreateData {
  title: string
  description?: string
  priority?: string
  assignee_id?: string
  start_date?: string
  due_date?: string
  estimated_hours?: number
}

export interface TaskUpdateData {
  title?: string
  description?: string
  status?: string
  priority?: string
  assignee_id?: string
  start_date?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
}

export interface TaskBulkUpdateData {
  task_ids: string[]
  status?: string
  assignee_id?: string
}

export const tasksApi = {
  list: async (projectId: string, filters?: { status?: string; assignee_id?: string; priority?: string }): Promise<Task[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.assignee_id) params.set('assignee_id', filters.assignee_id)
    if (filters?.priority) params.set('priority', filters.priority)
    const qs = params.toString()
    const response = await apiClient.get(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`)
    return response.data
  },

  get: async (projectId: string, taskId: string): Promise<Task> => {
    const response = await apiClient.get(`/projects/${projectId}/tasks/${taskId}`)
    return response.data
  },

  create: async (projectId: string, data: TaskCreateData): Promise<Task> => {
    const response = await apiClient.post(`/projects/${projectId}/tasks`, data)
    return response.data
  },

  update: async (projectId: string, taskId: string, data: TaskUpdateData): Promise<Task> => {
    const response = await apiClient.put(`/projects/${projectId}/tasks/${taskId}`, data)
    return response.data
  },

  delete: async (projectId: string, taskId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`)
  },

  getSummary: async (projectId: string): Promise<TaskSummary> => {
    const response = await apiClient.get(`/projects/${projectId}/tasks/summary`)
    return response.data
  },

  bulkUpdate: async (projectId: string, data: TaskBulkUpdateData): Promise<Task[]> => {
    const response = await apiClient.post(`/projects/${projectId}/tasks/bulk`, data)
    return response.data
  },

  addDependency: async (projectId: string, taskId: string, dependsOnId: string): Promise<Record<string, unknown>> => {
    const response = await apiClient.post(`/projects/${projectId}/tasks/${taskId}/dependencies?depends_on_id=${dependsOnId}`)
    return response.data
  },

  removeDependency: async (projectId: string, taskId: string, depId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/tasks/${taskId}/dependencies/${depId}`)
  },
}
