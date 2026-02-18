import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Avatar,
  TextField,
  Button,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import ReplyIcon from '@mui/icons-material/Reply'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { discussionsApi, type Discussion } from '../../api/discussions'

interface DiscussionThreadProps {
  projectId: string
  entityType: string
  entityId: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

interface CommentItemProps {
  comment: Discussion
  projectId: string
  onReply: (parentId: string) => void
  onRefresh: () => void
  depth: number
}

function CommentItem({ comment, projectId, onReply, onRefresh, depth }: CommentItemProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return
    try {
      await discussionsApi.update(projectId, comment.id, editContent.trim())
      setEditing(false)
      onRefresh()
    } catch {
      // silently fail
    }
  }

  const handleDelete = async () => {
    try {
      await discussionsApi.delete(projectId, comment.id)
      onRefresh()
    } catch {
      // silently fail
    }
  }

  const authorName = comment.author?.fullName || 'Unknown'

  return (
    <Box sx={{ ml: depth > 0 ? 4 : 0, mb: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
          {getInitials(authorName)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {authorName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTime(comment.createdAt)}
            </Typography>
          </Box>

          {editing ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                size="small"
                fullWidth
                multiline
                maxRows={4}
              />
              <Button size="small" onClick={handleSaveEdit}>
                {t('common.save')}
              </Button>
              <Button size="small" onClick={() => setEditing(false)}>
                {t('common.cancel')}
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {comment.content}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => onReply(comment.id)}
              aria-label={t('discussions.reply')}
            >
              <ReplyIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => { setEditing(true); setEditContent(comment.content) }}
              aria-label={t('common.edit')}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDelete}
              aria-label={t('common.delete')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {comment.replies && comment.replies.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              projectId={projectId}
              onReply={onReply}
              onRefresh={onRefresh}
              depth={depth + 1}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

export default function DiscussionThread({ projectId, entityType, entityId }: DiscussionThreadProps) {
  const { t } = useTranslation()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newContent, setNewContent] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchDiscussions = useCallback(async () => {
    try {
      const data = await discussionsApi.list(projectId, entityType, entityId)
      setDiscussions(data)
      setError(null)
    } catch {
      setError(t('discussions.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [projectId, entityType, entityId, t])

  useEffect(() => {
    fetchDiscussions()
  }, [fetchDiscussions])

  const handleSubmit = async () => {
    if (!newContent.trim() || submitting) return
    setSubmitting(true)
    try {
      await discussionsApi.create(projectId, {
        entity_type: entityType,
        entity_id: entityId,
        content: newContent.trim(),
        parent_id: replyToId || undefined,
      })
      setNewContent('')
      setReplyToId(null)
      await fetchDiscussions()
    } catch {
      setError(t('discussions.failedToCreate'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = (parentId: string) => {
    setReplyToId(parentId)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        {t('discussions.title')}
        {discussions.length > 0 && ` (${discussions.length})`}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {discussions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('discussions.noComments')}
        </Typography>
      )}

      <Box sx={{ mb: 2 }}>
        {discussions.map((d) => (
          <CommentItem
            key={d.id}
            comment={d}
            projectId={projectId}
            onReply={handleReply}
            onRefresh={fetchDiscussions}
            depth={0}
          />
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {replyToId && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="primary">
            {t('discussions.replyingTo')}
          </Typography>
          <Button size="small" onClick={() => setReplyToId(null)}>
            {t('common.cancel')}
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder={t('discussions.placeholder')}
          size="small"
          fullWidth
          multiline
          maxRows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <IconButton
          onClick={handleSubmit}
          disabled={!newContent.trim() || submitting}
          color="primary"
          aria-label={t('discussions.send')}
        >
          {submitting ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Paper>
  )
}
