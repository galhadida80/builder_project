import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Button } from '../components/ui/Button'
import { StatusBadge, SeverityBadge } from '../components/ui/StatusBadge'
import { ConfirmModal, FormModal } from '../components/ui/Modal'
import { defectsApi } from '../api/defects'
import { filesApi, FileRecord } from '../api/files'
import { contactsApi } from '../api/contacts'
import { auditApi } from '../api'
import type { Defect, Contact, AuditLog } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { PhotoAnnotator } from '../components/annotations/PhotoAnnotator'
import {
  ArrowBackIcon, AddPhotoAlternateIcon, DeleteIcon, ImageIcon, EditIcon, DrawIcon,
  MoreVertIcon, EmailIcon, PersonAddIcon, LocationOnIcon, CalendarTodayIcon, PersonIcon,
} from '@/icons'
import {
  Box, Typography, Divider, Chip, IconButton, Skeleton, Avatar,
  Tooltip, MenuItem, TextField as MuiTextField, Autocomplete, Dialog, alpha,
} from '@/mui'

export default function DefectDetailPage() {
  const { projectId, defectId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()

  const [loading, setLoading] = useState(true)
  const [defect, setDefect] = useState<Defect | null>(null)
  const [photos, setPhotos] = useState<FileRecord[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [history, setHistory] = useState<AuditLog[]>([])
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [annotatingFile, setAnnotatingFile] = useState<FileRecord | null>(null)

  useEffect(() => {
    loadDetail()
  }, [projectId, defectId])

  const loadDetail = async () => {
    if (!projectId || !defectId) return
    setLoading(true)
    try {
      const [defectData, fileList, contactList, auditList] = await Promise.all([
        defectsApi.get(projectId, defectId),
        filesApi.list(projectId, 'defect', defectId).catch(() => []),
        contactsApi.list(projectId).catch(() => []),
        auditApi.listByProject(projectId, { entityType: 'defect', entityId: defectId }).catch(() => []),
      ])
      setDefect(defectData)
      setPhotos(fileList)
      setContacts(contactList)
      setHistory(auditList)
      loadThumbnails(fileList)
    } catch {
      showError(t('defects.failedToLoad'))
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const loadThumbnails = async (files: FileRecord[]) => {
    if (!projectId) return
    const imageFiles = files.filter(f => f.fileType?.startsWith('image/'))
    const urls: Record<string, string> = {}
    await Promise.all(
      imageFiles.map(async (file) => {
        try {
          urls[file.id] = await filesApi.getFileBlob(projectId, file.id)
        } catch { /* skip failed thumbnails */ }
      })
    )
    setThumbnails(prev => ({ ...prev, ...urls }))
  }

  const handleStatusChange = async () => {
    if (!projectId || !defectId || !newStatus || !defect) return
    const previousStatus = defect.status
    setDefect({ ...defect, status: newStatus as Defect['status'] })
    setStatusDialogOpen(false)
    try {
      const updated = await defectsApi.update(projectId, defectId, { status: newStatus })
      setDefect(updated)
      showSuccess(t('defects.statusUpdated'))
    } catch {
      setDefect(prev => prev ? { ...prev, status: previousStatus } : null)
      showError(t('defects.updateFailed'))
    }
  }

  const handleDelete = async () => {
    if (!projectId || !defectId) return
    setDeleting(true)
    try {
      await withMinDuration(defectsApi.delete(projectId, defectId))
      showSuccess(t('defects.deleted'))
      navigate(`/projects/${projectId}/defects`)
    } catch {
      showError(t('defects.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !projectId || !defectId) return
    setUploading(true)
    try {
      for (const file of Array.from(e.target.files)) {
        await filesApi.upload(projectId, 'defect', defectId, file)
      }
      const updated = await filesApi.list(projectId, 'defect', defectId)
      setPhotos(updated)
      loadThumbnails(updated)
      showSuccess(t('defects.photosUploaded'))
    } catch {
      showError(t('defects.photoUploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoDelete = async (fileId: string) => {
    if (!projectId) return
    try {
      await filesApi.delete(projectId, fileId)
      setPhotos(prev => prev.filter(p => p.id !== fileId))
    } catch {
      showError(t('common.deleteFailed'))
    }
  }

  const handleAddAssignee = async (contactId: string) => {
    if (!projectId || !defectId) return
    try {
      const updated = await defectsApi.addAssignee(projectId, defectId, contactId)
      setDefect(updated)
    } catch {
      showError(t('defects.assigneeFailed'))
    }
  }

  const handleRemoveAssignee = async (contactId: string) => {
    if (!projectId || !defectId) return
    try {
      await defectsApi.removeAssignee(projectId, defectId, contactId)
      setDefect(prev => prev ? { ...prev, assignees: prev.assignees.filter(a => a.contactId !== contactId) } : null)
    } catch {
      showError(t('defects.assigneeFailed'))
    }
  }

  const handleViewPhoto = async (file: FileRecord) => {
    if (!projectId) return
    try {
      const url = await filesApi.getFileBlob(projectId, file.id)
      setLightboxUrl(url)
    } catch {
      showError(t('defects.photoLoadFailed'))
    }
  }

  const handleAnnotateSave = async (dataUrl: string) => {
    if (!projectId || !defectId || !annotatingFile) return
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'annotated_' + annotatingFile.filename, { type: 'image/png' })
      await filesApi.upload(projectId, 'defect', defectId, file)
      await filesApi.delete(projectId, annotatingFile.id)
      const updated = await filesApi.list(projectId, 'defect', defectId)
      setPhotos(updated)
      loadThumbnails(updated)
      setAnnotatingFile(null)
      showSuccess(t('annotations.annotate'))
    } catch {
      showError(t('defects.photoUploadFailed'))
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rounded" height={500} sx={{ mt: 2, borderRadius: 3 }} />
      </Box>
    )
  }

  if (!defect) return null

  const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed']
  const assignedIds = new Set(defect.assignees.map(a => a.contactId))
  const availableContacts = contacts.filter(c => !assignedIds.has(c.id))
  const imagePhotos = photos.filter(f => f.fileType?.startsWith('image/'))

  const statusColor = defect.status === 'open' ? 'error' : defect.status === 'in_progress' ? 'warning' : 'success'

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 12 }}>
      {/* Sticky header */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default', px: 2, py: 1.5,
        borderBottom: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton aria-label={t('common.back')} size="small" onClick={() => navigate(`/projects/${projectId}/defects`)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} letterSpacing="-0.02em">
            {t('defects.detailTitle', 'Defect Details')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip size="small" label={`DEF-${defect.defectNumber}`} sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.65rem' }} />
          <IconButton aria-label={t('common.actions')} size="small" onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'text.secondary' }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Status banner */}
      <Box sx={{
        mx: 2, mt: 2, mb: 2,
        bgcolor: (theme) => alpha(theme.palette[statusColor].main, 0.15),
        border: 1,
        borderColor: (theme) => alpha(theme.palette[statusColor].main, 0.3),
        borderRadius: 3, px: 2, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 12, height: 12, borderRadius: '50%',
            bgcolor: `${statusColor}.main`,
            ...(defect.status === 'open' && {
              '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
              animation: 'pulse 2s infinite',
            }),
          }} />
          <StatusBadge status={defect.status} />
        </Box>
        <SeverityBadge severity={defect.severity} />
      </Box>

      {/* Photo carousel */}
      {imagePhotos.length > 0 && (
        <Box sx={{ position: 'relative', mx: 2, mb: 2, borderRadius: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            {imagePhotos.map((file) => (
              <Box
                key={file.id}
                onClick={() => handleViewPhoto(file)}
                sx={{
                  minWidth: '100%', aspectRatio: '16/10', scrollSnapAlign: 'start',
                  bgcolor: 'grey.900', cursor: 'pointer', position: 'relative', flexShrink: 0,
                }}
              >
                {thumbnails[file.id] ? (
                  <Box component="img" src={thumbnails[file.id]} alt={file.filename}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon sx={{ fontSize: 48, color: 'grey.600' }} />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
          <Chip
            label={`${imagePhotos.length}`}
            size="small"
            sx={{
              position: 'absolute', bottom: 12, insetInlineStart: 12,
              bgcolor: 'rgba(0,0,0,0.6)', color: 'white', backdropFilter: 'blur(8px)',
              fontWeight: 700, fontSize: '0.7rem', height: 24,
            }}
          />
        </Box>
      )}

      {/* Title + description */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 1 }}>
          {defect.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={t(`defects.categories.${defect.category}`, { defaultValue: defect.category })} />
          {defect.isRepeated && <Chip size="small" label={t('defects.repeated')} color="warning" />}
        </Box>
      </Box>

      {/* Detail grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, px: 2, mb: 3 }}>
        <DetailCell icon={<LocationOnIcon sx={{ fontSize: 16 }} />} label={t('defects.location')} value={defect.area ? `${defect.area.name}${defect.area.floorNumber != null ? ` - ${t('defects.floor')} ${defect.area.floorNumber}` : ''}` : '-'} />
        <DetailCell icon={<PersonIcon sx={{ fontSize: 16 }} />} label={t('defects.reporter')} value={defect.reporter?.contactName || '-'} />
        <DetailCell icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />} label={t('defects.dueDate')} value={defect.dueDate ? new Date(defect.dueDate).toLocaleDateString(getDateLocale()) : '-'} />
        <DetailCell icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />} label={t('defects.createdAt')} value={new Date(defect.createdAt).toLocaleDateString(getDateLocale())} />
      </Box>

      {/* Assignees */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('defects.assignees')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {defect.assignees.map((a) => (
            <Box key={a.id} sx={{
              bgcolor: 'background.paper', borderRadius: 3, p: 2, border: 1, borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                  {a.contact?.contactName?.charAt(0) || '?'}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{a.contact?.contactName || t('defects.unknownContact')}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.contact?.companyName || ''}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton aria-label={t('defects.emailAssignee')} size="small" sx={{ color: 'text.secondary' }}>
                  <EmailIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton aria-label={t('defects.removeAssignee')} size="small" onClick={() => handleRemoveAssignee(a.contactId)} sx={{ color: 'text.disabled' }}>
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          ))}
          {availableContacts.length > 0 && (
            <Autocomplete
              options={availableContacts}
              getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
              onChange={(_, val) => { if (val) handleAddAssignee(val.id) }}
              value={null}
              renderInput={(params) => (
                <MuiTextField {...params} placeholder={t('defects.addAssignee')} size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, borderStyle: 'dashed' } }} />
              )}
            />
          )}
        </Box>
      </Box>

      {/* Photos grid (non-image files + add button) */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="body1" fontWeight={700}>
            {t('defects.photos')} ({photos.length})
          </Typography>
          <Button variant="secondary" size="small" icon={<AddPhotoAlternateIcon />}
            disabled={uploading}
            onClick={() => document.getElementById('defect-photo-input')?.click()}>
            {uploading ? t('common.uploading') : t('defects.addPhoto')}
          </Button>
          <input id="defect-photo-input" type="file" hidden multiple accept="image/*,application/pdf" onChange={handlePhotoUpload} />
        </Box>
        {photos.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, overflow: 'hidden' }}>
            {photos.map((file) => (
              <Box key={file.id} role="button" tabIndex={0}
                aria-label={`${t('defects.photos')}: ${file.filename}`}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewPhoto(file) } }}
                sx={{
                  position: 'relative', aspectRatio: '1', borderRadius: 2,
                  overflow: 'hidden', bgcolor: 'grey.900', cursor: 'pointer',
                  '&:hover .overlay': { opacity: 1 },
                }}
                onClick={() => handleViewPhoto(file)}>
                {thumbnails[file.id] ? (
                  <Box component="img" src={thumbnails[file.id]} alt={file.filename}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon sx={{ fontSize: 32, color: 'grey.600' }} />
                  </Box>
                )}
                <Box className="overlay" sx={{
                  position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)',
                  opacity: 0, transition: 'opacity 200ms', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 0.5,
                }}>
                  {file.fileType?.startsWith('image/') && (
                    <IconButton aria-label={t('annotations.annotate')} size="small" onClick={(e) => { e.stopPropagation(); setAnnotatingFile(file) }} sx={{ color: 'white' }}>
                      <DrawIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton aria-label={t('common.delete')} size="small" onClick={(e) => { e.stopPropagation(); handlePhotoDelete(file.id) }} sx={{ color: 'white' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">{t('defects.noPhotos')}</Typography>
        )}
      </Box>

      {/* Activity timeline */}
      {history.length > 0 && (
        <Box sx={{ px: 2, mb: 3 }}>
          <Typography variant="body1" fontWeight={700} sx={{ mb: 2 }}>
            {t('defects.activity')}
          </Typography>
          <Box sx={{ position: 'relative', pl: 4 }}>
            <Box sx={{ position: 'absolute', insetInlineStart: 7, top: 8, bottom: 8, width: 2, bgcolor: 'divider' }} />
            {history.map((entry, idx) => (
              <Box key={entry.id} sx={{ position: 'relative', mb: idx < history.length - 1 ? 3 : 0 }}>
                <Box sx={{
                  position: 'absolute', insetInlineStart: -29, top: 4,
                  width: 14, height: 14, borderRadius: '50%',
                  bgcolor: idx === 0 ? 'primary.main' : 'text.disabled',
                  border: '3px solid', borderColor: 'background.default',
                  ...(idx === 0 && {
                    boxShadow: (theme) => `0 0 8px ${alpha(theme.palette.primary.main, 0.5)}`,
                  }),
                }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {t(`auditLog.actions.${entry.action}`, { defaultValue: entry.action })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.createdAt).toLocaleString(getDateLocale())}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {entry.user?.fullName || t('defects.system')}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Bottom action bar */}
      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider',
        p: 2, display: 'flex', gap: 1.5,
        backdropFilter: 'blur(12px)',
      }}>
        <Button
          fullWidth variant="primary"
          icon={<EditIcon />}
          onClick={() => { setNewStatus(defect.status); setStatusDialogOpen(true) }}
          sx={{ py: 1.75, borderRadius: 3, fontWeight: 700 }}
        >
          {t('defects.changeStatus')}
        </Button>
        <Button
          fullWidth variant="secondary"
          icon={<AddPhotoAlternateIcon />}
          onClick={() => document.getElementById('defect-photo-input')?.click()}
          sx={{ py: 1.75, borderRadius: 3, fontWeight: 700 }}
        >
          {t('defects.addPhoto')}
        </Button>
      </Box>

      <FormModal
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        onSubmit={handleStatusChange}
        title={t('defects.changeStatus')}
        submitLabel={t('common.save')}
      >
        <MuiTextField
          select
          fullWidth
          label={t('common.status')}
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          sx={{ mt: 1 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {t(`defects.statuses.${s}`, { defaultValue: s })}
            </MenuItem>
          ))}
        </MuiTextField>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t('defects.confirmDelete')}
        message={t('defects.confirmDeleteMessage')}
        variant="danger"
        loading={deleting}
      />

      <Dialog
        open={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        maxWidth="lg"
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}
      >
        {lightboxUrl && (
          <Box
            component="img"
            src={lightboxUrl}
            alt={t('defects.defectPhoto', 'Defect photo')}
            sx={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 2 }}
            onClick={() => setLightboxUrl(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={!!annotatingFile}
        onClose={() => setAnnotatingFile(null)}
        fullScreen
      >
        {annotatingFile && thumbnails[annotatingFile.id] && (
          <PhotoAnnotator
            imageUrl={thumbnails[annotatingFile.id]}
            onSave={handleAnnotateSave}
            onCancel={() => setAnnotatingFile(null)}
          />
        )}
      </Dialog>
    </Box>
  )
}

function DetailCell({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
        {icon && <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>}
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Box>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  )
}
