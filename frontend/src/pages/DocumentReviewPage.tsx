import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DocumentReviewPanel, type ReviewStatus, type Comment } from '../components/DocumentReviewPanel'
import { EmptyState } from '../components/ui/EmptyState'
import { filesApi } from '../api/files'
import { documentReviewsApi } from '../api/documentReviews'
import { useAuth } from '../contexts/AuthContext'
import type { FileRecord } from '../api/files'
import { ArrowBackIcon } from '@/icons'
import { Box, Typography, Skeleton, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Chip } from '@/mui'

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
  const { user } = useAuth()
  const blobUrlRef = useRef<string>('')
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
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
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
        blobUrlRef.current = url
        setBlobUrl(url)
      } catch {
        // Fall back to storage path
      }

      if (reviewData) {
        setReviewStatus(reviewData.status)
        setComments(reviewData.comments || [])
      }

      setCurrentUserId(user?.id)
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
        comment_text: text,
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
        comment_text: text,
        parent_comment_id: parentCommentId,
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
        comment_text: text,
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
    const messages: Record<ReviewStatus, { title: string; message: string }> = {
      approved: {
        title: t('documentReview.approveTitle', 'Approve Document?'),
        message: t('documentReview.approveMessage', 'Are you sure you want to approve this document? This action will mark the document as approved.'),
      },
      rejected: {
        title: t('documentReview.rejectTitle', 'Reject Document?'),
        message: t('documentReview.rejectMessage', 'Are you sure you want to reject this document? This action will mark the document as rejected.'),
      },
      changes_requested: {
        title: t('documentReview.requestChangesTitle', 'Request Changes?'),
        message: t('documentReview.requestChangesMessage', 'Are you sure you want to request changes? The document owner will be notified to make revisions.'),
      },
      pending: {
        title: t('documentReview.resetStatusTitle', 'Reset Status?'),
        message: t('documentReview.resetStatusMessage', 'Are you sure you want to reset the document status to pending?'),
      },
      in_review: {
        title: t('documentReview.markInReviewTitle', 'Mark In Review?'),
        message: t('documentReview.markInReviewMessage', 'Are you sure you want to mark this document as in review?'),
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
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rounded" width="100%" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (error || !document) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton aria-label={t('common.back')} onClick={handleBack} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {t('documentReview.backToProject')}
          </Typography>
        </Box>
        <EmptyState
          variant="error"
          title={t('documentReview.documentNotFound')}
          description={error || t('documentReview.documentNotFoundDescription')}
          action={{ label: t('documentReview.backToProject'), onClick: handleBack }}
        />
      </Box>
    )
  }

  const documentUrl = blobUrl || (document.storagePath.startsWith('http') ? document.storagePath : '')

  const documentType = document.fileType.toLowerCase().includes('pdf')
    ? 'pdf'
    : document.fileType.toLowerCase().match(/png|jpg|jpeg|gif|webp/)
    ? 'image'
    : document.fileType

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: t('documentReview.statusPending', 'Pending review'), color: 'primary.main' },
    in_review: { label: t('documentReview.statusInReview', 'In review'), color: 'info.main' },
    approved: { label: t('documentReview.statusApproved', 'Approved'), color: 'success.main' },
    rejected: { label: t('documentReview.statusRejected', 'Rejected'), color: 'error.main' },
    changes_requested: { label: t('documentReview.statusChanges', 'Changes requested'), color: 'warning.main' },
  }

  const currentStatus = statusConfig[reviewStatus] || statusConfig.pending

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default',
        borderBottom: 1, borderColor: 'divider',
        px: 2, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton aria-label={t('common.back')} onClick={handleBack} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="body1" fontWeight={700} letterSpacing='-0.02em'>
            {t('documentReview.title', 'Document Review')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={handleDownload}>
            <Box component="span" className="material-icons" sx={{ fontSize: 22, color: 'text.secondary' }}>download</Box>
          </IconButton>
        </Box>
      </Box>

      <Box sx={{
        p: 2, borderBottom: 1, borderColor: 'divider',
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30,30,30,0.5)' : 'rgba(0,0,0,0.02)',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body1" fontWeight={700}>{document.filename}</Typography>
          </Box>
          <Chip
            label={currentStatus.label}
            size="small"
            sx={{
              fontWeight: 700, fontSize: '0.65rem', height: 24,
              bgcolor: `${currentStatus.color}20`,
              color: currentStatus.color,
              borderRadius: 4,
            }}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, pb: 20 }}>
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

      <Box sx={{
        position: 'fixed', bottom: 0, insetInline: 0,
        bgcolor: 'background.default', borderTop: 1, borderColor: 'divider',
        p: 2, pb: 4, zIndex: 20,
      }}>
        <Box sx={{ display: 'flex', gap: 1.5, maxWidth: 600, mx: 'auto' }}>
          <Button
            onClick={() => handleRequestStatusChange('approved')}
            variant="contained"
            color="success"
            sx={{
              flex: 1, fontWeight: 700, borderRadius: 3, py: 1.5,
              textTransform: 'none',
            }}
          >
            {t('documentReview.approve', 'Approve')}
          </Button>
          <Button
            onClick={() => handleRequestStatusChange('changes_requested')}
            variant="outlined"
            color="primary"
            sx={{
              flex: 1, fontWeight: 700, borderRadius: 3, py: 1.5,
              textTransform: 'none', borderWidth: 2,
            }}
          >
            {t('documentReview.requestChanges', 'Request changes')}
          </Button>
        </Box>
        <Button
          onClick={() => handleRequestStatusChange('rejected')}
          color="error"
          sx={{
            mt: 1, width: '100%', maxWidth: 600, mx: 'auto', display: 'flex',
            fontWeight: 700, textTransform: 'none',
          }}
        >
          {t('documentReview.reject', 'Reject')}
        </Button>
      </Box>

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
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirmStatusChange} variant="contained" color="primary" autoFocus>
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
