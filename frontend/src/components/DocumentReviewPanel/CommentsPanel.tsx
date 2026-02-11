import { useTranslation } from 'react-i18next'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { useState } from 'react'
import { CommentThread, Comment } from './CommentThread'
import { CommentIcon, SendIcon } from '@/icons'
import { Box, Paper, Typography, Divider, List, Skeleton, styled } from '@/mui'

interface CommentsPanelProps {
  comments: Comment[]
  loading?: boolean
  onAddComment?: (text: string) => void | Promise<void>
  onReplyComment?: (parentCommentId: string, text: string) => void | Promise<void>
  onEditComment?: (commentId: string, text: string) => void | Promise<void>
  onDeleteComment?: (commentId: string) => void | Promise<void>
  onResolveComment?: (commentId: string, resolved: boolean) => void | Promise<void>
  currentUserId?: string
}

const PanelContainer = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden',
  borderRadius: 0,
}))

const Header = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 2.5),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

const CommentsListContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: theme.palette.action.hover,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.action.disabled,
    borderRadius: 4,
    '&:hover': {
      backgroundColor: theme.palette.action.active,
    },
  },
}))

const CommentForm = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
}))

function CommentsList({
  comments,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onResolve,
}: {
  comments: Comment[]
  currentUserId?: string
  onReply?: (commentId: string, text: string) => void | Promise<void>
  onEdit?: (commentId: string, text: string) => void | Promise<void>
  onDelete?: (commentId: string) => void | Promise<void>
  onResolve?: (commentId: string, resolved: boolean) => void | Promise<void>
}) {
  return (
    <List sx={{ p: 0 }}>
      {comments.map((comment) => (
        <CommentThread
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onResolve={onResolve}
        />
      ))}
    </List>
  )
}

function LoadingSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            p: 2,
            mb: 1.5,
            backgroundColor: 'background.paper',
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
            <Skeleton variant="circular" width={36} height={36} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="40%" height={20} />
              <Skeleton width="25%" height={16} />
            </Box>
          </Box>
          <Skeleton width="90%" height={16} sx={{ mt: 1 }} />
          <Skeleton width="75%" height={16} />
        </Box>
      ))}
    </Box>
  )
}

export function CommentsPanel({
  comments,
  loading = false,
  onAddComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
  onResolveComment,
  currentUserId,
}: CommentsPanelProps) {
  const { t } = useTranslation()
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newComment.trim() || !onAddComment) return

    setIsSubmitting(true)
    try {
      await onAddComment(newComment.trim())
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <PanelContainer elevation={0}>
      <Header>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          Comments & Approvals
        </Typography>
        {!loading && comments.length > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </Typography>
        )}
      </Header>

      <CommentsListContainer>
        {loading ? (
          <LoadingSkeleton />
        ) : comments.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <EmptyState
              icon={<CommentIcon />}
              title={t('documentReview.noCommentsYet')}
              description={t('documentReview.beFirstToComment')}
            />
          </Box>
        ) : (
          <CommentsList
            comments={comments}
            currentUserId={currentUserId}
            onReply={onReplyComment}
            onEdit={onEditComment}
            onDelete={onDeleteComment}
            onResolve={onResolveComment}
          />
        )}
      </CommentsListContainer>

      <Divider />

      <CommentForm>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            placeholder={t('documentReview.addCommentPlaceholder')}
            multiline
            rows={3}
            fullWidth
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSubmitting}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              Press Cmd/Ctrl + Enter to submit
            </Typography>
            <Button
              variant="primary"
              size="small"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              loading={isSubmitting}
              icon={<SendIcon fontSize="small" />}
              iconPosition="end"
            >
              Send
            </Button>
          </Box>
        </Box>
      </CommentForm>
    </PanelContainer>
  )
}
