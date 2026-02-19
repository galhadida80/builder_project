import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { useDropzone } from 'react-dropzone'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge, SeverityBadge } from '../components/ui/StatusBadge'
import { Tabs } from '../components/ui/Tabs'
import { FormModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField, SearchField } from '../components/ui/TextField'
import { defectsApi, DefectCreateData } from '../api/defects'
import { filesApi } from '../api/files'
import { contactsApi } from '../api/contacts'
import { areasApi } from '../api/areas'
import type { Defect, DefectSummary, Contact, ConstructionArea } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { validateRequired, validateMinLength, type ValidationError, hasErrors } from '../utils/validation'
import {
  AddIcon, ReportProblemIcon, CheckCircleIcon, WarningIcon, ErrorIcon,
  HourglassEmptyIcon, VisibilityIcon, PictureAsPdfIcon, CameraAltIcon,
  CloseIcon, AutoAwesomeIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Chip, MenuItem, IconButton, LinearProgress,
  TextField as MuiTextField, Autocomplete, TablePagination, CircularProgress,
} from '@/mui'

function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width <= maxWidth && file.size <= 1024 * 1024) {
        resolve(file)
        return
      }
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

const MAX_PHOTOS = 5

const CATEGORY_OPTIONS = [
  'concrete_structure', 'wet_room_waterproofing', 'plaster', 'roof',
  'painting', 'plumbing', 'flooring', 'fire_passage_sealing',
  'roof_waterproofing', 'building_general', 'moisture', 'waterproofing',
  'hvac', 'lighting', 'solar_system', 'other',
]

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical']

