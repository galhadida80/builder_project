import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  CloseIcon,
  RefreshIcon,
  LockIcon,
  FileDownloadIcon,
  PersonIcon,
  ScheduleIcon,
} from '@/icons'
import {
  Box,
  Typography,
  Divider,
  Chip,
  IconButton,
  Skeleton,
  Avatar,
  Tooltip,
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
      await rfiApi.closeRfi(rfiId)
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
      await rfiApi.reopenRfi(rfiId)
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
    return new Date(date).toLocaleDateString(getDateLocale(), { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 64px)', maxWidth: 900, mx: 'auto', px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ py: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <IconButton aria-label={t('common.back')} onClick={() => navigate(`/projects/${projectId}/rfis`)} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <EmailIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {rfi.rfi_number}
              </Typography>
              <StatusBadge status={rfi.status} />
              <StatusBadge status={rfi.priority} />
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap>
              {t('rfis.to')}: {rfi.to_name || rfi.to_email}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            <Tooltip title={t('common.refresh')}>
              <IconButton size="small" aria-label={t('common.refresh')} onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon fontSize="small" sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
              </IconButton>
            </Tooltip>
            {rfi.status === 'draft' && (
              <Button variant="primary" size="small" icon={<SendIcon />} loading={sending} onClick={handleSendRfi}>
                {t('rfis.sendRfi')}
              </Button>
            )}
            {rfi.status !== 'closed' && rfi.status !== 'draft' && (
              <Button variant="secondary" size="small" onClick={() => setCloseDialogOpen(true)}>
                {t('rfiDetail.closeRfi')}
              </Button>
            )}
            {rfi.status === 'closed' && (
              <Button variant="secondary" size="small" onClick={() => setReopenDialogOpen(true)}>
                {t('rfiDetail.reopenRfi')}
              </Button>
            )}
          </Box>
        </Box>

        {/* Details bar */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', ml: 7 }}>
          <Chip size="small" label={rfi.subject} sx={{ maxWidth: 300, fontWeight: 500 }} />
          <Chip size="small" label={RFI_CATEGORY_OPTIONS.find(c => c.value === rfi.category)?.label || rfi.category} variant="outlined" />
          {rfi.due_date && (
            <Chip size="small" icon={<ScheduleIcon />} label={formatDate(rfi.due_date)} variant="outlined" color={new Date(rfi.due_date) < new Date() ? 'error' : 'default'} />
          )}
          {rfi.cc_emails && rfi.cc_emails.length > 0 && (
            <Chip size="small" label={`CC: ${rfi.cc_emails.length}`} variant="outlined" />
          )}
          {rfi.location && <Chip size="small" label={rfi.location} variant="outlined" />}
        </Box>
      </Box>

      <Divider />

      {/* Thread Area */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 2, px: { xs: 0.5, sm: 1 } }}>
        {/* Original question card */}
        <Box sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          mb: 2,
          overflow: 'hidden',
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            bgcolor: 'primary.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                {getInitials(rfi.created_by?.display_name, rfi.created_by?.email)}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {rfi.created_by?.display_name || rfi.created_by?.email || 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('rfiDetail.originalQuestion')}
                </Typography>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatFullDate(rfi.sent_at || rfi.created_at)}
            </Typography>
          </Box>
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {rfi.question}
            </Typography>
          </Box>
        </Box>

        {/* Sent event */}
        {rfi.sent_at && (
          <Box sx={{ textAlign: 'center', my: 1.5 }}>
            <Chip
              size="small"
              label={`${t('rfis.sentRfi')} ${formatFullDate(rfi.sent_at)}`}
              sx={{ bgcolor: 'background.paper', fontSize: '0.7rem' }}
            />
          </Box>
        )}

        {/* Response cards */}
        {rfi.responses?.map((response) => (
          <Box
            key={response.id}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              mb: 2,
              overflow: 'hidden',
              ...(response.is_internal && {
                borderLeft: '4px solid',
                borderLeftColor: 'warning.main',
              }),
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              bgcolor: response.is_internal ? 'warning.50' : 'grey.50',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: response.is_internal ? 'warning.main' : 'info.main', fontSize: '0.75rem' }}>
                  {getInitials(response.from_name, response.from_email)}
                </Avatar>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {response.from_name || response.from_email}
                    </Typography>
                    {response.is_internal && (
                      <Chip
                        icon={<LockIcon sx={{ fontSize: '12px !important' }} />}
                        label={t('rfiDetail.internal')}
                        size="small"
                        color="warning"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    )}
                    {response.is_cc_participant && (
                      <Chip label="CC" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                    )}
                  </Box>
                  {response.from_email && response.from_name && (
                    <Typography variant="caption" color="text.secondary">
                      {response.from_email}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {formatFullDate(response.created_at)}
              </Typography>
            </Box>
            <Box sx={{ px: 2, py: 2 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {response.response_text}
              </Typography>

              {response.attachments && response.attachments.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  {response.attachments.map((att) => (
                    <Chip
                      key={att.id}
                      icon={<FileDownloadIcon />}
                      label={att.filename}
                      size="small"
                      variant="outlined"
                      clickable
                      component="a"
                      href={att.url}
                      target="_blank"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        ))}

        {/* No responses yet */}
        {(!rfi.responses || rfi.responses.length === 0) && rfi.status !== 'draft' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <PersonIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {t('rfiDetail.noResponses')}
            </Typography>
          </Box>
        )}

        {/* Draft banner */}
        {rfi.status === 'draft' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Chip
              icon={<EmailIcon />}
              label={t('rfis.draftNotSent')}
              color="warning"
              variant="outlined"
            />
          </Box>
        )}

        <div ref={threadEndRef} />
      </Box>

      {/* Add Response Form */}
      {rfi.status !== 'closed' && rfi.status !== 'draft' && (
        <>
          <Divider />
          <Box sx={{ p: 2, bgcolor: 'background.paper', flexShrink: 0 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
              {t('rfiDetail.addResponse')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <Chip
                label={t('rfiDetail.external')}
                onClick={() => setIsInternal(false)}
                color={!isInternal ? 'primary' : 'default'}
                variant={!isInternal ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip
                label={t('rfiDetail.internal')}
                onClick={() => setIsInternal(true)}
                color={isInternal ? 'warning' : 'default'}
                variant={isInternal ? 'filled' : 'outlined'}
                size="small"
                icon={<LockIcon />}
              />
            </Box>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={6}
              size="small"
              placeholder={t('rfiDetail.responsePlaceholder')}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                size="small"
                icon={<SendIcon />}
                loading={replySending}
                disabled={!replyText.trim()}
                onClick={handleSendReply}
              >
                {t('rfiDetail.sendResponse')}
              </Button>
            </Box>
          </Box>
        </>
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
