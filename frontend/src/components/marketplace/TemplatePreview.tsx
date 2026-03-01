import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Alert,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  CircularProgress,
} from '@/mui'
import { Button } from '../ui/Button'
import {
  CloseIcon,
  DownloadIcon,
  InfoIcon,
  DescriptionIcon,
  RateReviewIcon,
} from '@/icons'
import { MarketplaceTemplateDetail, marketplaceApi } from '../../api/marketplace'
import { OverviewTab } from './preview/OverviewTab'
import { TemplateDataTab } from './preview/TemplateDataTab'
import { ReviewsTab } from './preview/ReviewsTab'

interface TemplatePreviewProps {
  open: boolean
  onClose: () => void
  templateId: string
  onInstall?: (templateId: string) => Promise<void>
}

type TabValue = 'overview' | 'preview' | 'reviews'

export default function TemplatePreview({
  open,
  onClose,
  templateId,
  onInstall,
}: TemplatePreviewProps) {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isHebrew = i18n.language === 'he'

  const [activeTab, setActiveTab] = useState<TabValue>('overview')
  const [template, setTemplate] = useState<MarketplaceTemplateDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && templateId) {
      loadTemplate()
    } else {
      setActiveTab('overview')
      setError(null)
    }
  }, [open, templateId])

  const loadTemplate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await marketplaceApi.getTemplate(templateId)
      setTemplate(data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(
        e.response?.data?.detail || t('marketplace.errors.loadFailed', 'Failed to load template')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async () => {
    if (!template || !onInstall) return

    setInstalling(true)
    setError(null)
    try {
      await onInstall(template.id)
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(
        e.response?.data?.detail ||
          t('marketplace.errors.installFailed', 'Failed to install template')
      )
    } finally {
      setInstalling(false)
    }
  }

  const handleSubmitReview = async (rating: number, comment?: string) => {
    if (!template) return

    setError(null)
    try {
      await marketplaceApi.createRating(template.id, rating, comment)
      await loadTemplate()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(
        e.response?.data?.detail || t('marketplace.errors.ratingFailed', 'Failed to submit rating')
      )
      throw err
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue)
  }

  const handleClose = () => {
    if (!installing) {
      onClose()
    }
  }

  const templateName = template
    ? isHebrew
      ? template.nameHe || template.name
      : template.name
    : ''

  const reviewCount = template?.listing?.reviewCount ?? 0

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          height: isMobile ? '100%' : '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <InfoIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            {templateName || t('marketplace.templatePreview', 'Template Preview')}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={installing}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="template preview tabs">
          <Tab
            value="overview"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon sx={{ fontSize: 18 }} />
                <span>{t('marketplace.overview', 'Overview')}</span>
              </Box>
            }
          />
          <Tab
            value="preview"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon sx={{ fontSize: 18 }} />
                <span>{t('marketplace.templateData', 'Template Data')}</span>
              </Box>
            }
          />
          <Tab
            value="reviews"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RateReviewIcon sx={{ fontSize: 18 }} />
                <span>
                  {t('marketplace.reviews', 'Reviews')} ({reviewCount})
                </span>
              </Box>
            }
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 300,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            {activeTab === 'overview' && template && (
              <OverviewTab template={template} isHebrew={isHebrew} />
            )}

            {activeTab === 'preview' && template && (
              <TemplateDataTab templateData={template.templateData} />
            )}

            {activeTab === 'reviews' && template && (
              <ReviewsTab
                templateId={template.id}
                ratings={template.ratings || []}
                reviewCount={reviewCount}
                onSubmitReview={handleSubmitReview}
              />
            )}
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
          justifyContent: 'space-between',
        }}
      >
        <Button onClick={handleClose} variant="secondary" disabled={installing}>
          {t('common.close', 'Close')}
        </Button>
        {onInstall && template && (
          <Button
            onClick={handleInstall}
            loading={installing}
            disabled={loading}
            startIcon={<DownloadIcon />}
          >
            {t('marketplace.install', 'Install Template')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
