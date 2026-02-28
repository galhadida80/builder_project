import { apiClient } from './client'
import type {
  SubscriptionPlan,
  Subscription,
  SubscriptionCreate,
  SubscriptionUpgrade,
  SubscriptionCancel,
} from '../types'

export const subscriptionsApi = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get('/subscriptions/plans')
    return response.data
  },

  getCurrentSubscription: async (): Promise<Subscription> => {
    const response = await apiClient.get('/subscriptions/current')
    return response.data
  },

  subscribe: async (data: SubscriptionCreate): Promise<Subscription> => {
    const response = await apiClient.post('/subscriptions/subscribe', data)
    return response.data
  },

  upgrade: async (data: SubscriptionUpgrade): Promise<Subscription> => {
    const response = await apiClient.put('/subscriptions/upgrade', data)
    return response.data
  },

  cancel: async (data: SubscriptionCancel): Promise<void> => {
    await apiClient.delete('/subscriptions/cancel', { data })
  },
}
