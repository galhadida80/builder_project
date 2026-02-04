import { apiClient } from './client'
import { Comment } from '../components/DocumentReviewPanel'

export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested'

export interface DocumentReview {
  id: string
  projectId: string
  documentId: string
  status: ReviewStatus
  createdAt: string
  updatedAt?: string
  comments: Comment[]
}

export interface CreateCommentRequest {
  commentText: string
  parentCommentId?: string | null
}

export interface UpdateCommentRequest {
  commentText: string
}

export interface UpdateReviewStatusRequest {
  status: ReviewStatus
}

export const documentReviewsApi = {
  // Get or create document review
  getReview: async (projectId: string, documentId: string): Promise<DocumentReview> => {
    const response = await apiClient.get(`/projects/${projectId}/documents/${documentId}/review`)
    return response.data
  },

  // Update review status
  updateReviewStatus: async (
    projectId: string,
    documentId: string,
    status: ReviewStatus
  ): Promise<DocumentReview> => {
    const response = await apiClient.patch(
      `/projects/${projectId}/documents/${documentId}/review-status`,
      { status }
    )
    return response.data
  },

  // Get all comments for a document
  getComments: async (projectId: string, documentId: string): Promise<Comment[]> => {
    const response = await apiClient.get(`/projects/${projectId}/documents/${documentId}/comments`)
    return response.data
  },

  // Create a new comment
  createComment: async (
    projectId: string,
    documentId: string,
    data: CreateCommentRequest
  ): Promise<Comment> => {
    const response = await apiClient.post(
      `/projects/${projectId}/documents/${documentId}/comments`,
      data
    )
    return response.data
  },

  // Update a comment
  updateComment: async (commentId: string, data: UpdateCommentRequest): Promise<Comment> => {
    const response = await apiClient.put(`/comments/${commentId}`, data)
    return response.data
  },

  // Delete a comment
  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`)
  },

  // Toggle comment resolved status
  toggleResolveComment: async (commentId: string, resolved: boolean): Promise<Comment> => {
    const response = await apiClient.patch(`/comments/${commentId}/resolve`, { is_resolved: resolved })
    return response.data
  },
}
