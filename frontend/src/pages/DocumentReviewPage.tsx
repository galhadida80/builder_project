import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { DocumentReviewPanel, type ReviewStatus, type Comment } from '../components/DocumentReviewPanel'
import { EmptyState } from '../components/ui/EmptyState'
import { filesApi } from '../api/files'
import { documentReviewsApi } from '../api/documentReviews'
import type { FileRecord } from '../api/files'

export default function DocumentReviewPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<FileRecord | null>(null)
  const [blobUrl, setBlobUrl] = useState<string>('')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('pending')
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    status: ReviewStatus | null
    title: string
    message: string
  }>({
    open: false,
    status: null,
    title: '',
    message: '',
  })

  useEffect(() => {
    loadDocumentAndReview()
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [projectId, documentId])

  const loadDocumentAndReview = async () => {
    if (!projectId || !documentId) {
      setError('Invalid project or document ID')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch document metadata and review data in parallel
      const [documentData, reviewData] = await Promise.all([
        filesApi.get(projectId, documentId),
        documentReviewsApi.getReview(projectId, documentId).catch(() => null),
      ])

      setDocument(documentData)

      // Fetch file content as blob for viewer
      try {
        const url = await filesApi.getFileBlob(projectId, documentId)
        setBlobUrl(url)
      } catch {
        // Fall back to storage path
      }

      if (reviewData) {
        setReviewStatus(reviewData.status)
        setComments(reviewData.comments || [])
      }

      // Get current user ID from token (basic implementation)
      // In a real app, this would come from an auth context
      const token = localStorage.getItem('authToken')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setCurrentUserId(payload.sub || payload.user_id)
        } catch {
          // Invalid token format
        }
      }
    } catch (err) {
      console.error('Failed to load document or review:', err)
      setError(t('documentReview.failedToLoadDocument'))
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    if (!projectId || !documentId) return

    try {
      setCommentsLoading(true)
      const commentsData = await documentReviewsApi.getComments(projectId, documentId)
      setComments(commentsData)
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  const handleAddComment = async (text: string) => {
    if (!projectId || !documentId || !text.trim()) return

    try {
      const newComment = await documentReviewsApi.createComment(projectId, documentId, {
        commentText: text,
      })

      // Optimistic update
      setComments(prev => [...prev, newComment])
    } catch (err) {
      console.error('Failed to create comment:', err)
      // Reload comments to sync state
      await loadComments()
    }
  }

  const handleReplyComment = async (parentCommentId: string, text: string) => {
    if (!projectId || !documentId || !text.trim()) return

    try {
      const newComment = await documentReviewsApi.createComment(projectId, documentId, {
        commentText: text,
        parentCommentId,
      })

      // Add reply to the parent comment
      setComments(prev => {
        const addReply = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment],
              }
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: addReply(comment.replies),
              }
            }
            return comment
          })
        }
        return addReply(prev)
      })
    } catch (err) {
      console.error('Failed to reply to comment:', err)
      // Reload comments to sync state
      await loadComments()
    }
  }

  const handleEditComment = async (commentId: string, text: string) => {
    if (!text.trim()) return

    try {
      const updatedComment = await documentReviewsApi.updateComment(commentId, {
        commentText: text,
      })

      // Update comment in state
      setComments(prev => {
        const updateComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, ...updatedComment }
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateComment(comment.replies),
              }
            }
            return comment
          })
        }
        return updateComment(prev)
      })
    } catch (err) {
      console.error('Failed to update comment:', err)
      // Reload comments to sync state
      await loadComments()
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await documentReviewsApi.deleteComment(commentId)

      // Remove comment from state
      setComments(prev => {
        const removeComment = (comments: Comment[]): Comment[] => {
          return comments
            .filter(comment => comment.id !== commentId)
            .map(comment => {
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: removeComment(comment.replies),
                }
              }
              return comment
            })
        }
        return removeComment(prev)
      })
    } catch (err) {
      console.error('Failed to delete comment:', err)
      // Reload comments to sync state
      await loadComments()
    }
  }

  const handleResolveComment = async (commentId: string, resolved: boolean) => {
    try {
      const updatedComment = await documentReviewsApi.toggleResolveComment(commentId, resolved)

      // Update comment in state
      setComments(prev => {
        const updateComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return { ...comment, ...updatedComment }
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateComment(comment.replies),
              }
            }
            return comment
          })
        }
        return updateComment(prev)
      })
    } catch (err) {
      console.error('Failed to resolve comment:', err)
      // Reload comments to sync state
      await loadComments()
    }
  }

  const handleRequestStatusChange = (status: ReviewStatus) => {
    // Determine confirmation message based on status
    const messages = {
      approved: {
        title: 'Approve Document?',
        message: 'Are you sure you want to approve this document? This action will mark the document as approved.',
      },
      rejected: {
        title: 'Reject Document?',
        message: 'Are you sure you want to reject this document? This action will mark the document as rejected.',
      },
      changes_requested: {
        title: 'Request Changes?',
        message: 'Are you sure you want to request changes? The document owner will be notified to make revisions.',
      },
      pending: {
        title: 'Reset Status?',
        message: 'Are you sure you want to reset the document status to pending?',
      },
      in_review: {
        title: 'Mark In Review?',
        message: 'Are you sure you want to mark this document as in review?',
      },
    }

    const config = messages[status]
    setConfirmDialog({
      open: true,
      status,
      title: config.title,
      message: config.message,
    })
  }

  const handleConfirmStatusChange = async () => {
    const { status } = confirmDialog
    if (!projectId || !documentId || !status) return

    // Close dialog first
    setConfirmDialog({ open: false, status: null, title: '', message: '' })

    // Optimistic update - update UI immediately
    const previousStatus = reviewStatus
    setReviewStatus(status)

    try {
      // Make API call in background
      await documentReviewsApi.updateReviewStatus(projectId, documentId, status)
    } catch (err) {
      // Rollback on error
      setReviewStatus(previousStatus)
      setError(t('documentReview.failedToUpdateStatus'))
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleCancelStatusChange = () => {
    setConfirmDialog({ open: false, status: null, title: '', message: '' })
  }

  const handleDownload = async () => {
    if (!projectId || !documentId) return

    try {
      const downloadUrl = await filesApi.getDownloadUrl(projectId, documentId)
      window.open(downloadUrl, '_blank')
    } catch (err) {
      console.error('Failed to download document:', err)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    navigate(`/projects/${projectId}`)
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={150} height={24} />
        </Box>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" width="100%" height={600} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (error || !document) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton onClick={handleBack} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            Back to Project
          </Typography>
        </Box>
        <EmptyState
          variant="error"
          title={t('documentReview.documentNotFound')}
          description={error || "The document you're looking for doesn't exist or has been removed"}
          action={{ label: 'Back to Project', onClick: handleBack }}
        />
      </Box>
    )
  }

  // Use blob URL for authenticated viewing, fall back to storage path for external URLs
  const documentUrl = blobUrl || (document.storagePath.startsWith('http') ? document.storagePath : '')

  // Determine document type
  const documentType = document.fileType.toLowerCase().includes('pdf')
    ? 'pdf'
    : document.fileType.toLowerCase().match(/png|jpg|jpeg|gif|webp/)
    ? 'image'
    : document.fileType

  return (
    <Box>
      <Box sx={{
        position: 'fixed',
        top: 64, // Assuming header height
        left: 0,
        right: 0,
        zIndex: 10,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        px: 3,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <IconButton onClick={handleBack} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          Back to Project
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
          /
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {document.filename}
        </Typography>
      </Box>

      <Box sx={{ mt: 7 }}> {/* Offset for fixed header */}
        <DocumentReviewPanel
          documentUrl={documentUrl}
          documentName={document.filename}
          documentType={documentType}
          documentLoading={false}
          onDownload={handleDownload}
          onPrint={handlePrint}
          comments={comments}
          commentsLoading={commentsLoading}
          currentUserId={currentUserId}
          onAddComment={handleAddComment}
          onReplyComment={handleReplyComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onResolveComment={handleResolveComment}
          reviewStatus={reviewStatus}
          onApprove={() => handleRequestStatusChange('approved')}
          onReject={() => handleRequestStatusChange('rejected')}
          onRequestChanges={() => handleRequestStatusChange('changes_requested')}
        />
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelStatusChange}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelStatusChange} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmStatusChange} variant="contained" color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
