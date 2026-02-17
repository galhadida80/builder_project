import { apiClient } from './client'
import type { BudgetLineItem, BudgetSummary, CostEntry, ChangeOrder } from '../types'

export interface BudgetItemCreateData {
  name: string
  category: string
  description?: string
  budgeted_amount: number
  sort_order?: number
}

export interface BudgetItemUpdateData {
  name?: string
  category?: string
  description?: string
  budgeted_amount?: number
  sort_order?: number
}

export interface CostEntryCreateData {
  description?: string
  amount: number
  entry_date: string
  vendor?: string
  reference_number?: string
}

export interface ChangeOrderCreateData {
  title: string
  description?: string
  amount: number
  budget_item_id?: string
  requested_date?: string
}

export interface ChangeOrderUpdateData {
  title?: string
  description?: string
  amount?: number
  status?: string
  budget_item_id?: string
  requested_date?: string
}

export const budgetApi = {
  listItems: async (projectId: string): Promise<BudgetLineItem[]> => {
    const response = await apiClient.get(`/projects/${projectId}/budget`)
    return response.data
  },
  createItem: async (projectId: string, data: BudgetItemCreateData): Promise<BudgetLineItem> => {
    const response = await apiClient.post(`/projects/${projectId}/budget`, data)
    return response.data
  },
  updateItem: async (projectId: string, itemId: string, data: BudgetItemUpdateData): Promise<BudgetLineItem> => {
    const response = await apiClient.put(`/projects/${projectId}/budget/${itemId}`, data)
    return response.data
  },
  deleteItem: async (projectId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/budget/${itemId}`)
  },
  getSummary: async (projectId: string): Promise<BudgetSummary> => {
    const response = await apiClient.get(`/projects/${projectId}/budget/summary`)
    return response.data
  },
  createCostEntry: async (projectId: string, itemId: string, data: CostEntryCreateData): Promise<CostEntry> => {
    const response = await apiClient.post(`/projects/${projectId}/budget/${itemId}/costs`, data)
    return response.data
  },
  listCostEntries: async (projectId: string, itemId: string): Promise<CostEntry[]> => {
    const response = await apiClient.get(`/projects/${projectId}/budget/${itemId}/costs`)
    return response.data
  },
  deleteCostEntry: async (projectId: string, costId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/budget/costs/${costId}`)
  },
  listChangeOrders: async (projectId: string, status?: string): Promise<ChangeOrder[]> => {
    const qs = status ? `?status=${status}` : ''
    const response = await apiClient.get(`/projects/${projectId}/change-orders${qs}`)
    return response.data
  },
  createChangeOrder: async (projectId: string, data: ChangeOrderCreateData): Promise<ChangeOrder> => {
    const response = await apiClient.post(`/projects/${projectId}/change-orders`, data)
    return response.data
  },
  updateChangeOrder: async (projectId: string, coId: string, data: ChangeOrderUpdateData): Promise<ChangeOrder> => {
    const response = await apiClient.put(`/projects/${projectId}/change-orders/${coId}`, data)
    return response.data
  },
  deleteChangeOrder: async (projectId: string, coId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/change-orders/${coId}`)
  },
}
