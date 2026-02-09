import { Box, Typography, IconButton, Menu, MenuItem, Divider } from '@mui/material'
import { styled } from '@mui/material'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import ReplyIcon from '@mui/icons-material/Reply'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CancelIcon from '@mui/icons-material/Cancel'
import SaveIcon from '@mui/icons-material/Save'
import { useState } from 'react'

export interface Comment {
  id: string
  userId: string
  userName: string
  userRole?: string
  commentText: string
  createdAt: string
  updatedAt?: string
  parentCommentId?: string | null
  isResolved?: boolean
  replies?: Comment[]
}

interface CommentThreadProps {
  comment: Comment
  currentUserId?: string
  depth?: number
  onReply?: (commentId: string, text: string) => void | Promise<void>
  onEdit?: (commentId: string, text: string) => void | Promise<void>
  onDelete?: (commentId: string) => void | Promise<void>
  onResolve?: (commentId: string, resolved: boolean) => void | Promise<void>
}

const ThreadContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'depth' && prop !== 'isResolved',
})<{ depth: number; isResolved?: boolean }>(({ theme, depth, isResolved }) => ({
  marginBottom: theme.spacing(1.5),
  marginLeft: depth > 0 ? theme.spacing(4) : 0,
  opacity: isResolved ? 0.7 : 1,
}))

const CommentCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isResolved',
})<{ isResolved?: boolean }>(({ theme, isResolved }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 200ms ease-out',
  position: 'relative',
  ...(isResolved && {
    borderColor: theme.palette.success.main,
    borderWidth: 2,
  }),
  '&:hover': {
    boxShadow: theme.shadows[2],
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
  marginBottom: theme.spacing(1.5),
}))

const TimeStamp = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.75rem',
  marginTop: 2,
}))

const ActionBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}))

const ActionButton = styled(Button)(({ theme }) => ({
  fontSize: '0.75rem',
  padding: theme.spacing(0.5, 1),
  minHeight: 28,
}))

const ResolvedBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: -1,
  right: -1,
  backgroundColor: theme.palette.success.main,
  color: 'white',
  padding: theme.spacing(0.5, 1),
  borderRadius: '0 12px 0 12px',
  fontSize: '0.65rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
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
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function CommentThread({
  comment,
  currentUserId,
  depth = 0,
  onReply,
  onEdit,
  onDelete,
  onResolve,
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editText, setEditText] = useState(comment.commentText)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isOwnComment = currentUserId === comment.userId
  const canReply = depth < 3 // Limit nesting to 3 levels
  const menuOpen = Boolean(anchorEl)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleReplyClick = () => {
    setIsReplying(true)
    setReplyText('')
  }

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !onReply) return

    setIsSubmitting(true)
    try {
      await onReply(comment.id, replyText.trim())
      setReplyText('')
      setIsReplying(false)
    } catch (error) {
      console.error('Failed to submit reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReplyCancel = () => {
    setIsReplying(false)
    setReplyText('')
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setEditText(comment.commentText)
    handleMenuClose()
  }

  const handleEditSubmit = async () => {
    if (!editText.trim() || !onEdit || editText === comment.commentText) {
      setIsEditing(false)
      return
    }

    setIsSubmitting(true)
    try {
      await onEdit(comment.id, editText.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to edit comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditText(comment.commentText)
  }

  const handleDeleteClick = async () => {
    if (!onDelete) return
    handleMenuClose()

    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await onDelete(comment.id)
      } catch (error) {
        console.error('Failed to delete comment:', error)
      }
    }
  }

  const handleResolveToggle = async () => {
    if (!onResolve) return
    try {
      await onResolve(comment.id, !comment.isResolved)
    } catch (error) {
      console.error('Failed to toggle resolve status:', error)
    }
  }

  return (
    <ThreadContainer depth={depth} isResolved={comment.isResolved}>
      <CommentCard isResolved={comment.isResolved}>
        {comment.isResolved && (
          <ResolvedBadge>
            <CheckCircleIcon sx={{ fontSize: 14 }} />
            Resolved
          </ResolvedBadge>
        )}

        <CommentHeader>
          <Avatar name={comment.userName} size="medium" />
          <CommentMeta>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
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
          {isOwnComment && (
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{ ml: 'auto', width: 32, height: 32 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </CommentHeader>

        {isEditing ? (
          <Box sx={{ mb: 1.5 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              disabled={isSubmitting}
              size="small"
              autoFocus
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={handleEditCancel}
                disabled={isSubmitting}
                icon={<CancelIcon fontSize="small" />}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleEditSubmit}
                disabled={!editText.trim() || isSubmitting}
                loading={isSubmitting}
                icon={<SaveIcon fontSize="small" />}
              >
                Save
              </Button>
            </Box>
          </Box>
        ) : (
          <CommentText>{comment.commentText}</CommentText>
        )}

        {!isEditing && (
          <ActionBar>
            {canReply && onReply && (
              <ActionButton
                variant="tertiary"
                size="small"
                onClick={handleReplyClick}
                icon={<ReplyIcon fontSize="small" />}
              >
                Reply
              </ActionButton>
            )}
            {depth === 0 && onResolve && (
              <ActionButton
                variant="tertiary"
                size="small"
                onClick={handleResolveToggle}
                icon={<CheckCircleIcon fontSize="small" />}
                sx={{
                  color: comment.isResolved ? 'success.main' : 'text.secondary',
                }}
              >
                {comment.isResolved ? 'Unresolve' : 'Resolve'}
              </ActionButton>
            )}
          </ActionBar>
        )}

        {isReplying && (
          <Box sx={{ mt: 2, pl: 0 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={isSubmitting}
              size="small"
              autoFocus
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={handleReplyCancel}
                disabled={isSubmitting}
                icon={<CancelIcon fontSize="small" />}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || isSubmitting}
                loading={isSubmitting}
                icon={<ReplyIcon fontSize="small" />}
              >
                Reply
              </Button>
            </Box>
          </Box>
        )}
      </CommentCard>

      {/* Render replies recursively */}
      {comment.replies && comment.replies.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onResolve={onResolve}
            />
          ))}
        </Box>
      )}

      {/* Context menu for own comments */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditClick}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </ThreadContainer>
  )
}
