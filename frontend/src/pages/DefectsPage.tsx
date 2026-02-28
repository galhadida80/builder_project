import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge, SeverityBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import DefectCardList from '../components/defects/DefectCardList'
import DefectFormModal from '../components/defects/DefectFormModal'
import { defectsApi, DefectCreateData, DefectAnalysisItem } from '../api/defects'
import { filesApi } from '../api/files'
import { contactsApi } from '../api/contacts'
import { areasApi } from '../api/areas'
import type { Defect, DefectSummary, DefectSeverity, Contact, ConstructionArea } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { validateRequired, validateMinLength, type ValidationError, hasErrors } from '../utils/validation'
import { AddIcon, VisibilityIcon, PictureAsPdfIcon } from '@/icons'
import { Box, Typography, Chip, MenuItem, Skeleton, TextField as MuiTextField, TablePagination, Tooltip, useMediaQuery, useTheme } from '@/mui'

const SEVERITY_BORDER_COLORS: Record<DefectSeverity, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#22C55E',
}

function formatRelativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return t('defects.justNow')
  if (diffMinutes < 60) return t('defects.minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('defects.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('defects.yesterday')
  if (diffDays < 30) return t('defects.daysAgo', { count: diffDays })
  return date.toLocaleDateString(getDateLocale())
}

function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width <= maxWidth && file.size <= 1024 * 1024) { resolve(file); return }
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

const MAX_PHOTOS = 5

