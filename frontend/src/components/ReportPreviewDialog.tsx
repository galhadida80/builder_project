import { useState, useRef, useEffect } from 'react'
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
} from '@/mui'
import { Button } from './ui/Button'
import {
  CloseIcon,
  DownloadIcon,
  EditIcon,
  VisibilityIcon,
  PictureAsPdfIcon,
} from '@/icons'

interface ReportPreviewDialogProps {
  open: boolean
  onClose: () => void
  htmlContent: string
  reportTitle: string
  onDownloadPdf: (editedHtml?: string) => Promise<void>
}

type TabValue = 'preview' | 'edit'

export default function ReportPreviewDialog({
  open,
  onClose,
  htmlContent,
  reportTitle,
  onDownloadPdf,
}: ReportPreviewDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [activeTab, setActiveTab] = useState<TabValue>('preview')
  const [editedHtml, setEditedHtml] = useState(htmlContent)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (open) {
      setEditedHtml(htmlContent)
      setActiveTab('preview')
      setError(null)
      setDownloading(false)
    }
  }, [open, htmlContent])

  useEffect(() => {
    if (activeTab === 'preview' && iframeRef.current) {
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(editedHtml)
        doc.close()
      }
    }
  }, [activeTab, editedHtml])

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      await onDownloadPdf(activeTab === 'edit' ? editedHtml : undefined)
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || t('reports.downloadFailed', 'Failed to download PDF'))
    } finally {
      setDownloading(false)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue)
  }

  const handleClose = () => {
    if (!downloading) {
      onClose()
    }
  }

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
          <PictureAsPdfIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            {reportTitle}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={downloading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="report preview tabs">
          <Tab
            value="preview"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon sx={{ fontSize: 18 }} />
                <span>{t('reports.preview', 'Preview')}</span>
              </Box>
            }
          />
          <Tab
            value="edit"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon sx={{ fontSize: 18 }} />
                <span>{t('reports.edit', 'Edit')}</span>
              </Box>
            }
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {activeTab === 'preview' && (
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              bgcolor: 'grey.100',
              display: 'flex',
              justifyContent: 'center',
              p: isMobile ? 1 : 3,
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: '210mm',
                bgcolor: 'background.paper',
                boxShadow: isMobile ? 'none' : 3,
                borderRadius: isMobile ? 0 : 1,
                overflow: 'hidden',
              }}
            >
              <iframe
                ref={iframeRef}
                title={t('reports.previewFrame', 'Report Preview')}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '297mm',
                  border: 'none',
                }}
              />
            </Box>
          </Box>
        )}

        {activeTab === 'edit' && (
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t(
                'reports.editWarning',
                'Editing HTML directly. Be careful to preserve the structure and styling.'
              )}
            </Alert>
            <Box
              component="textarea"
              value={editedHtml}
              onChange={(e) => setEditedHtml((e.target as HTMLTextAreaElement).value)}
              spellCheck={false}
              sx={{
                width: '100%',
                minHeight: '60vh',
                p: 2,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'grey.50',
                resize: 'vertical',
                '&:focus': {
                  outline: 'none',
                  borderColor: 'primary.main',
                  boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
          gap: 1,
        }}
      >
        <Button variant="secondary" onClick={handleClose} disabled={downloading}>
          {t('common.close', 'Close')}
        </Button>
        <Button
          variant="primary"
          icon={<DownloadIcon />}
          onClick={handleDownload}
          loading={downloading}
        >
          {t('reports.downloadPdf', 'Download PDF')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
