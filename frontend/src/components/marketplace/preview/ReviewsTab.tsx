import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Divider, List, ListItem, TextField } from '@/mui'
import { Rating } from '@mui/material'
import { Button } from '../../ui/Button'
import { TemplateRating } from '../../../api/marketplace'

interface ReviewsTabProps {
  templateId: string
  ratings: TemplateRating[]
  reviewCount: number
  onSubmitReview: (rating: number, comment?: string) => Promise<void>
}

export function ReviewsTab({ ratings, reviewCount, onSubmitReview }: ReviewsTabProps) {
  const { t } = useTranslation()
  const [userRating, setUserRating] = useState<number>(0)
  const [userComment, setUserComment] = useState<string>('')
  const [submittingRating, setSubmittingRating] = useState(false)

  const handleSubmitRating = async () => {
    if (!userRating) return

    setSubmittingRating(true)
    try {
      await onSubmitReview(userRating, userComment || undefined)
      setUserRating(0)
      setUserComment('')
    } finally {
      setSubmittingRating(false)
    }
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
        {t('marketplace.addReview', 'Add Your Review')}
      </Typography>
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Rating
          value={userRating}
          onChange={(_event, newValue) => setUserRating(newValue || 0)}
          size="large"
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder={t('marketplace.commentPlaceholder', 'Share your experience (optional)')}
          value={userComment}
          onChange={(e) => setUserComment(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Button
          onClick={handleSubmitRating}
          disabled={!userRating || submittingRating}
          loading={submittingRating}
          size="small"
        >
          {t('marketplace.submitReview', 'Submit Review')}
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
        {t('marketplace.allReviews', 'All Reviews')} ({reviewCount})
      </Typography>
      {ratings && ratings.length > 0 ? (
        <List>
          {ratings.map((rating) => (
            <ListItem key={rating.id} alignItems="flex-start" sx={{ px: 0 }}>
              <Box sx={{ width: '100%' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {rating.user?.fullName || t('marketplace.anonymous', 'Anonymous')}
                  </Typography>
                  <Rating value={rating.rating} readOnly size="small" />
                </Box>
                {rating.comment && (
                  <Typography variant="body2" color="text.secondary">
                    {rating.comment}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {new Date(rating.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('marketplace.noReviews', 'No reviews yet. Be the first to review!')}
        </Typography>
      )}
    </Box>
  )
}