export default function DefectsPage() {
  const { t, i18n } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showError, showSuccess, showWarning } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

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
  const [analysisResults, setAnalysisResults] = useState<DefectAnalysisItem[]>([])
  const [selectedDefects, setSelectedDefects] = useState<boolean[]>([])
  const [formErrors, setFormErrors] = useState<ValidationError>({})
  const [form, setForm] = useState<DefectCreateData>({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })

  const validateDefectForm = (data: DefectCreateData): ValidationError => {
    const errors: ValidationError = {}
    errors.description = validateRequired(data.description, t('defects.description')) || validateMinLength(data.description, 2, t('defects.description'))
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
    setPhotoPreviews(prev => { URL.revokeObjectURL(prev[index]); return prev.filter((_, i) => i !== index) })
    setPendingPhotos(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearPhotos = useCallback(() => {
    photoPreviews.forEach(url => URL.revokeObjectURL(url))
    setPendingPhotos([]); setPhotoPreviews([])
  }, [photoPreviews])

  const handleAnalyze = async () => {
    if (!projectId || pendingPhotos.length === 0) return
    setAnalyzing(true)
    try {
      const lang = (i18n.language || 'en').slice(0, 2)
      const result = await defectsApi.analyzeImage(projectId, pendingPhotos[0], lang)
      const defectsResult = result.defects || []
      if (defectsResult.length <= 1) {
        const single = defectsResult[0] || { category: 'other', severity: 'medium', description: '' }
        setForm(prev => ({ ...prev, category: single.category, severity: single.severity, description: single.description }))
        setAnalysisResults([]); setSelectedDefects([])
        showSuccess(t('defects.analyzeSuccess'))
      } else {
        setAnalysisResults(defectsResult); setSelectedDefects(new Array(defectsResult.length))
        showSuccess(t('defects.multiAnalyzeSuccess', { count: defectsResult.length }))
      }
    } catch { showError(t('defects.analyzeFailed')) } finally { setAnalyzing(false) }
  }

  useEffect(() => { if (projectId) loadReferenceData() }, [projectId])
  useEffect(() => { if (projectId) loadDefects() }, [projectId, page, rowsPerPage, activeTab, categoryFilter, searchQuery])

  useEffect(() => {
    if ((location.state as { openCreate?: boolean })?.openCreate) {
      setDialogOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state])

  const loadReferenceData = async () => {
    if (!projectId) return
    try {
      const [defectSummary, contactList, areaList] = await Promise.all([
        defectsApi.getSummary(projectId),
        contactsApi.list(projectId).catch(() => []),
        areasApi.list(projectId).catch(() => []),
      ])
      setSummary(defectSummary); setContacts(contactList); setAreas(areaList)
    } catch (error) { console.error('Failed to load reference data:', error) }
  }

  const loadDefects = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { status?: string; category?: string; search?: string; page: number; pageSize: number } = { page, pageSize: rowsPerPage }
      if (activeTab !== 'all') params.status = activeTab
      if (categoryFilter) params.category = categoryFilter
      if (searchQuery) params.search = searchQuery
      const result = await defectsApi.list(projectId, params)
      setDefects(result.items); setTotalDefects(result.total)
    } catch (error) { console.error('Failed to load defects:', error) } finally { setLoading(false) }
  }

  const isMultiDefect = analysisResults.length > 1
  const selectedCount = selectedDefects.filter(v => v === true).length

  const handleCreate = async () => {
    if (!projectId) return
    if (isMultiDefect) {
      if (selectedCount === 0) { showError(t('defects.noDefectsSelected')); return }
      setSubmitting(true); setUploadProgress(0)
      try {
        const itemsToCreate = analysisResults.filter((_, i) => selectedDefects[i] === true)
        const totalSteps = itemsToCreate.length + (pendingPhotos.length * itemsToCreate.length)
        let completedSteps = 0
        for (const item of itemsToCreate) {
          const data: DefectCreateData = { description: item.description, category: item.category, severity: item.severity, area_id: form.area_id, assigned_contact_id: form.assigned_contact_id, followup_contact_id: form.followup_contact_id, reporter_id: form.reporter_id, due_date: form.due_date, assignee_ids: form.assignee_ids }
          const created = await defectsApi.create(projectId, data)
          completedSteps++; setUploadProgress(Math.round((completedSteps / totalSteps) * 100))
          for (const file of pendingPhotos) {
            try { await filesApi.upload(projectId, 'defect', created.id, file) } catch { /* continue */ }
            completedSteps++; setUploadProgress(Math.round((completedSteps / totalSteps) * 100))
          }
        }
        showSuccess(t('defects.batchCreateSuccess', { count: itemsToCreate.length }))
        setDialogOpen(false); setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
        setFormErrors({}); setAnalysisResults([]); setSelectedDefects([]); clearPhotos(); setPage(1); loadDefects(); loadReferenceData()
      } catch { showError(t('defects.createFailed')) } finally { setSubmitting(false); setUploadProgress(0) }
      return
    }
    const errors = validateDefectForm(form)
    setFormErrors(errors)
    if (hasErrors(errors)) return
    setSubmitting(true); setUploadProgress(0)
    try {
      const created = await defectsApi.create(projectId, form)
      if (pendingPhotos.length > 0) {
        let uploaded = 0; let failed = 0
        for (const file of pendingPhotos) {
          try { await filesApi.upload(projectId, 'defect', created.id, file); uploaded++ } catch { failed++ }
          setUploadProgress(Math.round(((uploaded + failed) / pendingPhotos.length) * 100))
        }
        if (failed > 0 && uploaded > 0) showWarning(t('defects.photoUploadPartialFail', { count: failed }))
        else if (failed > 0) showWarning(t('defects.photoUploadFailed'))
      }
      showSuccess(t('defects.createSuccess'))
      setDialogOpen(false); setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
      setFormErrors({}); clearPhotos(); setPage(1); loadDefects(); loadReferenceData()
    } catch { showError(t('defects.createFailed')) } finally { setSubmitting(false); setUploadProgress(0) }
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
    } catch { showError(t('defects.exportFailed')) } finally { setExporting(false) }
  }

  const CATEGORY_OPTIONS = [
    'concrete_structure', 'structural', 'wet_room_waterproofing', 'plaster',
    'roof', 'roof_waterproofing', 'painting', 'plumbing', 'flooring',
    'tiling', 'fire_passage_sealing', 'fire_safety', 'building_general',
    'moisture', 'waterproofing', 'insulation', 'hvac', 'electrical',
    'lighting', 'solar_system', 'windows_doors', 'drainage', 'elevator',
    'gas', 'accessibility', 'exterior_cladding', 'landscaping', 'other',
  ]

  const columns: Column<Defect>[] = [
    { id: 'defectNumber', label: '#', minWidth: 70, sortable: true, render: (row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 4, height: 28, borderRadius: 1, bgcolor: SEVERITY_BORDER_COLORS[row.severity] || SEVERITY_BORDER_COLORS.low, flexShrink: 0 }} />
        <Typography variant="body2" fontWeight={600}>#{row.defectNumber}</Typography>
      </Box>
    ) },
    { id: 'category', label: t('defects.category'), minWidth: 150, render: (row) => <Chip size="small" label={t(`defects.categories.${row.category}`, { defaultValue: row.category })} sx={{ fontWeight: 500 }} /> },
    { id: 'description', label: t('defects.description'), minWidth: 220, render: (row) => <Typography variant="body2" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{row.description}</Typography> },
    { id: 'location', label: t('defects.location'), minWidth: 130, hideOnMobile: true, render: (row) => <Typography variant="body2" color={row.area ? 'text.primary' : 'text.secondary'}>{row.area ? `${row.area.name}${row.area.floorNumber != null ? ` / ${t('defects.floor')} ${row.area.floorNumber}` : ''}` : '-'}</Typography> },
    { id: 'severity', label: t('defects.severity'), minWidth: 110, hideOnMobile: true, render: (row) => <SeverityBadge severity={row.severity} /> },
    { id: 'status', label: t('common.status'), minWidth: 120, render: (row) => <StatusBadge status={row.status} /> },
    { id: 'assignedContact', label: t('defects.assignedTo'), minWidth: 140, hideOnMobile: true, render: (row) => <Typography variant="body2" color={row.assignedContact ? 'text.primary' : 'text.secondary'}>{row.assignedContact?.contactName || '-'}</Typography> },
    { id: 'createdAt', label: t('common.date'), minWidth: 100, sortable: true, hideOnMobile: true, render: (row) => (
      <Tooltip title={new Date(row.createdAt).toLocaleDateString(getDateLocale())} arrow>
        <Typography variant="body2" color="text.secondary">{formatRelativeTime(row.createdAt, t)}</Typography>
      </Tooltip>
    ) },
    { id: 'actions', label: '', minWidth: 90, align: 'right', hideOnMobile: true, render: (row) => <Button variant="tertiary" size="small" icon={<VisibilityIcon />} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${projectId}/defects/${row.id}`) }}>{t('buttons.view')}</Button> },
  ]

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader title={t('defects.title')} subtitle={t('defects.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.defects') }]}
        actions={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button variant="secondary" icon={<PictureAsPdfIcon />} onClick={handleExportPdf} loading={exporting}>{t('defects.exportPdf')}</Button>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Button variant="primary" icon={<AddIcon />} onClick={() => setDialogOpen(true)}>{t('defects.reportDefect')}</Button>
            </Box>
          </Box>
        }
      />

      {summary && (
        <Box sx={{ mb: 2 }}>
          <SummaryBar items={[
            { label: t('defects.total'), value: summary.total },
            { label: t('defects.open'), value: summary.openCount, color: theme.palette.error.main },
            { label: t('defects.inProgress'), value: summary.inProgressCount, color: theme.palette.warning.main },
            { label: t('defects.resolved'), value: summary.resolvedCount, color: theme.palette.success.main },
          ]} />
        </Box>
      )}

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <MuiTextField select size="small" value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
                label={t('defects.category')} sx={{ minWidth: 160 }}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                {CATEGORY_OPTIONS.map((cat) => <MenuItem key={cat} value={cat}>{t(`defects.categories.${cat}`, { defaultValue: cat })}</MenuItem>)}
              </MuiTextField>
              <SearchField placeholder={t('defects.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <FilterChips
              items={[
                { label: t('common.all'), value: 'all', count: summary?.total ?? 0 },
                { label: t('defects.open'), value: 'open', count: summary?.openCount ?? 0 },
                { label: t('defects.inProgress'), value: 'in_progress', count: summary?.inProgressCount ?? 0 },
                { label: t('defects.resolved'), value: 'resolved', count: summary?.resolvedCount ?? 0 },
                { label: t('defects.closed'), value: 'closed', count: summary?.closedCount ?? 0 },
              ]}
              value={activeTab}
              onChange={(val) => { setActiveTab(val); setPage(1) }}
            />
          </Box>

          {isMobile ? (
            <DefectCardList defects={defects} loading={loading} projectId={projectId!} />
          ) : (
            <DataTable columns={columns} rows={defects} getRowId={(row) => row.id}
              onRowClick={(row) => navigate(`/projects/${projectId}/defects/${row.id}`)}
              pagination={false} emptyVariant="no-results" emptyTitle={t('defects.noDefects')} emptyDescription={t('defects.noDefectsDescription')}
            />
          )}

          {totalDefects > 0 && (
            <TablePagination component="div" count={totalDefects} page={page - 1} rowsPerPage={rowsPerPage}
              onPageChange={(_, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(1) }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage={t('table.rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('table.of')} ${count !== -1 ? count : `>${to}`}`}
              getItemAriaLabel={(type) => type === 'next' ? t('table.goToNextPage') : t('table.goToPreviousPage')}
            />
          )}
        </Box>
      </Card>

      <DefectFormModal
        open={dialogOpen}
        onClose={() => {
          if (submitting) return
          setDialogOpen(false); setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
          setFormErrors({}); setAnalysisResults([]); setSelectedDefects([]); clearPhotos()
        }}
        onSubmit={handleCreate} submitting={submitting} uploadProgress={uploadProgress}
        form={form} setForm={setForm} formErrors={formErrors} validateField={validateDefectField}
        contacts={contacts} areas={areas}
        pendingPhotos={pendingPhotos} photoPreviews={photoPreviews} addPhotos={addPhotos} removePhoto={removePhoto}
        analyzing={analyzing} onAnalyze={handleAnalyze}
        analysisResults={analysisResults} setAnalysisResults={setAnalysisResults}
        selectedDefects={selectedDefects} setSelectedDefects={setSelectedDefects}
        selectedCount={selectedCount} isMultiDefect={isMultiDefect}
      />
    </Box>
  )
}
