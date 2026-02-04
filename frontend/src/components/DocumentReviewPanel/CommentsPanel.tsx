import { Box, Paper, Typography, Divider, List, ListItem, Skeleton } from '@mui/material'
import { styled } from '@mui/material/styles'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Avatar } from '../ui/Avatar'
import CommentIcon from '@mui/icons-material/Comment'
import SendIcon from '@mui/icons-material/Send'
import { useState } from 'react'

interface Comment {
  id: string
  userId: string
  userName: string
  userRole?: string
  commentText: string
  createdAt: string
  updatedAt?: string
  parentCommentId?: string | null
  replies?: Comment[]
}

interface CommentsPanelProps {
  comments: Comment[]
  loading?: boolean
  onAddComment?: (text: string) => void | Promise<void>
  onEditComment?: (commentId: string, text: string) => void | Promise<void>
  onDeleteComment?: (commentId: string) => void | Promise<void>
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

const CommentItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  flexDirection: 'column',
  alignItems: 'flex-start',
  '&:last-child': {
    marginBottom: 0,
  },
}))

const CommentHeader = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: '100%',
  marginBottom: 8,
}))

const CommentMeta = styled(Box)(() => ({
  flex: 1,
  minWidth: 0,
}))

const CommentText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  marginTop: theme.spacing(0.5),
}))

const TimeStamp = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.75rem',
  marginTop: 2,
}))

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

function CommentsList({ comments, currentUserId }: { comments: Comment[]; currentUserId?: string }) {
  return (
    <List sx={{ p: 0 }}>
      {comments.map((comment) => (
        <CommentItem key={comment.id}>
          <CommentHeader>
            <Avatar name={comment.userName} size="medium" />
            <CommentMeta>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontSize: '0.875rem' }}
                >
                  {comment.userName}
                </Typography>
                {comment.userRole && (
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                      fontSize: '0.65rem',
                      fontWeight: 500,
                    }}
                  >
                    {comment.userRole}
                  </Typography>
                )}
              </Box>
              <TimeStamp>
                {formatTimestamp(comment.createdAt)}
                {comment.updatedAt && comment.updatedAt !== comment.createdAt && ' (edited)'}
              </TimeStamp>
            </CommentMeta>
          </CommentHeader>
          <CommentText>{comment.commentText}</CommentText>
        </CommentItem>
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
  currentUserId,
}: CommentsPanelProps) {
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
              title="No comments yet"
              description="Be the first to add a comment or feedback on this document."
            />
          </Box>
        ) : (
          <CommentsList comments={comments} currentUserId={currentUserId} />
        )}
      </CommentsListContainer>

      <Divider />

      <CommentForm>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            placeholder="Add a comment..."
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
