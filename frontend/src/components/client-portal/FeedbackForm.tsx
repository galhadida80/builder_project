import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../ui/EmptyState'
import { CommentIcon, SendIcon, RateReviewIcon } from '@/icons'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  Chip,
  alpha,
} from '@/mui'
import type { Discussion } from '../../api/clientPortal'
import dayjs from 'dayjs'

interface FeedbackFormProps {
  projectId: string
  onSubmit: (subject: string, content: string) => Promise<void>
  feedbackList?: Discussion[]
  loading?: boolean
}

export function FeedbackForm({ projectId, onSubmit, feedbackList = [], loading = false }: FeedbackFormProps) {
  const { t } = useTranslation()
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleSubmit = async () => {
    if (!subject.trim() || !content.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit(subject.trim(), content.trim())
      setSubject('')
      setContent('')
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'resolved':
        return 'success'
      case 'pending':
        return 'warning'
      default:
        return 'info'
    }
  }

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={400} />
      </Box>
    )
  }

  return (
    <Box>
      {/* Feedback Form */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.default',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RateReviewIcon sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="h6" fontWeight={600}>
              {t('clientPortal.submitFeedback')}
            </Typography>
          </Box>
        </Box>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('clientPortal.feedbackSubject')}
              placeholder={t('clientPortal.subjectPlaceholder')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label={t('clientPortal.feedbackContent')}
              placeholder={t('clientPortal.feedbackPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              multiline
              rows={4}
              variant="outlined"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!subject.trim() || !content.trim() || isSubmitting}
                startIcon={<SendIcon />}
                sx={{ minWidth: 140 }}
              >
                {isSubmitting ? t('clientPortal.submittingFeedback') : t('clientPortal.submitFeedback')}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Feedback History */}
      {feedbackList.length > 0 && (
        <Card
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CommentIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={600} fontSize="1rem">
                {t('clientPortal.feedbackHistory')}
              </Typography>
              <Chip
                label={feedbackList.length}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                }}
              />
            </Box>
            <Button
              size="small"
              onClick={() => setShowHistory(!showHistory)}
              sx={{ textTransform: 'none' }}
            >
              {showHistory ? t('common.hide') : t('clientPortal.viewFeedback')}
            </Button>
          </Box>
          {showHistory && (
            <List sx={{ p: 0 }}>
              {feedbackList.map((feedback, index) => (
                <Box key={feedback.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1,
                      py: 2,
                      px: { xs: 2, sm: 3 },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                          {feedback.entityType}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {feedback.content}
                        </Typography>
                      </Box>
                      <Chip
                        label={feedback.entityType}
                        size="small"
                        color={getStatusColor(feedback.entityType)}
                        sx={{ flexShrink: 0 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(feedback.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Typography>
                      {feedback.author && (
                        <Typography variant="caption" color="text.secondary">
                          {feedback.author.fullName}
                        </Typography>
                      )}
                    </Box>
                  </ListItem>
                  {index < feedbackList.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Card>
      )}

      {/* Empty State */}
      {feedbackList.length === 0 && (
        <EmptyState
          variant="no-data"
          title={t('clientPortal.noFeedback')}
          description={t('clientPortal.noFeedbackYet')}
          icon={<CommentIcon />}
        />
      )}
    </Box>
  )
}
