import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [rfi, setRfi] = useState<RFI | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadRfiDetail()
  }, [rfiId])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
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
    } finally {
      setRefreshing(false)
    }
  }

  const formatTime = (date?: string) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatFullDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getInitials = (name?: string, email?: string) => {
    const src = name || email || '?'
    return src.split(/[\s@]/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('')
  }

  const isSent = (response: RFIResponseData) => response.is_internal || response.source === 'crm'

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
          <IconButton onClick={() => navigate(`/projects/${projectId}/rfis`)} size="small">
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
              <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
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

      {/* Chat Area */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 2, bgcolor: 'action.hover', borderRadius: 0, px: { xs: 1, sm: 2 } }}>
        {/* Original question as first bubble */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Box sx={{ maxWidth: '75%' }}>
            <Box sx={{
              bgcolor: '#dcf8c6',
              borderRadius: '12px 12px 0 12px',
              p: 2,
              position: 'relative',
            }}>
              <Typography variant="caption" fontWeight={700} color="success.dark" sx={{ display: 'block', mb: 0.5 }}>
                {rfi.created_by?.display_name || rfi.created_by?.email || 'You'}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {rfi.question}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {formatFullDate(rfi.sent_at || rfi.created_at)}
                </Typography>
                {rfi.sent_at && <EmailIcon sx={{ fontSize: 12, color: 'primary.main' }} />}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Status event: sent */}
        {rfi.sent_at && (
          <Box sx={{ textAlign: 'center', my: 1.5 }}>
            <Chip
              size="small"
              label={`${t('rfis.sentRfi')} ${formatFullDate(rfi.sent_at)}`}
              sx={{ bgcolor: 'background.paper', fontSize: '0.7rem' }}
            />
          </Box>
        )}

        {/* Response bubbles */}
        {rfi.responses?.map((response) => {
          const sent = isSent(response)
          return (
            <Box key={response.id} sx={{ display: 'flex', justifyContent: sent ? 'flex-end' : 'flex-start', mb: 1.5 }}>
              {/* Avatar for received messages */}
              {!sent && (
                <Avatar sx={{ width: 32, height: 32, mr: 1, mt: 0.5, bgcolor: 'info.main', fontSize: '0.75rem' }}>
                  {getInitials(response.from_name, response.from_email)}
                </Avatar>
              )}
              <Box sx={{ maxWidth: '75%' }}>
                <Box sx={{
                  bgcolor: sent
                    ? (response.is_internal ? '#fff3cd' : '#dcf8c6')
                    : 'background.paper',
                  borderRadius: sent ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  p: 2,
                  boxShadow: 1,
                }}>
                  {/* Sender name */}
                  <Typography variant="caption" fontWeight={700} color={sent ? 'success.dark' : 'primary.main'} sx={{ display: 'block', mb: 0.5 }}>
                    {response.from_name || response.from_email}
                    {response.is_internal && (
                      <LockIcon sx={{ fontSize: 11, ml: 0.5, verticalAlign: 'middle', color: 'warning.main' }} />
                    )}
                    {response.is_cc_participant && (
                      <Chip label="CC" size="small" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />
                    )}
                  </Typography>

                  {/* Message text */}
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {response.response_text}
                  </Typography>

                  {/* Attachments */}
                  {response.attachments && response.attachments.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
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

                  {/* Timestamp */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {formatTime(response.created_at)}
                    </Typography>
                    {response.is_internal && (
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'warning.dark' }}>
                        {t('rfiDetail.internal')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              {/* Avatar for sent messages */}
              {sent && (
                <Avatar sx={{ width: 32, height: 32, ml: 1, mt: 0.5, bgcolor: 'success.main', fontSize: '0.75rem' }}>
                  {getInitials(response.from_name, response.from_email)}
                </Avatar>
              )}
            </Box>
          )
        })}

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

        <div ref={chatEndRef} />
      </Box>

      {/* Input Bar — WhatsApp-style */}
      {rfi.status !== 'closed' && rfi.status !== 'draft' && (
        <>
          <Divider />
          <Box sx={{ p: 1.5, bgcolor: 'background.paper', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                size="small"
                placeholder={t('rfiDetail.responsePlaceholder')}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 3 },
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSendReply}
                disabled={replySending || !replyText.trim()}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 40,
                  height: 40,
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
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
      />
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
