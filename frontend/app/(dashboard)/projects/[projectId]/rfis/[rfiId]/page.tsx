'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'
import EmailIcon from '@mui/icons-material/Email'
import CommentIcon from '@mui/icons-material/Comment'
import SendIcon from '@mui/icons-material/Send'
import FolderIcon from '@mui/icons-material/Folder'
import { apiClient } from '@/lib/api/client'
import { filesApi, FileRecord } from '@/lib/api/files'
import DocumentList from '@/components/documents/DocumentList'
import DocumentViewerDialog from '@/components/documents/DocumentViewerDialog'
import FileUploadButton from '@/components/documents/FileUploadButton'
import AnalysisResultDialog from '@/components/documents/AnalysisResultDialog'

interface RFIResponseItem {
  id: string
  rfi_id: string
  response_text: string
  from_email: string
  from_name?: string
  is_internal: boolean
  source: string
  created_at: string
  responder?: { id: string; email: string; full_name?: string }
}

interface RFIEmailLogItem {
  id: string
  event_type: string
  from_email?: string
  to_email?: string
  subject?: string
  created_at: string
}

interface RFIDetail {
  id: string
  project_id: string
  rfi_number: string
  subject: string
  question: string
  category: string
  priority: string
  status: string
  to_email: string
  to_name?: string
  cc_emails?: string[]
  due_date?: string
  created_at: string
  updated_at: string
  sent_at?: string
  responded_at?: string
  closed_at?: string
  location?: string
  drawing_reference?: string
  specification_reference?: string
  created_by?: { id: string; email: string; full_name?: string }
  assigned_to?: { id: string; email: string; full_name?: string }
  responses: RFIResponseItem[]
}

type TimelineEntry = { type: 'response'; data: RFIResponseItem; timestamp: string }
  | { type: 'email'; data: RFIEmailLogItem; timestamp: string }

