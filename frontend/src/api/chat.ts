import { apiClient } from './client'

export interface ChatAction {
  id: string
  conversationId: string
  messageId: string
  actionType: string
  entityType: string
  entityId: string | null
  parameters: Record<string, unknown>
  description: string
  status: 'proposed' | 'executed' | 'rejected' | 'failed'
  result: Record<string, unknown> | null
  createdAt: string
  executedAt: string | null
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string | null
  toolCalls: string[] | null
  createdAt: string
  pendingActions: ChatAction[]
}

export interface ChatSendResponse {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  conversationId: string
}

export interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface ConversationDetail {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export const chatApi = {
  send: async (projectId: string, message: string, conversationId?: string): Promise<ChatSendResponse> => {
    const response = await apiClient.post(`/projects/${projectId}/chat`, {
      message,
      conversation_id: conversationId,
    })
    return response.data
  },

  listConversations: async (projectId: string): Promise<Conversation[]> => {
    const response = await apiClient.get(`/projects/${projectId}/chat/conversations`)
    return response.data
  },

  getConversation: async (projectId: string, conversationId: string): Promise<ConversationDetail> => {
    const response = await apiClient.get(`/projects/${projectId}/chat/conversations/${conversationId}`)
    return response.data
  },

  deleteConversation: async (projectId: string, conversationId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/chat/conversations/${conversationId}`)
  },

  executeAction: async (projectId: string, actionId: string): Promise<ChatAction> => {
    const response = await apiClient.post(`/projects/${projectId}/chat/actions/${actionId}/execute`)
    return response.data
  },

  rejectAction: async (projectId: string, actionId: string, reason?: string): Promise<ChatAction> => {
    const response = await apiClient.post(`/projects/${projectId}/chat/actions/${actionId}/reject`, {
      reason: reason || null,
    })
    return response.data
  },

  getSuggestions: async (projectId: string): Promise<ChatSuggestion[]> => {
    const response = await apiClient.get<{ suggestions: ChatSuggestion[] }>(`/projects/${projectId}/chat/suggestions`)
    return response.data.suggestions
  },
}

export interface ChatSuggestion {
  type: string
  text: string
  prompt: string
}