export default function DefectsPage() {
  const { t, i18n } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { showError, showSuccess, showWarning } = useToast()

  const [defects, setDefects] = useState<Defect[]>([])
  const [totalDefects, setTotalDefects] = useState(0)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [summary, setSummary] = useState<DefectSummary | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [areas, setAreas] = useState<ConstructionArea[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [exporting, setExporting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [analyzing, setAnalyzing] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const [formErrors, setFormErrors] = useState<ValidationError>({})
  const [form, setForm] = useState<DefectCreateData>({
    description: '',
    category: 'other',
    severity: 'medium',
    assignee_ids: [],
  })

  const validateDefectForm = (data: DefectCreateData): ValidationError => {
    const errors: ValidationError = {}
    errors.description = validateRequired(data.description, t('defects.description'))
      || validateMinLength(data.description, 2, t('defects.description'))
    errors.category = validateRequired(data.category, t('defects.category'))
    errors.severity = validateRequired(data.severity, t('defects.severity'))
    return errors
  }

  const validateDefectField = (field: string) => {
    const allErrors = validateDefectForm(form)
    setFormErrors(prev => ({ ...prev, [field]: allErrors[field] || null }))
  }

  const addPhotos = useCallback(async (files: File[]) => {
    const remaining = MAX_PHOTOS - pendingPhotos.length
    if (remaining <= 0) return
    const toAdd = files.slice(0, remaining)
    const compressed = await Promise.all(toAdd.map(f => compressImage(f)))
    const previews = compressed.map(f => URL.createObjectURL(f))
    setPendingPhotos(prev => [...prev, ...compressed])
    setPhotoPreviews(prev => [...prev, ...previews])
  }, [pendingPhotos.length])

  const removePhoto = useCallback((index: number) => {
    setPhotoPreviews(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    setPendingPhotos(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearPhotos = useCallback(() => {
    photoPreviews.forEach(url => URL.revokeObjectURL(url))
    setPendingPhotos([])
    setPhotoPreviews([])
  }, [photoPreviews])

  const handleAnalyze = async () => {
    if (!projectId || pendingPhotos.length === 0) return
    setAnalyzing(true)
    try {
      const lang = (i18n.language || 'en').slice(0, 2)
      const result = await defectsApi.analyzeImage(projectId, pendingPhotos[0], lang)
      setForm(prev => ({
        ...prev,
        category: result.category,
        severity: result.severity,
        description: result.description,
      }))
      showSuccess(t('defects.analyzeSuccess'))
    } catch {
      showError(t('defects.analyzeFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: MAX_PHOTOS,
    maxSize: 5 * 1024 * 1024,
    onDrop: addPhotos,
    noClick: pendingPhotos.length >= MAX_PHOTOS,
    noDrag: pendingPhotos.length >= MAX_PHOTOS,
  })

  useEffect(() => {
    if (projectId) loadReferenceData()
  }, [projectId])

  useEffect(() => {
    if (projectId) loadDefects()
  }, [projectId, page, rowsPerPage, activeTab, categoryFilter, searchQuery])

  const loadReferenceData = async () => {
    if (!projectId) return
    try {
      const [defectSummary, contactList, areaList] = await Promise.all([
        defectsApi.getSummary(projectId),
        contactsApi.list(projectId).catch(() => []),
        areasApi.list(projectId).catch(() => []),
      ])
      setSummary(defectSummary)
      setContacts(contactList)
      setAreas(areaList)
    } catch (error) {
      console.error('Failed to load reference data:', error)
    }
  }

  const loadDefects = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { status?: string; category?: string; search?: string; page: number; pageSize: number } = {
        page,
        pageSize: rowsPerPage,
      }
      if (activeTab !== 'all') params.status = activeTab
      if (categoryFilter) params.category = categoryFilter
      if (searchQuery) params.search = searchQuery
      const result = await defectsApi.list(projectId, params)
      setDefects(result.items)
      setTotalDefects(result.total)
    } catch (error) {
      console.error('Failed to load defects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!projectId) return
    const errors = validateDefectForm(form)
    setFormErrors(errors)
    if (hasErrors(errors)) return
    setSubmitting(true)
    setUploadProgress(0)
    try {
      const created = await defectsApi.create(projectId, form)

      if (pendingPhotos.length > 0) {
        let uploaded = 0
        let failed = 0
        for (const file of pendingPhotos) {
          try {
            await filesApi.upload(projectId, 'defect', created.id, file)
            uploaded++
          } catch {
            failed++
          }
          setUploadProgress(Math.round(((uploaded + failed) / pendingPhotos.length) * 100))
        }
        if (failed > 0 && uploaded > 0) {
          showWarning(t('defects.photoUploadPartialFail', { count: failed }))
        } else if (failed > 0) {
          showWarning(t('defects.photoUploadFailed'))
        }
      }

      showSuccess(t('defects.createSuccess'))
      setDialogOpen(false)
      setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
      setFormErrors({})
      clearPhotos()
      setPage(1)
      loadDefects()
      loadReferenceData()
    } catch {
      showError(t('defects.createFailed'))
    } finally {
      setSubmitting(false)
      setUploadProgress(0)
    }
  }

  const handleExportPdf = async () => {
    if (!projectId) return
    setExporting(true)
    try {
      const filters: { status?: string; category?: string } = {}
      if (activeTab !== 'all') filters.status = activeTab
      if (categoryFilter) filters.category = categoryFilter
      await defectsApi.exportPdf(projectId, filters)
      showSuccess(t('defects.exportSuccess'))
    } catch {
      showError(t('defects.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  const filteredDefects = searchQuery
    ? defects.filter(d => {
        const q = searchQuery.toLowerCase()
        return (
          d.description.toLowerCase().includes(q) ||
          String(d.defectNumber).includes(q) ||
          d.area?.name?.toLowerCase().includes(q) ||
          d.assignedContact?.contactName?.toLowerCase().includes(q)
        )
      })
    : defects

  const columns: Column<Defect>[] = [
    {
      id: 'defectNumber',
      label: '#',
      minWidth: 70,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" fontWeight={600}>#{row.defectNumber}</Typography>
      ),
    },
    {
      id: 'category',
      label: t('defects.category'),
      minWidth: 150,
      render: (row) => (
        <Chip
          size="small"
          label={t(`defects.categories.${row.category}`, { defaultValue: row.category })}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      id: 'description',
      label: t('defects.description'),
      minWidth: 220,
      render: (row) => (
        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
          {row.description}
        </Typography>
      ),
    },
    {
      id: 'location',
      label: t('defects.location'),
      minWidth: 130,
      hideOnMobile: true,
      render: (row) => (
        <Typography variant="body2" color={row.area ? 'text.primary' : 'text.secondary'}>
          {row.area ? `${row.area.name}${row.area.floorNumber != null ? ` / ${t('defects.floor')} ${row.area.floorNumber}` : ''}` : '-'}
        </Typography>
      ),
    },
    {
      id: 'severity',
      label: t('defects.severity'),
      minWidth: 110,
      hideOnMobile: true,
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: 120,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'assignedContact',
      label: t('defects.assignedTo'),
      minWidth: 140,
      hideOnMobile: true,
      render: (row) => (
        <Typography variant="body2" color={row.assignedContact ? 'text.primary' : 'text.secondary'}>
          {row.assignedContact?.contactName || '-'}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: t('common.date'),
      minWidth: 100,
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <Typography variant="body2">
          {new Date(row.createdAt).toLocaleDateString(getDateLocale())}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 90,
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <Button variant="tertiary" size="small" icon={<VisibilityIcon />} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${projectId}/defects/${row.id}`); }}>
          {t('buttons.view')}
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={250} height={24} sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1.5, mb: 3, overflow: 'hidden' }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" width="100%" height={42} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rounded" width="100%" height={36} sx={{ borderRadius: 2, mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[...Array(6)].map((_, i) => (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '60px 1fr 80px', sm: '60px 1fr 1fr 1fr 100px 100px 100px' }, gap: 2, py: 1.5, px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Skeleton variant="text" width={40} height={20} />
              <Box>
                <Skeleton variant="text" width={100} height={20} />
              </Box>
              <Skeleton variant="text" width={140} height={20} sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Skeleton variant="text" width={90} height={20} sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: 4, display: { xs: 'none', sm: 'block' } }} />
              <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 4 }} />
              <Skeleton variant="text" width={80} height={20} sx={{ display: { xs: 'none', sm: 'block' } }} />
            </Box>
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('defects.title')}
        subtitle={t('defects.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.defects') }]}
        actions={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button variant="secondary" icon={<PictureAsPdfIcon />} onClick={handleExportPdf} loading={exporting}>
              {t('defects.exportPdf')}
            </Button>
            <Button variant="primary" icon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              {t('defects.reportDefect')}
            </Button>
          </Box>
        }
      />

      {summary && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 1.5,
            mb: 3,
            overflow: 'hidden',
          }}
        >
          <KPICard title={t('defects.total')} value={summary.total} icon={<ReportProblemIcon />} color="primary" />
          <KPICard title={t('defects.open')} value={summary.openCount} icon={<ErrorIcon />} color="error" />
          <KPICard title={t('defects.inProgress')} value={summary.inProgressCount} icon={<HourglassEmptyIcon />} color="warning" />
          <KPICard title={t('defects.resolved')} value={summary.resolvedCount} icon={<CheckCircleIcon />} color="success" />
          <KPICard title={t('defects.critical')} value={summary.criticalCount} icon={<WarningIcon />} color="error" />
        </Box>
      )}

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('defects.list')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <MuiTextField
                select
                size="small"
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
                label={t('defects.category')}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                {CATEGORY_OPTIONS.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {t(`defects.categories.${cat}`, { defaultValue: cat })}
                  </MenuItem>
                ))}
              </MuiTextField>
              <SearchField
                placeholder={t('defects.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
          </Box>

          <Tabs
            items={[
              { label: t('common.all'), value: 'all', badge: summary?.total ?? 0 },
              { label: t('defects.open'), value: 'open', badge: summary?.openCount ?? 0 },
              { label: t('defects.inProgress'), value: 'in_progress', badge: summary?.inProgressCount ?? 0 },
              { label: t('defects.resolved'), value: 'resolved', badge: summary?.resolvedCount ?? 0 },
              { label: t('defects.closed'), value: 'closed', badge: summary?.closedCount ?? 0 },
            ]}
            value={activeTab}
            onChange={(val) => { setActiveTab(val); setPage(1) }}
            size="small"
          />

          <Box sx={{ mt: 2 }}>
            {filteredDefects.length === 0 ? (
              <EmptyState
                title={t('defects.noDefects')}
                description={t('defects.noDefectsDescription')}
              />
            ) : (
              <>
                <DataTable
                  columns={columns}
                  rows={filteredDefects}
                  getRowId={(row) => row.id}
                  onRowClick={(row) => navigate(`/projects/${projectId}/defects/${row.id}`)}
                  pagination={false}
                  renderMobileCard={(row) => (
                    <Box
                      onClick={() => navigate(`/projects/${projectId}/defects/${row.id}`)}
                      sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:active': { bgcolor: 'action.pressed' } }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700}>#{row.defectNumber}</Typography>
                          <Chip size="small" label={t(`defects.categories.${row.category}`, { defaultValue: row.category })} sx={{ fontWeight: 500, fontSize: '0.7rem', height: 22 }} />
                        </Box>
                        <StatusBadge status={row.status} />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {row.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <SeverityBadge severity={row.severity} />
                        {row.area && <Chip label={row.area.name} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />}
                        {row.assignedContact && <Chip label={row.assignedContact.contactName} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />}
                      </Box>
                    </Box>
                  )}
                />
                <TablePagination
                  component="div"
                  count={totalDefects}
                  page={page - 1}
                  rowsPerPage={rowsPerPage}
                  onPageChange={(_, newPage) => setPage(newPage + 1)}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(1) }}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  labelRowsPerPage={t('table.rowsPerPage')}
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('table.of')} ${count !== -1 ? count : `>${to}`}`}
                />
              </>
            )}
          </Box>
        </Box>
      </Card>

      <FormModal
        open={dialogOpen}
        onClose={() => {
          if (submitting) return
          setDialogOpen(false)
          setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
          setFormErrors({})
          clearPhotos()
        }}
        onSubmit={handleCreate}
        title={t('defects.reportDefect')}
        submitLabel={t('defects.create')}
        submitDisabled={!form.description || !form.category || !form.severity}
        loading={submitting}
        maxWidth="md"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            fullWidth
            label={t('defects.description')}
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            onBlur={() => validateDefectField('description')}
            error={!!formErrors.description}
            helperText={formErrors.description}
            required
          />

          <MuiTextField
            select
            fullWidth
            label={t('defects.category')}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            error={!!formErrors.category}
            helperText={formErrors.category}
            required
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {t(`defects.categories.${cat}`, { defaultValue: cat })}
              </MenuItem>
            ))}
          </MuiTextField>

          <MuiTextField
            select
            fullWidth
            label={t('defects.severity')}
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
            error={!!formErrors.severity}
            helperText={formErrors.severity}
            required
          >
            {SEVERITY_OPTIONS.map((sev) => (
              <MenuItem key={sev} value={sev}>
                {t(`defects.severities.${sev}`, { defaultValue: sev })}
              </MenuItem>
            ))}
          </MuiTextField>

          {areas.length > 0 && (
            <Autocomplete
              options={areas}
              getOptionLabel={(opt) => `${opt.name}${opt.floorNumber != null ? ` (${t('defects.floor')} ${opt.floorNumber})` : ''}`}
              value={areas.find(a => a.id === form.area_id) || null}
              onChange={(_, val) => setForm({ ...form, area_id: val?.id })}
              renderInput={(params) => <MuiTextField {...params} label={t('defects.location')} />}
            />
          )}

          {contacts.length > 0 && (
            <>
              <Autocomplete
                options={contacts}
                getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
                value={contacts.find(c => c.id === form.assigned_contact_id) || null}
                onChange={(_, val) => setForm({ ...form, assigned_contact_id: val?.id })}
                renderInput={(params) => <MuiTextField {...params} label={t('defects.primaryAssignee')} />}
              />

              <Autocomplete
                multiple
                options={contacts}
                getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
                value={contacts.filter(c => form.assignee_ids?.includes(c.id))}
                onChange={(_, val) => setForm({ ...form, assignee_ids: val.map(v => v.id) })}
                renderInput={(params) => <MuiTextField {...params} label={t('defects.additionalAssignees')} />}
              />

              <Autocomplete
                options={contacts}
                getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
                value={contacts.find(c => c.id === form.reporter_id) || null}
                onChange={(_, val) => setForm({ ...form, reporter_id: val?.id })}
                renderInput={(params) => <MuiTextField {...params} label={t('defects.reporter')} />}
              />

              <Autocomplete
                options={contacts}
                getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
                value={contacts.find(c => c.id === form.followup_contact_id) || null}
                onChange={(_, val) => setForm({ ...form, followup_contact_id: val?.id })}
                renderInput={(params) => <MuiTextField {...params} label={t('defects.followupPerson')} />}
              />
            </>
          )}

          <TextField
            fullWidth
            label={t('defects.dueDate')}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={form.due_date || ''}
            onChange={(e) => setForm({ ...form, due_date: e.target.value || undefined })}
          />

          {/* Photo Upload Section */}
          <Box>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              {t('defects.attachPhotos')} ({pendingPhotos.length}/{MAX_PHOTOS})
            </Typography>

            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                cursor: pendingPhotos.length >= MAX_PHOTOS ? 'default' : 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'transparent',
                transition: 'all 200ms ease',
                '&:hover': pendingPhotos.length < MAX_PHOTOS ? { borderColor: 'primary.light', bgcolor: 'action.hover' } : {},
              }}
            >
              <input {...getInputProps()} capture="environment" />
              <CameraAltIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                {isDragActive ? t('defects.dropHere') : t('defects.dragOrTap')}
              </Typography>
              {pendingPhotos.length >= MAX_PHOTOS && (
                <Typography variant="caption" color="text.disabled">
                  {t('defects.maxPhotos', { max: MAX_PHOTOS })}
                </Typography>
              )}
            </Box>

            {pendingPhotos.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {photoPreviews.map((url, idx) => (
                  <Box key={idx} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box
                      component="img"
                      src={url}
                      alt={pendingPhotos[idx]?.name}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <IconButton
                      size="small"
                      aria-label={t('common.removeItem')}
                      onClick={(e) => { e.stopPropagation(); removePhoto(idx) }}
                      sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', p: 0.3, '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {pendingPhotos.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Button
                  variant="secondary"
                  size="small"
                  icon={analyzing ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? t('defects.analyzing') : t('defects.analyzeImage')}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {t('defects.analyzeHint')}
                </Typography>
              </Box>
            )}

            {submitting && uploadProgress > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('defects.uploadingPhotos')}
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.5, borderRadius: 1 }} />
              </Box>
            )}
          </Box>
        </Box>
      </FormModal>
    </Box>
  )
}
