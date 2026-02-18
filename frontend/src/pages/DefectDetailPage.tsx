import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge, SeverityBadge } from '../components/ui/StatusBadge'
import { ConfirmModal, FormModal } from '../components/ui/Modal'
import { defectsApi } from '../api/defects'
import { filesApi, FileRecord } from '../api/files'
import { contactsApi } from '../api/contacts'
import { auditApi } from '../api'
import type { Defect, Contact, AuditLog } from '../types'
import { useToast } from '../components/common/ToastProvider'
import {
  ArrowBackIcon, PersonIcon, ScheduleIcon, LocationOnIcon,
  AddPhotoAlternateIcon, DeleteIcon, ImageIcon, EditIcon,
} from '@/icons'
import {
  Box, Typography, Divider, Chip, IconButton, Skeleton, Avatar,
  Tooltip, MenuItem, TextField as MuiTextField, Autocomplete, Dialog,
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
  const [newStatus, setNewStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  useEffect(() => {
    loadDetail()
  }, [defectId])

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
    if (!projectId || !defectId || !newStatus) return
    try {
      const updated = await defectsApi.update(projectId, defectId, { status: newStatus })
      setDefect(updated)
      setStatusDialogOpen(false)
      showSuccess(t('defects.statusUpdated'))
      loadDetail()
    } catch {
      showError(t('defects.updateFailed'))
    }
  }

  const handleDelete = async () => {
    if (!projectId || !defectId) return
    try {
      await defectsApi.delete(projectId, defectId)
      showSuccess(t('defects.deleted'))
      navigate(`/projects/${projectId}/defects`)
    } catch {
      showError(t('defects.deleteFailed'))
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

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <Button
        variant="tertiary"
        icon={<ArrowBackIcon />}
        onClick={() => navigate(`/projects/${projectId}/defects`)}
        sx={{ mb: 2 }}
      >
        {t('defects.backToList')}
      </Button>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {t('defects.defectNumber', { number: defect.defectNumber })}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <StatusBadge status={defect.status} />
                <SeverityBadge severity={defect.severity} />
                <Chip
                  size="small"
                  label={t(`defects.categories.${defect.category}`, { defaultValue: defect.category })}
                />
                {defect.isRepeated && (
                  <Chip size="small" label={t('defects.repeated')} color="warning" />
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="secondary"
                size="small"
                icon={<EditIcon />}
                onClick={() => { setNewStatus(defect.status); setStatusDialogOpen(true) }}
              >
                {t('defects.changeStatus')}
              </Button>
              <Button
                variant="tertiary"
                size="small"
                icon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ color: 'error.main' }}
              >
                {t('common.delete')}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
            {defect.description}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
            <InfoItem icon={<LocationOnIcon />} label={t('defects.location')} value={defect.area ? `${defect.area.name}${defect.area.floorNumber != null ? ` / ${t('defects.floor')} ${defect.area.floorNumber}` : ''}` : '-'} />
            <InfoItem icon={<PersonIcon />} label={t('defects.reporter')} value={defect.reporter?.contactName || '-'} />
            <InfoItem icon={<PersonIcon />} label={t('defects.primaryAssignee')} value={defect.assignedContact?.contactName || '-'} />
            <InfoItem icon={<PersonIcon />} label={t('defects.followupPerson')} value={defect.followupContact?.contactName || '-'} />
            <InfoItem icon={<ScheduleIcon />} label={t('defects.dueDate')} value={defect.dueDate ? new Date(defect.dueDate).toLocaleDateString(getDateLocale()) : '-'} />
            <InfoItem icon={<ScheduleIcon />} label={t('defects.createdAt')} value={new Date(defect.createdAt).toLocaleDateString(getDateLocale())} />
            {defect.resolvedAt && (
              <InfoItem icon={<ScheduleIcon />} label={t('defects.resolvedAt')} value={new Date(defect.resolvedAt).toLocaleDateString(getDateLocale())} />
            )}
          </Box>
        </Box>
      </Card>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('defects.assignees')} ({defect.assignees.length})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {defect.assignees.map((a) => (
              <Chip
                key={a.id}
                avatar={<Avatar>{a.contact?.contactName?.charAt(0) || '?'}</Avatar>}
                label={a.contact?.contactName || t('defects.unknownContact')}
                onDelete={() => handleRemoveAssignee(a.contactId)}
              />
            ))}
            {defect.assignees.length === 0 && (
              <Typography variant="body2" color="text.secondary">{t('defects.noAssignees')}</Typography>
            )}
          </Box>
          {availableContacts.length > 0 && (
            <Autocomplete
              options={availableContacts}
              getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
              onChange={(_, val) => { if (val) handleAddAssignee(val.id) }}
              value={null}
              renderInput={(params) => <MuiTextField {...params} label={t('defects.addAssignee')} size="small" />}
              sx={{ maxWidth: 400 }}
            />
          )}
        </Box>
      </Card>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('defects.photos')} ({photos.length})
            </Typography>
            <Button
              variant="secondary"
              size="small"
              icon={<AddPhotoAlternateIcon />}
              disabled={uploading}
              onClick={() => document.getElementById('defect-photo-input')?.click()}
            >
              {uploading ? t('common.uploading') : t('defects.addPhoto')}
            </Button>
            <input id="defect-photo-input" type="file" hidden multiple accept="image/*,application/pdf" onChange={handlePhotoUpload} />
          </Box>
          {photos.length > 0 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(140px, 1fr))' }, gap: 1.5, overflow: 'hidden' }}>
              {photos.map((file) => (
                <Box
                  key={file.id}
                  sx={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                    cursor: 'pointer',
                    '&:hover .overlay': { opacity: 1 },
                  }}
                  onClick={() => handleViewPhoto(file)}
                >
                  {thumbnails[file.id] ? (
                    <Box
                      component="img"
                      src={thumbnails[file.id]}
                      alt={file.filename}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                    </Box>
                  )}
                  <Box
                    className="overlay"
                    sx={{
                      position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)',
                      opacity: 0, transition: 'opacity 200ms', display: 'flex',
                      alignItems: 'flex-end', justifyContent: 'space-between', p: 1,
                    }}
                  >
                    <Typography variant="caption" color="white" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {file.filename}
                    </Typography>
                    <Tooltip title={t('common.delete')}>
                      <IconButton
                        aria-label={t('common.delete')}
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handlePhotoDelete(file.id) }}
                        sx={{ color: 'white' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">{t('defects.noPhotos')}</Typography>
          )}
        </Box>
      </Card>

      {history.length > 0 && (
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t('defects.activity')}
            </Typography>
            {history.map((entry) => (
              <Box key={entry.id} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: 'primary.light' }}>
                  {entry.user?.fullName?.charAt(0) || '?'}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {entry.user?.fullName || t('defects.system')} - {entry.action}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.createdAt).toLocaleString(getDateLocale())}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      )}

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
            alt="Defect photo"
            sx={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 2 }}
            onClick={() => setLightboxUrl(null)}
          />
        )}
      </Dialog>
    </Box>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={500}>{value}</Typography>
      </Box>
    </Box>
  )
}
