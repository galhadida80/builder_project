import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TextField } from '../components/ui/TextField'
import { ConfirmModal } from '../components/ui/Modal'
import { rfiApi, RFI_CATEGORY_OPTIONS } from '../api/rfi'
import type { RFI, RFIResponseData } from '../api/rfi'
import { useToast } from '../components/common/ToastProvider'
import {
  ArrowBackIcon,
  EmailIcon,
  SendIcon,
  LockIcon,
  FileDownloadIcon,
  ScheduleIcon,
} from '@/icons'
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Skeleton,
  Avatar,
} from '@/mui'

export default function RFIDetailPage() {
  const { projectId, rfiId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const threadEndRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [rfi, setRfi] = useState<RFI | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [closingRfi, setClosingRfi] = useState(false)
  const [reopeningRfi, setReopeningRfi] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadRfiDetail()
  }, [rfiId])

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [rfi?.responses?.length])

  const loadRfiDetail = async () => {
    if (!rfiId) return
    try {
      setLoading(true)
      const data = await rfiApi.get(rfiId)
      setRfi(data)
    } catch {
      showError(t('rfis.failedToLoadDetails'))
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const handleSendRfi = async () => {
    if (!rfi) return
    setSending(true)
    try {
      await rfiApi.send(rfi.id)
      showSuccess(t('rfis.sentSuccess'))
      await loadRfiDetail()
    } catch {
      showError(t('rfis.failedToSend'))
    } finally {
      setSending(false)
    }
  }

  const handleSendReply = async () => {
    if (!rfiId || !replyText.trim()) {
      showError(t('rfiDetail.enterResponse'))
      return
    }
    setReplySending(true)
    try {
      await rfiApi.addResponse(rfiId, { response_text: replyText, is_internal: isInternal })
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
    setClosingRfi(true)
    try {
      await withMinDuration(rfiApi.closeRfi(rfiId))
      showSuccess(t('rfiDetail.closedSuccess'))
      setCloseDialogOpen(false)
      await loadRfiDetail()
    } catch {
      showError(t('rfiDetail.failedToClose'))
    } finally {
      setClosingRfi(false)
    }
  }

  const handleReopenRfi = async () => {
    if (!rfiId) return
    setReopeningRfi(true)
    try {
      await withMinDuration(rfiApi.reopenRfi(rfiId))
      showSuccess(t('rfiDetail.reopenedSuccess'))
      setReopenDialogOpen(false)
      await loadRfiDetail()
    } catch {
      showError(t('rfiDetail.failedToReopen'))
    } finally {
      setReopeningRfi(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadRfiDetail()
    } finally {
      setRefreshing(false)
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatFullDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleString(getDateLocale(), { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getInitials = (name?: string, email?: string) => {
    const src = name || email || '?'
    return src.split(/[\s@]/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('')
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        <Skeleton variant="text" width={250} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    )
  }

  if (!rfi) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">{t('rfiDetail.notFound')}</Typography>
        <Button variant="primary" sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          {t('rfiDetail.goBack')}
        </Button>
      </Box>
    )
  }

  const priorityBannerColor = rfi.priority === 'urgent' ? 'error' : rfi.priority === 'high' ? 'warning' : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 64px)', maxWidth: 900, mx: 'auto', px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ py: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <IconButton aria-label={t('common.back')} onClick={() => navigate(`/projects/${projectId}/rfis`)} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={700}>{rfi.rfi_number}</Typography>
          <StatusBadge status={rfi.status} />
        </Box>
      </Box>

      {/* Priority Banner */}
      {priorityBannerColor && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, mb: 2, bgcolor: `${priorityBannerColor}.main`, borderRadius: 2, opacity: 0.15, border: '1px solid', borderColor: `${priorityBannerColor}.main` }}>
          <Typography variant="body2" fontWeight={700} color={`${priorityBannerColor}.main`}>
            {t(`rfis.priorities.${rfi.priority}`, { defaultValue: rfi.priority })}
          </Typography>
        </Box>
      )}

      {/* Thread Area */}
      <Box sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
        {/* Question Card */}
        <Card sx={{ mb: 2 }}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Chip label={RFI_CATEGORY_OPTIONS.find(c => c.value === rfi.category)?.labelKey ? t(RFI_CATEGORY_OPTIONS.find(c => c.value === rfi.category)!.labelKey) : rfi.category} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
              <Typography variant="caption" color="text.secondary">{t('rfiDetail.originalQuestion')}</Typography>
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3, mb: 1 }}>{rfi.subject}</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>{rfi.question}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon sx={{ fontSize: 14 }} />
              {formatFullDate(rfi.sent_at || rfi.created_at)}
            </Typography>
          </Box>
        </Card>

        {/* Info Section */}
        <Card sx={{ mb: 2 }}>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                {getInitials(rfi.to_name, rfi.to_email)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('rfis.to')}</Typography>
                <Typography variant="body2" fontWeight={700}>{rfi.to_name || rfi.to_email}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'info.main', fontSize: '0.8rem' }}>
                {getInitials(rfi.created_by?.fullName, rfi.created_by?.email)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('rfiDetail.sentBy')}</Typography>
                <Typography variant="body2" fontWeight={700}>{rfi.created_by?.fullName || rfi.created_by?.email || 'Unknown'}</Typography>
              </Box>
            </Box>
            {rfi.due_date && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: new Date(rfi.due_date) < new Date() ? 'error.light' : 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScheduleIcon sx={{ fontSize: 20, color: new Date(rfi.due_date) < new Date() ? 'error.main' : 'text.secondary' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('rfis.dueDate')}</Typography>
                  <Typography variant="body2" fontWeight={700} color={new Date(rfi.due_date) < new Date() ? 'error.main' : 'text.primary'}>{formatDate(rfi.due_date)}</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Card>

        {/* Response cards */}
        {rfi.responses && rfi.responses.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, px: 0.5 }}>{t('rfiDetail.addResponse')}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rfi.responses.map((response) => (
                <Box key={response.id} sx={{ display: 'flex', gap: 1.5 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: response.is_internal ? 'warning.main' : 'primary.main', fontSize: '0.7rem', flexShrink: 0, mt: 0.5 }}>
                    {getInitials(response.from_name, response.from_email)}
                  </Avatar>
                  <Card sx={{ flex: 1, ...(response.is_internal && { borderInlineStart: '3px solid', borderInlineStartColor: 'warning.main' }) }}>
                    <Box sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" fontWeight={700} color="primary.main">{response.from_name || response.from_email}</Typography>
                          {response.is_internal && <Chip icon={<LockIcon sx={{ fontSize: '10px !important' }} />} label={t('rfiDetail.internal')} size="small" color="warning" sx={{ height: 18, fontSize: '0.6rem' }} />}
                        </Box>
                        <Typography variant="caption" color="text.disabled">{formatFullDate(response.created_at)}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', lineHeight: 1.6 }}>{response.response_text}</Typography>
                      {response.attachments && response.attachments.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {response.attachments.map((att) => (
                            <Chip key={att.id} icon={<FileDownloadIcon />} label={att.filename} size="small" variant="outlined" clickable component="a" href={att.url} target="_blank" sx={{ fontSize: '0.65rem' }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Card>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* No responses yet */}
        {(!rfi.responses || rfi.responses.length === 0) && rfi.status !== 'draft' && (
          <Card sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, px: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2, m: 1 }}>
              <ScheduleIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">{t('rfiDetail.noResponses')}</Typography>
            </Box>
          </Card>
        )}

        {rfi.status === 'draft' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Chip icon={<EmailIcon />} label={t('rfis.draftNotSent')} color="warning" variant="outlined" />
          </Box>
        )}

        <div ref={threadEndRef} />
      </Box>

      {/* Add Response Form */}
      {rfi.status !== 'closed' && rfi.status !== 'draft' && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Chip label={t('rfiDetail.external')} onClick={() => setIsInternal(false)} color={!isInternal ? 'primary' : 'default'} variant={!isInternal ? 'filled' : 'outlined'} size="small" />
            <Chip label={t('rfiDetail.internal')} onClick={() => setIsInternal(true)} color={isInternal ? 'warning' : 'default'} variant={isInternal ? 'filled' : 'outlined'} size="small" icon={<LockIcon />} />
          </Box>
          <TextField fullWidth multiline minRows={2} maxRows={6} size="small" placeholder={t('rfiDetail.responsePlaceholder')} value={replyText} onChange={(e) => setReplyText(e.target.value)} sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="small" icon={<SendIcon />} loading={replySending} disabled={!replyText.trim()} onClick={handleSendReply}>{t('rfiDetail.sendResponse')}</Button>
          </Box>
        </Box>
      )}

      {/* Bottom Actions - matches Stitch design */}
      {rfi.status === 'draft' && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, flexShrink: 0 }}>
          <Button variant="primary" fullWidth icon={<SendIcon />} loading={sending} onClick={handleSendRfi}>{t('rfis.sendRfi')}</Button>
        </Box>
      )}
      {rfi.status !== 'closed' && rfi.status !== 'draft' && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, flexShrink: 0 }}>
          <Button variant="secondary" fullWidth onClick={() => setCloseDialogOpen(true)}>{t('rfiDetail.closeRfi')}</Button>
        </Box>
      )}
      {rfi.status === 'closed' && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, flexShrink: 0 }}>
          <Button variant="secondary" fullWidth onClick={() => setReopenDialogOpen(true)}>{t('rfiDetail.reopenRfi')}</Button>
        </Box>
      )}

      <ConfirmModal
        open={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        onConfirm={handleCloseRfi}
        title={t('rfiDetail.closeRfi')}
        message={t('rfiDetail.closeConfirmation')}
        confirmLabel={t('rfiDetail.closeRfi')}
        loading={closingRfi}
      />
      <ConfirmModal
        open={reopenDialogOpen}
        onClose={() => setReopenDialogOpen(false)}
        onConfirm={handleReopenRfi}
        title={t('rfiDetail.reopenRfi')}
        message={t('rfiDetail.reopenConfirmation')}
        confirmLabel={t('rfiDetail.reopenRfi')}
        loading={reopeningRfi}
      />
    </Box>
  )
}