const PRIORITY_CHIP: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default', medium: 'info', high: 'warning', urgent: 'error',
}
const STATUS_CHIP: Record<string, 'warning' | 'success' | 'default' | 'info'> = {
  draft: 'default', open: 'warning', waiting_response: 'info', answered: 'success', closed: 'default',
}
const STATUSES = ['draft', 'open', 'waiting_response', 'answered', 'closed', 'cancelled']

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RFIDetailPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()!
  const projectId = params.projectId as string
  const rfiId = params.rfiId as string

  const [rfi, setRfi] = useState<RFIDetail | null>(null)
  const [emailLogs, setEmailLogs] = useState<RFIEmailLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [replyText, setReplyText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [files, setFiles] = useState<FileRecord[]>([])
  const [viewerFile, setViewerFile] = useState<FileRecord | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [analysisFile, setAnalysisFile] = useState<FileRecord | null>(null)
  const [analysisOpen, setAnalysisOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [rfiRes, emailRes, filesRes] = await Promise.allSettled([
        apiClient.get(`/rfis/${rfiId}`),
        apiClient.get(`/rfis/${rfiId}/email-log`),
        filesApi.list(projectId, 'rfi', rfiId),
      ])
      if (rfiRes.status === 'fulfilled') setRfi(rfiRes.value.data)
      else setError('Failed to load RFI')
      if (emailRes.status === 'fulfilled') setEmailLogs(emailRes.value.data || [])
      if (filesRes.status === 'fulfilled') setFiles(filesRes.value)
    } catch {
      setError('Failed to load RFI')
    } finally {
      setLoading(false)
    }
  }, [rfiId, projectId])

  useEffect(() => { loadData() }, [loadData])

  const handleSubmitResponse = async () => {
    if (!replyText.trim()) return
    try {
      setSubmitting(true)
      setSubmitError('')
      await apiClient.post(`/rfis/${rfiId}/responses?send_email=${!isInternal}`, {
        response_text: replyText,
      })
      setReplyText('')
      setIsInternal(false)
      await loadData()
    } catch {
      setSubmitError(t('rfis.failedToAddResponse'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiClient.patch(`/rfis/${rfiId}/status`, { status: newStatus })
      await loadData()
    } catch { /* noop */ }
  }

  const timeline: TimelineEntry[] = [
    ...(rfi?.responses || []).map((r) => ({ type: 'response' as const, data: r, timestamp: r.created_at })),
    ...emailLogs.map((e) => ({ type: 'email' as const, data: e, timestamp: e.created_at })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={400} height={48} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (error || !rfi) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/projects/${projectId}/rfis`)} sx={{ mb: 2 }}>
          {t('rfis.title')}
        </Button>
        <Alert severity="error">{error || 'RFI not found'}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(`/projects/${projectId}/rfis`)}
        sx={{ mb: 2, textTransform: 'none' }}
      >
        {t('rfis.backToList')}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QuestionAnswerIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700}>RFI #{rfi.rfi_number}</Typography>
            <Typography variant="body1" color="text.secondary">{rfi.subject}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={rfi.category} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
          <Chip label={rfi.priority} size="small" color={PRIORITY_CHIP[rfi.priority] || 'default'} sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
          <Chip label={rfi.status.replace('_', ' ')} size="small" color={STATUS_CHIP[rfi.status] || 'default'} sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Question</Typography>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{rfi.question}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <InfoField label="To" value={rfi.to_name ? `${rfi.to_name} (${rfi.to_email})` : rfi.to_email} />
                <InfoField label="Created By" value={rfi.created_by?.full_name || rfi.created_by?.email || '-'} />
                <InfoField label="Due Date" value={formatDate(rfi.due_date)} />
                <InfoField label="Created" value={formatDate(rfi.created_at)} />
                {rfi.assigned_to && <InfoField label="Assigned To" value={rfi.assigned_to.full_name || rfi.assigned_to.email} />}
                {rfi.location && <InfoField label="Location" value={rfi.location} />}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CommentIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                <Typography variant="subtitle1" fontWeight={700}>{t('rfis.communication')}</Typography>
                <Chip label={timeline.length} size="small" sx={{ height: 22, bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }} />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {timeline.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">{t('rfis.noResponses')}</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {timeline.map((entry) => {
                    if (entry.type === 'response') {
                      const r = entry.data as RFIResponseItem
                      return (
                        <Box
                          key={r.id}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: r.is_internal ? 'warning.light' : 'divider',
                            bgcolor: r.is_internal ? 'rgba(255,152,0,0.04)' : 'transparent',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {r.from_name || r.responder?.full_name || r.from_email}
                              </Typography>
                              <Chip
                                label={r.is_internal ? t('rfis.internalNote') : r.source === 'email' ? 'Email' : 'CRM'}
                                size="small"
                                color={r.is_internal ? 'warning' : 'default'}
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">{formatDate(r.created_at)}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{r.response_text}</Typography>
                        </Box>
                      )
                    }

                    const e = entry.data as RFIEmailLogItem
                    return (
                      <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                        <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                          {e.event_type === 'sent' ? t('rfis.emailSent') : t('rfis.emailReceived')}
                          {e.to_email && ` — ${e.to_email}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{formatDate(e.created_at)}</Typography>
                      </Box>
                    )
                  })}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>{t('rfis.addResponse')}</Typography>
                {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
                <TextField
                  multiline
                  rows={3}
                  placeholder={t('rfis.replyPlaceholder')}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  fullWidth
                  size="small"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />}
                    label={<Typography variant="body2">{t('rfis.internalNote')}</Typography>}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    endIcon={<SendIcon />}
                    onClick={handleSubmitResponse}
                    disabled={submitting || !replyText.trim()}
                  >
                    {submitting ? t('common.loading') : t('rfis.addResponse')}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>{t('rfis.changeStatus')}</Typography>
              <TextField
                select
                value={rfi.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                fullWidth
                size="small"
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</MenuItem>
                ))}
              </TextField>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FolderIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                  <Typography variant="subtitle1" fontWeight={700}>{t('equipment.documents')}</Typography>
                  <Chip label={files.length} size="small" sx={{ height: 22, bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }} />
                </Box>
                <FileUploadButton
                  projectId={projectId}
                  entityType="rfi"
                  entityId={rfiId}
                  onUploadComplete={(f) => setFiles((prev) => [f, ...prev])}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <DocumentList
                files={files}
                onView={(f) => { setViewerFile(f); setViewerOpen(true) }}
                onDownload={async (f) => { try { const url = await filesApi.getDownloadUrl(projectId, f.id); window.open(url, '_blank') } catch { /* noop */ } }}
                onDelete={async (f) => { try { await filesApi.delete(projectId, f.id); setFiles((prev) => prev.filter((x) => x.id !== f.id)) } catch { /* noop */ } }}
                onAnalyze={(f) => { setAnalysisFile(f); setAnalysisOpen(true) }}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      <DocumentViewerDialog
        open={viewerOpen}
        file={viewerFile}
        projectId={projectId}
        onClose={() => { setViewerOpen(false); setViewerFile(null) }}
      />

      <AnalysisResultDialog
        open={analysisOpen}
        file={analysisFile}
        projectId={projectId}
        onClose={() => { setAnalysisOpen(false); setAnalysisFile(null) }}
      />
    </Box>
  )
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      <Typography variant="body2" sx={{ mt: 0.3 }}>{value || '-'}</Typography>
    </Box>
  )
}
