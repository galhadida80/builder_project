import { apiClient } from './client'
import type { Invoice, PaymentMethod, PaymentMethodCreate } from '../types'

interface SeatAddRequest {
  user_id: string
}

export const billingApi = {
  getInvoices: async (): Promise<Invoice[]> => {
    const response = await apiClient.get('/billing/invoices')
    return response.data
  },

  downloadInvoice: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/billing/invoices/${id}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.get('/billing/payment-methods')
    return response.data
  },

  addPaymentMethod: async (data: PaymentMethodCreate): Promise<PaymentMethod> => {
    const response = await apiClient.post('/billing/payment-methods', data)
    return response.data
  },

  removePaymentMethod: async (id: string): Promise<void> => {
    await apiClient.delete(`/billing/payment-methods/${id}`)
  },

  addSeat: async (userId: string): Promise<void> => {
    const data: SeatAddRequest = { user_id: userId }
    await apiClient.post('/billing/seats/add', data)
  },

  removeSeat: async (userId: string): Promise<void> => {
    await apiClient.delete(`/billing/seats/${userId}`)
  },
}
