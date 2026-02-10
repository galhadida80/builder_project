import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EmailIcon from '@mui/icons-material/Email'
import SendIcon from '@mui/icons-material/Send'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TextField } from '../components/ui/TextField'
import { ConfirmModal } from '../components/ui/Modal'
import { rfiApi, RFI_CATEGORY_OPTIONS } from '../api/rfi'
import type { RFI } from '../api/rfi'
import { useToast } from '../components/common/ToastProvider'

export default function RFIDetailPage() {
  const { rfiId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()

  const [loading, setLoading] = useState(true)
  const [rfi, setRfi] = useState<RFI | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadRfiDetail()
  }, [rfiId])

  const loadRfiDetail = async () => {
    if (!rfiId) return
    try {
      setLoading(true)
      const data = await rfiApi.get(rfiId)
      setRfi(data)
    } catch {
      showError(t('rfis.failedToLoadDetails'))
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!rfiId || !replyText.trim()) {
      showError(t('rfiDetail.enterResponse'))
      return
    }

    setReplySending(true)
    try {
      await rfiApi.addResponse(rfiId, {
        response_text: replyText,
        is_internal: isInternal,
      })
      showSuccess(t('rfiDetail.responseSent'))
      setReplyText('')
      setIsInternal(false)
      await loadRfiDetail()
    } catch {
      showError(t('rfiDetail.failedToSendResponse'))
    } finally {
      setReplySending(false)
    }
  }

  const handleCloseRfi = async () => {
    if (!rfiId) return
    try {
      await rfiApi.closeRfi(rfiId)
      showSuccess(t('rfiDetail.closedSuccess'))
      setCloseDialogOpen(false)
      await loadRfiDetail()
    } catch {
      showError(t('rfiDetail.failedToClose'))
    }
  }

  const handleReopenRfi = async () => {
    if (!rfiId) return
    try {
      await rfiApi.reopenRfi(rfiId)
      showSuccess(t('rfiDetail.reopenedSuccess'))
      setReopenDialogOpen(false)
      await loadRfiDetail()
    } catch {
      showError(t('rfiDetail.failedToReopen'))
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadRfiDetail()
      showSuccess(t('rfiDetail.refreshed'))
    } catch {
      showError(t('rfiDetail.failedToRefresh'))
    } finally {
      setRefreshing(false)
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={300} />
      </Box>
    )
  }

  if (!rfi) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">{t('rfiDetail.notFound')}</Typography>
        <Button variant="primary" sx={{ mt: 2 }} onClick={() => navigate('/projects')}>
          {t('rfiDetail.goBack')}
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>{rfi.rfi_number} - {rfi.subject}</Typography>
          <Typography variant="body2" color="text.secondary">{t('rfiDetail.createdOn')} {formatDate(rfi.created_at)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <StatusBadge status={rfi.status} />
          <StatusBadge status={rfi.priority} />
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 3 }}>
          {/* RFI Details Section */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                {t('rfiDetail.originalQuestion')}
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 3 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{rfi.question}</Typography>
              </Box>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                {t('rfiDetail.details')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('rfis.to')}</Typography>
                  <Typography variant="body2" fontWeight={500}>{rfi.to_name || rfi.to_email}</Typography>
                  <Typography variant="caption" color="text.secondary">{rfi.to_email}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('rfis.category')}</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {RFI_CATEGORY_OPTIONS.find(c => c.value === rfi.category)?.label || rfi.category}
                  </Typography>
                </Box>
                {rfi.cc_recipients && rfi.cc_recipients.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('rfiDetail.ccRecipients')}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {rfi.cc_recipients.map((cc) => (
                        <Chip key={cc} label={cc} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('rfis.dueDate')}</Typography>
                  <Typography variant="body2" fontWeight={500}>{formatDate(rfi.due_date)}</Typography>
                </Box>
                {rfi.location && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('rfis.location')}</Typography>
                    <Typography variant="body2" fontWeight={500}>{rfi.location}</Typography>
                  </Box>
                )}
                {rfi.drawing_reference && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('rfis.drawingReference')}</Typography>
                    <Typography variant="body2" fontWeight={500}>{rfi.drawing_reference}</Typography>
                  </Box>
                )}
                {rfi.specification_reference && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('rfiDetail.specificationRef')}</Typography>
                    <Typography variant="body2" fontWeight={500}>{rfi.specification_reference}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Conversation Thread */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>{t('rfiDetail.conversationThread')} ({rfi.responses?.length || 0})</Typography>
            <Button variant="secondary" size="small" onClick={handleRefresh} loading={refreshing}>
              {t('common.refresh')}
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {rfi.responses && rfi.responses.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rfi.responses.map((response, index) => (
                <Box
                  key={response.id}
                  sx={{
                    p: 2.5,
                    bgcolor: response.is_internal ? 'warning.light' : 'info.light',
                    borderRadius: 2,
                    borderLeft: `4px solid ${response.is_internal ? '#ff9800' : '#2196f3'}`,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {response.from_name || response.from_email}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(response.created_at)}
                        </Typography>
                        {response.is_internal && (
                          <Chip label={t('rfiDetail.internal')} size="small" sx={{ height: 18, fontSize: 11 }} color="warning" />
                        )}
                      </Box>
                    </Box>
                    {response.is_cc_participant && (
                      <Chip label={t('rfiDetail.cc')} size="small" sx={{ height: 18, fontSize: 11 }} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1.5 }}>
                    {response.response_text}
                  </Typography>
                  {response.attachments && response.attachments.length > 0 && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('rfiDetail.attachments')}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {response.attachments.map((attachment) => (
                          <Button
                            key={attachment.id}
                            variant="secondary"
                            size="small"
                            icon={<FileDownloadIcon />}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {attachment.filename}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              {t('rfiDetail.noResponses')}
            </Typography>
          )}
        </Box>
      </Card>

      {/* Reply Input */}
      {rfi.status !== 'closed' && (
        <Card sx={{ mb: 3 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
              {t('rfiDetail.addResponse')}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder={t('rfiDetail.responsePlaceholder')}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                <Chip
                  label={t('rfiDetail.external')}
                  onClick={() => setIsInternal(false)}
                  color={!isInternal ? 'primary' : 'default'}
                  variant={!isInternal ? 'filled' : 'outlined'}
                />
                <Chip
                  label={t('rfiDetail.internal')}
                  onClick={() => setIsInternal(true)}
                  color={isInternal ? 'warning' : 'default'}
                  variant={isInternal ? 'filled' : 'outlined'}
                />
              </Box>
              <Button
                variant="primary"
                icon={replySending ? undefined : <SendIcon />}
                loading={replySending}
                onClick={handleSendReply}
              >
                {t('rfiDetail.sendResponse')}
              </Button>
            </Box>
          </Box>
        </Card>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {rfi.status === 'draft' && (
          <Button
            variant="primary"
            icon={<SendIcon />}
            onClick={async () => {
              try {
                await rfiApi.send(rfi.id)
                showSuccess(t('rfis.sentSuccess'))
                await loadRfiDetail()
              } catch {
                showError(t('rfis.failedToSend'))
              }
            }}
          >
            {t('rfis.sendRfi')}
          </Button>
        )}
        {rfi.status === 'draft' && (
          <Button
            variant="secondary"
            icon={<EditIcon />}
            onClick={() => navigate(`/projects/${rfi.project_id}/rfis/${rfi.id}/edit`)}
          >
            {t('rfis.editRfi')}
          </Button>
        )}
        {rfi.status !== 'closed' && (
          <Button
            variant="secondary"
            icon={<CloseIcon />}
            onClick={() => setCloseDialogOpen(true)}
          >
            {t('rfiDetail.closeRfi')}
          </Button>
        )}
        {rfi.status === 'closed' && (
          <Button
            variant="secondary"
            onClick={() => setReopenDialogOpen(true)}
          >
            {t('rfiDetail.reopenRfi')}
          </Button>
        )}
      </Box>

      {/* Close Confirmation Dialog */}
      <ConfirmModal
        open={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        onConfirm={handleCloseRfi}
        title={t('rfiDetail.closeRfi')}
        message={t('rfiDetail.closeConfirmation')}
        confirmLabel={t('rfiDetail.closeRfi')}
      />

      {/* Reopen Confirmation Dialog */}
      <ConfirmModal
        open={reopenDialogOpen}
        onClose={() => setReopenDialogOpen(false)}
        onConfirm={handleReopenRfi}
        title={t('rfiDetail.reopenRfi')}
        message={t('rfiDetail.reopenConfirmation')}
        confirmLabel={t('rfiDetail.reopenRfi')}
      />
    </Box>
  )
}
