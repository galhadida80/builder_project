'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import LinearProgress from '@mui/material/LinearProgress'
import AddIcon from '@mui/icons-material/Add'
import InventoryIcon from '@mui/icons-material/Inventory'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import SearchIcon from '@mui/icons-material/Search'
import DescriptionIcon from '@mui/icons-material/Description'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import TuneIcon from '@mui/icons-material/Tune'
import PersonIcon from '@mui/icons-material/Person'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ViewListIcon from '@mui/icons-material/ViewList'
import GridViewIcon from '@mui/icons-material/GridView'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { apiClient } from '@/lib/api/client'
import { filesApi } from '@/lib/api/files'

interface Material {
  id: string
  name: string
  materialType: string
  manufacturer: string
  modelNumber?: string
  quantity: number
  unit: string
  specifications?: Record<string, string | number | boolean | null>
  status: string
  notes?: string
}

interface MaterialTemplate {
  id: string
  name: string
  name_he?: string
  category?: string
  is_active?: boolean
  required_documents?: (string | { name?: string; name_he?: string; source?: string })[]
  required_specifications?: (string | { name?: string; name_he?: string; unit?: string })[]
  submission_checklist?: (string | { name?: string; name_he?: string })[]
  approving_consultants?: { id: string; name: string; name_he?: string; category?: string }[]
}

interface ConsultantAssignment {
  id: string
  consultant_id: string
  consultant_type_id: string | null
  consultant_name: string | null
  consultant_email: string | null
  consultant_type_name: string | null
  consultant_type_name_he: string | null
  status: string
}

interface DocUpload {
  docName: string
  file: File | null
}

interface ApproverSelection {
  consultantTypeId: string
  consultantTypeName: string
  selectedAssignmentId: string
}

const STATUS_CHIP: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'error',
}

const CATEGORY_COLORS: Record<string, string> = {
  concrete: '#64748b',
  masonry: '#a1887f',
  steel: '#3b82f6',
  waterproofing: '#06b6d4',
  insulation: '#f59e0b',
  cladding: '#8b5cf6',
  flooring: '#10b981',
  glass: '#6366f1',
  paint: '#ec4899',
  plumbing: '#14b8a6',
  electrical: '#f97316',
  fire_safety: '#ef4444',
  doors: '#78909c',
  drywall: '#9e9e9e',
  other: '#94a3b8',
}

const UNITS = ['ton', 'cum', 'sqm', 'meter', 'kg', 'unit', 'box', 'pallet', 'roll', 'liter']

const INITIAL_FORM = {
  name: '', material_type: '', manufacturer: '', model_number: '',
  quantity: '', unit: '', notes: '', specifications: [] as { key: string; value: string }[],
}

function getItemName(item: string | { name?: string }): string {
  return typeof item === 'string' ? item : item.name || ''
}

function getItemNameHe(item: string | { name_he?: string }): string | undefined {
  return typeof item === 'string' ? undefined : item.name_he
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MaterialsPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()!
  const projectId = params.projectId as string
  const [items, setItems] = useState<Material[]>([])
  const [templates, setTemplates] = useState<MaterialTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [selectedTemplate, setSelectedTemplate] = useState<MaterialTemplate | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [dialogStep, setDialogStep] = useState<'select' | 'form'>('select')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [docUploads, setDocUploads] = useState<DocUpload[]>([])
  const [approverSelections, setApproverSelections] = useState<ApproverSelection[]>([])
  const [assignments, setAssignments] = useState<ConsultantAssignment[]>([])
  const [uploadProgress, setUploadProgress] = useState(false)
  const [editingItem, setEditingItem] = useState<Material | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [matRes, tplRes, assignRes] = await Promise.allSettled([
        apiClient.get(`/materials?project_id=${projectId}`),
        apiClient.get('/material-templates'),
        apiClient.get(`/projects/${projectId}/consultant-assignments`),
      ])
      if (matRes.status === 'fulfilled') setItems(matRes.value.data || [])
      if (tplRes.status === 'fulfilled') setTemplates(tplRes.value.data || [])
      if (assignRes.status === 'fulfilled') setAssignments(assignRes.value.data || [])
    } catch {
      setError(t('materials.failedToLoadMaterials'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadData() }, [loadData])

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category || 'other'))
    return Array.from(cats).sort()
  }, [templates])

  const itemTypes = useMemo(() => {
    const types = new Set(items.map((i) => i.materialType || 'other'))
    return Array.from(types).sort()
  }, [items])

  const filteredTemplates = useMemo(() => {
    let result = templates
    if (activeCategory) result = result.filter((t) => (t.category || 'other') === activeCategory)
    if (templateSearch) {
      const q = templateSearch.toLowerCase()
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.name_he && t.name_he.toLowerCase().includes(q))
      )
    }
    return result
  }, [templates, activeCategory, templateSearch])

  const handleTemplateSelect = (tpl: MaterialTemplate) => {
    setSelectedTemplate(tpl)
    const prefilledSpecs = (tpl.required_specifications || []).map((spec) => ({
      key: getItemName(spec),
      value: '',
    }))
    setForm({ ...INITIAL_FORM, name: tpl.name, material_type: tpl.category || '', specifications: prefilledSpecs })
    setDialogStep('form')
    const docs = (tpl.required_documents || []).map((d) => ({
      docName: getItemName(d),
      file: null,
    }))
    setDocUploads(docs)
    const approvers = (tpl.approving_consultants || []).map((c) => ({
      consultantTypeId: c.id,
      consultantTypeName: c.name,
      selectedAssignmentId: '',
    }))
    setApproverSelections(approvers)
  }

  const handleOpenDialog = () => {
    setDialogOpen(true)
    setDialogStep(templates.length > 0 ? 'select' : 'form')
    setSelectedTemplate(null)
    setForm(INITIAL_FORM)
    setTemplateSearch('')
    setActiveCategory(null)
    setSubmitError('')
    setDocUploads([])
    setApproverSelections([])
  }

  const handleCreate = async () => {
    if (!form.name || !form.material_type) return
    try {
      setSubmitting(true)
      setSubmitError('')
      const specsObj: Record<string, string> = {}
      for (const row of form.specifications) {
        if (row.key.trim()) specsObj[row.key.trim()] = row.value
      }
      const res = await apiClient.post(`/projects/${projectId}/materials`, {
        name: form.name,
        material_type: form.material_type,
        manufacturer: form.manufacturer || undefined,
        model_number: form.model_number || undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unit: form.unit || undefined,
        notes: form.notes || undefined,
        specifications: Object.keys(specsObj).length > 0 ? specsObj : undefined,
      })
      const createdId = res.data?.id
      if (createdId) {
        const filesToUpload = docUploads.filter((d) => d.file)
        if (filesToUpload.length > 0) {
          setUploadProgress(true)
          await Promise.allSettled(
            filesToUpload.map((d) =>
              filesApi.upload(projectId, 'material', createdId, d.file!)
            )
          )
          setUploadProgress(false)
        }
      }
      setDialogOpen(false)
      setForm(INITIAL_FORM)
      setSelectedTemplate(null)
      setDocUploads([])
      setApproverSelections([])
      await loadData()
    } catch {
      setSubmitError(t('materials.failedToCreateMaterial'))
    } finally {
      setSubmitting(false)
      setUploadProgress(false)
    }
  }

  const handleEdit = (item: Material) => {
    setEditingItem(item)
    const specs = item.specifications
      ? Object.entries(item.specifications).map(([key, value]) => ({ key, value: String(value ?? '') }))
      : []
    setForm({
      name: item.name,
      material_type: item.materialType || '',
      manufacturer: item.manufacturer || '',
      model_number: item.modelNumber || '',
      quantity: item.quantity ? String(item.quantity) : '',
      unit: item.unit || '',
      notes: item.notes || '',
      specifications: specs,
    })
    setSelectedTemplate(null)
    setDialogStep('form')
    setSubmitError('')
    setDocUploads([])
    setApproverSelections([])
    setDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingItem || !form.name) return
    try {
      setSubmitting(true)
      setSubmitError('')
      const specsObj: Record<string, string> = {}
      for (const row of form.specifications) {
        if (row.key.trim()) specsObj[row.key.trim()] = row.value
      }
      await apiClient.put(`/projects/${projectId}/materials/${editingItem.id}`, {
        name: form.name,
        material_type: form.material_type || undefined,
        manufacturer: form.manufacturer || undefined,
        model_number: form.model_number || undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unit: form.unit || undefined,
        notes: form.notes || undefined,
        specifications: Object.keys(specsObj).length > 0 ? specsObj : undefined,
      })
      setDialogOpen(false)
      setEditingItem(null)
      setForm(INITIAL_FORM)
      await loadData()
    } catch {
      setSubmitError(t('materials.failedToUpdateMaterial'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingItem(null)
    setForm(INITIAL_FORM)
    setSelectedTemplate(null)
    setDocUploads([])
    setApproverSelections([])
  }

  const filtered = useMemo(() => {
    let result = items
    if (search) result = result.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    if (filterType) result = result.filter((m) => (m.materialType || 'other') === filterType)
    return result
  }, [items, search, filterType])

  const approved = items.filter((m) => m.status === 'approved').length
  const pending = items.filter((m) => m.status === 'pending_review').length

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 2 }} />
        {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3, mb: 2 }} />)}
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('materials.title')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('materials.subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          {t('materials.addMaterial')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        {[
          { icon: <InventoryIcon color="primary" />, value: items.length, label: 'Total Materials' },
          { icon: <CheckCircleIcon color="success" />, value: approved, label: 'Approved' },
          { icon: <HourglassEmptyIcon color="warning" />, value: pending, label: 'Pending Review' },
        ].map((kpi) => (
          <Card key={kpi.label} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {kpi.icon}
              <Box>
                <Typography variant="h5" fontWeight={700}>{kpi.value}</Typography>
                <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder={t('common.search')}
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
        />
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1 }}>
          <Chip
            label="All"
            size="small"
            onClick={() => setFilterType(null)}
            variant={filterType === null ? 'filled' : 'outlined'}
            color={filterType === null ? 'primary' : 'default'}
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          {itemTypes.map((type) => (
            <Chip
              key={type}
              label={type.replace('_', ' ')}
              size="small"
              onClick={() => setFilterType(filterType === type ? null : type)}
              variant={filterType === type ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                ...(filterType === type && {
                  bgcolor: CATEGORY_COLORS[type] || '#94a3b8',
                  color: '#fff',
                  '&:hover': { bgcolor: CATEGORY_COLORS[type] || '#94a3b8', opacity: 0.9 },
                }),
              }}
            />
          ))}
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="table"><ViewListIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="cards"><GridViewIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === 'table' ? (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No materials found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((mat) => (
                  <TableRow key={mat.id} hover onClick={() => router.push(`/projects/${projectId}/materials/${mat.id}`)} sx={{ cursor: 'pointer' }}>
                    <TableCell><Typography variant="body2" fontWeight={500}>{mat.name}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={(mat.materialType || 'other').replace('_', ' ')}
                        size="small"
                        sx={{
                          textTransform: 'capitalize', fontWeight: 600, fontSize: '0.7rem',
                          bgcolor: `${CATEGORY_COLORS[mat.materialType || 'other'] || '#94a3b8'}18`,
                          color: CATEGORY_COLORS[mat.materialType || 'other'] || '#94a3b8',
                        }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{mat.manufacturer || '-'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{mat.quantity || '-'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{mat.unit || '-'}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={(mat.status || 'draft').replace('_', ' ')}
                        size="small"
                        color={STATUS_CHIP[mat.status] || 'default'}
                        sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {filtered.length === 0 ? (
            <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 8 }}>
              <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No materials found</Typography>
            </Box>
          ) : (
            filtered.map((mat) => (
              <Card key={mat.id} onClick={() => router.push(`/projects/${projectId}/materials/${mat.id}`)} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', cursor: 'pointer', transition: 'all 200ms', '&:hover': { boxShadow: 3, borderColor: 'primary.main' } }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="body1" fontWeight={700} noWrap sx={{ flex: 1, mr: 1 }}>{mat.name}</Typography>
                    <Chip
                      label={(mat.status || 'draft').replace('_', ' ')}
                      size="small"
                      color={STATUS_CHIP[mat.status] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                    />
                  </Box>
                  <Chip
                    label={(mat.materialType || 'other').replace('_', ' ')}
                    size="small"
                    sx={{
                      mb: 1.5, textTransform: 'capitalize', fontWeight: 600, fontSize: '0.65rem',
                      bgcolor: `${CATEGORY_COLORS[mat.materialType || 'other'] || '#94a3b8'}18`,
                      color: CATEGORY_COLORS[mat.materialType || 'other'] || '#94a3b8',
                    }}
                  />
                  {mat.manufacturer && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.3 }}>
                      {mat.manufacturer}{mat.modelNumber ? ` - ${mat.modelNumber}` : ''}
                    </Typography>
                  )}
                  {(mat.quantity || mat.unit) && (
                    <Typography variant="caption" color="text.disabled">
                      {mat.quantity || '-'} {mat.unit || ''}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {dialogStep === 'select' && !editingItem ? (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Typography variant="h6" fontWeight={700}>Select Material Template</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={() => { setSelectedTemplate(null); setDialogStep('form') }}>
                  Skip Template
                </Button>
                <IconButton size="small" onClick={handleCloseDialog}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              <TextField
                placeholder="Search templates..."
                size="small"
                fullWidth
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
                <Chip
                  label="All"
                  size="small"
                  onClick={() => setActiveCategory(null)}
                  variant={activeCategory === null ? 'filled' : 'outlined'}
                  color={activeCategory === null ? 'primary' : 'default'}
                  sx={{ fontWeight: 600, cursor: 'pointer' }}
                />
                {categories.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat.replace('_', ' ')}
                    size="small"
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    variant={activeCategory === cat ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                      ...(activeCategory === cat && {
                        bgcolor: CATEGORY_COLORS[cat] || '#94a3b8',
                        color: '#fff',
                        '&:hover': { bgcolor: CATEGORY_COLORS[cat] || '#94a3b8', opacity: 0.9 },
                      }),
                    }}
                  />
                ))}
              </Box>

              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1.5,
                maxHeight: 400,
                overflowY: 'auto',
                pr: 0.5,
              }}>
                {filteredTemplates.length === 0 ? (
                  <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">No templates match your search</Typography>
                  </Box>
                ) : (
                  filteredTemplates.map((tpl) => {
                    const docCount = tpl.required_documents?.length || 0
                    const specCount = tpl.required_specifications?.length || 0
                    const checkCount = tpl.submission_checklist?.length || 0
                    const consultantCount = tpl.approving_consultants?.length || 0

                    return (
                      <Card
                        key={tpl.id}
                        onClick={() => handleTemplateSelect(tpl)}
                        sx={{
                          borderRadius: 2.5, cursor: 'pointer',
                          border: '1.5px solid', borderColor: 'divider',
                          transition: 'all 200ms ease',
                          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: 2 },
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={700} noWrap>{tpl.name}</Typography>
                              {tpl.name_he && (
                                <Typography variant="caption" color="text.secondary" noWrap display="block">{tpl.name_he}</Typography>
                              )}
                            </Box>
                            <Chip
                              label={tpl.category?.replace('_', ' ')}
                              size="small"
                              sx={{
                                ml: 1, height: 22, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                bgcolor: `${CATEGORY_COLORS[tpl.category || 'other'] || '#94a3b8'}18`,
                                color: CATEGORY_COLORS[tpl.category || 'other'] || '#94a3b8',
                                letterSpacing: '0.5px',
                              }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5, flexWrap: 'wrap' }}>
                            {docCount > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <DescriptionIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                <Typography variant="caption" color="text.secondary">{docCount} docs</Typography>
                              </Box>
                            )}
                            {specCount > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <TuneIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                <Typography variant="caption" color="text.secondary">{specCount} specs</Typography>
                              </Box>
                            )}
                            {checkCount > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <FactCheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                <Typography variant="caption" color="text.secondary">{checkCount} checks</Typography>
                              </Box>
                            )}
                            {consultantCount > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <PersonIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                                <Typography variant="caption" color="text.secondary">{consultantCount} approvers</Typography>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </Box>
            </DialogContent>
          </>
        ) : (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
              {!editingItem && templates.length > 0 && (
                <IconButton size="small" onClick={() => setDialogStep('select')} sx={{ mr: 0.5 }}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  {editingItem ? 'Edit Material' : selectedTemplate ? selectedTemplate.name : t('materials.addMaterial')}
                </Typography>
                {!editingItem && selectedTemplate?.name_he && (
                  <Typography variant="caption" color="text.secondary">{selectedTemplate.name_he}</Typography>
                )}
              </Box>
              <IconButton size="small" onClick={handleCloseDialog}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
              {submitError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{submitError}</Alert>}
              {uploadProgress && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

              {!editingItem && selectedTemplate && (
                <TemplateDetailsPanel
                  template={selectedTemplate}
                  docUploads={docUploads}
                  setDocUploads={setDocUploads}
                  approverSelections={approverSelections}
                  setApproverSelections={setApproverSelections}
                  assignments={assignments}
                />
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Material Details</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth size="small" />
                <TextField
                  label="Material Type"
                  value={form.material_type}
                  onChange={(e) => setForm({ ...form, material_type: e.target.value })}
                  required
                  fullWidth
                  size="small"
                  helperText={!selectedTemplate && !editingItem ? "Enter any custom type" : undefined}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField label="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} fullWidth size="small" />
                  <TextField label="Model Number" value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })} fullWidth size="small" />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} fullWidth size="small" />
                  <FormControl fullWidth size="small">
                    <InputLabel>Unit</InputLabel>
                    <Select value={form.unit} label="Unit" onChange={(e) => setForm({ ...form, unit: e.target.value as string })}>
                      {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
                <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline rows={2} fullWidth size="small" />
              </Box>

              <Box sx={{ mt: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.2, bgcolor: 'rgba(99,102,241,0.08)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TuneIcon sx={{ fontSize: 18, color: '#6366f1' }} />
                    <Typography variant="subtitle2" fontWeight={700}>Custom Specifications</Typography>
                    <Chip label={form.specifications.length} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#6366f1', color: '#fff', fontWeight: 700 }} />
                  </Box>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setForm({ ...form, specifications: [...form.specifications, { key: '', value: '' }] })} sx={{ textTransform: 'none', fontSize: '0.8rem', color: '#6366f1' }}>
                    Add Field
                  </Button>
                </Box>
                <Box sx={{ p: 2 }}>
                  {form.specifications.length === 0 ? (
                    <Box onClick={() => setForm({ ...form, specifications: [...form.specifications, { key: '', value: '' }] })} sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 1.5, p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#6366f1', bgcolor: 'rgba(99,102,241,0.04)' }, transition: 'all 0.2s' }}>
                      <TuneIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Click to add custom specifications</Typography>
                      <Typography variant="caption" color="text.disabled">e.g., Grade = C30, Strength = 30 MPa</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {form.specifications.map((spec, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1, borderRadius: 1, border: '1px solid', borderColor: spec.key && spec.value ? 'success.main' : 'divider', bgcolor: spec.key && spec.value ? 'rgba(16,185,129,0.04)' : 'transparent', transition: 'all 0.2s' }}>
                          <Chip label={i + 1} size="small" sx={{ height: 22, width: 22, fontSize: '0.7rem', bgcolor: '#6366f1', color: '#fff', fontWeight: 700, '& .MuiChip-label': { p: 0 } }} />
                          <TextField placeholder="e.g., Grade, Strength" value={spec.key} onChange={(e) => { const updated = [...form.specifications]; updated[i] = { ...updated[i], key: e.target.value }; setForm({ ...form, specifications: updated }) }} size="small" sx={{ flex: 1 }} />
                          <TextField placeholder="e.g., C30, 30 MPa" value={spec.value} onChange={(e) => { const updated = [...form.specifications]; updated[i] = { ...updated[i], value: e.target.value }; setForm({ ...form, specifications: updated }) }} size="small" sx={{ flex: 1 }} />
                          <IconButton size="small" onClick={() => { const updated = form.specifications.filter((_, idx) => idx !== i); setForm({ ...form, specifications: updated }) }} sx={{ color: 'text.disabled', '&:hover': { color: '#fff', bgcolor: '#ef4444' }, transition: 'all 0.2s' }}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
              {editingItem ? (
                <Button variant="contained" onClick={handleUpdate} disabled={submitting || !form.name}>
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleCreate} disabled={submitting || !form.name || !form.material_type}>
                  {submitting ? (uploadProgress ? 'Uploading...' : t('common.creating')) : t('common.create')}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

function TemplateDetailsPanel({
  template,
  docUploads,
  setDocUploads,
  approverSelections,
  setApproverSelections,
  assignments,
}: {
  template: MaterialTemplate
  docUploads: DocUpload[]
  setDocUploads: (v: DocUpload[]) => void
  approverSelections: ApproverSelection[]
  setApproverSelections: (v: ApproverSelection[]) => void
  assignments: ConsultantAssignment[]
}) {
  const specs = template.required_specifications || []
  const checklist = template.submission_checklist || []
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const hasContent = docUploads.length > 0 || specs.length > 0 || checklist.length > 0 || approverSelections.length > 0
  if (!hasContent) return null

  const handleFileSelect = (index: number, file: File | null) => {
    const updated = [...docUploads]
    updated[index] = { ...updated[index], file }
    setDocUploads(updated)
  }

  const handleApproverChange = (index: number, assignmentId: string) => {
    const updated = [...approverSelections]
    updated[index] = { ...updated[index], selectedAssignmentId: assignmentId }
    setApproverSelections(updated)
  }

  const checkedCount = Object.values(checked).filter(Boolean).length
  const uploadedCount = docUploads.filter((d) => d.file).length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {checklist.length > 0 && (
        <DetailSection
          icon={<FactCheckIcon sx={{ fontSize: 18 }} />}
          title="Submission Checklist"
          color="#10b981"
          badge={`${checkedCount}/${checklist.length}`}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {checklist.map((item, i) => (
              <Box
                key={i}
                onClick={() => setChecked((p) => ({ ...p, [i]: !p[i] }))}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 1.5,
                  borderRadius: 1.5, cursor: 'pointer',
                  bgcolor: checked[i] ? 'success.main' : 'transparent',
                  border: '1px solid',
                  borderColor: checked[i] ? 'success.main' : 'divider',
                  transition: 'all 200ms',
                  '&:hover': { borderColor: checked[i] ? 'success.dark' : 'success.light', bgcolor: checked[i] ? 'success.dark' : 'action.hover' },
                }}
              >
                <Checkbox
                  checked={!!checked[i]}
                  size="small"
                  sx={{
                    p: 0, color: checked[i] ? '#fff' : 'text.disabled',
                    '&.Mui-checked': { color: '#fff' },
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4,
                      color: checked[i] ? '#fff' : 'text.primary',
                      textDecoration: checked[i] ? 'line-through' : 'none',
                    }}
                  >
                    {getItemName(item)}
                  </Typography>
                  {getItemNameHe(item) && (
                    <Typography variant="caption" sx={{
                      fontSize: '0.7rem', color: checked[i] ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                    }}>
                      {getItemNameHe(item)}
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" sx={{
                  fontSize: '0.65rem', fontWeight: 700, color: checked[i] ? 'rgba(255,255,255,0.6)' : 'text.disabled',
                }}>
                  {i + 1}
                </Typography>
              </Box>
            ))}
          </Box>
        </DetailSection>
      )}

      {docUploads.length > 0 && (
        <DetailSection
          icon={<DescriptionIcon sx={{ fontSize: 18 }} />}
          title="Required Documents"
          color="#3b82f6"
          badge={`${uploadedCount}/${docUploads.length}`}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {docUploads.map((doc, i) => (
              <DocumentUploadSlot
                key={i}
                index={i + 1}
                label={doc.docName}
                file={doc.file}
                onFileSelect={(file) => handleFileSelect(i, file)}
                onRemove={() => handleFileSelect(i, null)}
              />
            ))}
          </Box>
        </DetailSection>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {specs.length > 0 && (
          <DetailSection icon={<TuneIcon sx={{ fontSize: 18 }} />} title="Required Specifications" color="#f59e0b">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {specs.map((spec, i) => {
                const name = getItemName(spec)
                const nameHe = getItemNameHe(spec)
                const unit = typeof spec !== 'string' ? spec.unit : undefined
                return (
                  <Box key={i} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, py: 0.8, px: 1.5,
                    borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}>
                    <Box sx={{
                      width: 24, height: 24, borderRadius: 1, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      bgcolor: '#f59e0b18', color: '#f59e0b',
                      fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.3 }}>{name}</Typography>
                      {nameHe && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{nameHe}</Typography>
                      )}
                    </Box>
                    {unit && (
                      <Chip label={unit} size="small" sx={{
                        height: 20, fontSize: '0.6rem', fontWeight: 700,
                        bgcolor: '#f59e0b18', color: '#f59e0b',
                      }} />
                    )}
                  </Box>
                )
              })}
            </Box>
          </DetailSection>
        )}

        {approverSelections.length > 0 && (
          <DetailSection icon={<PersonIcon sx={{ fontSize: 18 }} />} title="Approving Consultants" color="#8b5cf6">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {approverSelections.map((approver, i) => {
                const matchingAssignments = assignments.filter(
                  (a) => a.consultant_type_id === approver.consultantTypeId
                )
                return (
                  <ApproverDropdown
                    key={i}
                    label={approver.consultantTypeName}
                    assignments={matchingAssignments}
                    allAssignments={assignments}
                    selectedId={approver.selectedAssignmentId}
                    onChange={(id) => handleApproverChange(i, id)}
                  />
                )
              })}
            </Box>
          </DetailSection>
        )}
      </Box>
    </Box>
  )
}

function DocumentUploadSlot({
  index,
  label,
  file,
  onFileSelect,
  onRemove,
}: {
  index: number
  label: string
  file: File | null
  onFileSelect: (f: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (inputRef.current) inputRef.current.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFileSelect(f)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
      borderRadius: 2, border: '1px solid',
      borderColor: file ? 'success.main' : 'divider',
      bgcolor: file ? 'success.main' : 'background.paper',
      transition: 'all 200ms',
    }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        bgcolor: file ? 'rgba(255,255,255,0.2)' : '#3b82f618',
        color: file ? '#fff' : '#3b82f6',
        fontSize: '0.65rem', fontWeight: 700,
      }}>
        {file ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : index}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{
          fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.3,
          color: file ? '#fff' : 'text.primary',
        }}>
          {label}
        </Typography>
        {file ? (
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
            {file.name} ({formatFileSize(file.size)})
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            PDF, DOC, or image
          </Typography>
        )}
      </Box>
      {file ? (
        <IconButton size="small" onClick={onRemove} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      ) : (
        <Button
          size="small"
          variant="outlined"
          onClick={handleClick}
          startIcon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
          sx={{
            fontSize: '0.7rem', textTransform: 'none', fontWeight: 600,
            borderColor: '#3b82f640', color: '#3b82f6', minWidth: 'auto',
            py: 0.3, px: 1.5, borderRadius: 1.5,
            '&:hover': { borderColor: '#3b82f6', bgcolor: '#3b82f608' },
          }}
        >
          Upload
        </Button>
      )}
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handleChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" />
    </Box>
  )
}

function ApproverDropdown({
  label,
  assignments,
  allAssignments,
  selectedId,
  onChange,
}: {
  label: string
  assignments: ConsultantAssignment[]
  allAssignments: ConsultantAssignment[]
  selectedId: string
  onChange: (id: string) => void
}) {
  const options = assignments.length > 0 ? assignments : allAssignments

  return (
    <Box sx={{
      p: 1.5, borderRadius: 2, border: '1px solid',
      borderColor: selectedId ? 'success.main' : 'divider',
      bgcolor: selectedId ? 'success.main' : 'background.paper',
      transition: 'all 200ms',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: selectedId ? 'rgba(255,255,255,0.2)' : '#8b5cf618',
        }}>
          <PersonIcon sx={{ fontSize: 16, color: selectedId ? '#fff' : '#8b5cf6' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{
            fontSize: '0.8rem', fontWeight: 600, color: selectedId ? '#fff' : 'text.primary',
          }}>
            {label}
          </Typography>
          <Chip
            label="Required"
            size="small"
            sx={{
              height: 16, fontSize: '0.55rem', fontWeight: 700,
              bgcolor: selectedId ? 'rgba(255,255,255,0.2)' : '#8b5cf618',
              color: selectedId ? '#fff' : '#8b5cf6',
            }}
          />
        </Box>
      </Box>
      <FormControl fullWidth size="small">
        <Select
          value={selectedId}
          onChange={(e) => onChange(e.target.value as string)}
          displayEmpty
          sx={{
            fontSize: '0.8rem', borderRadius: 1.5,
            bgcolor: selectedId ? 'rgba(255,255,255,0.15)' : 'background.paper',
            color: selectedId ? '#fff' : 'text.primary',
            '& .MuiSelect-select': { py: 0.8, px: 1.5 },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: selectedId ? 'rgba(255,255,255,0.3)' : 'divider',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: selectedId ? 'rgba(255,255,255,0.5)' : 'primary.main',
            },
            '& .MuiSvgIcon-root': { color: selectedId ? '#fff' : 'text.secondary' },
          }}
        >
          <MenuItem value="" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            Select approver...
          </MenuItem>
          {options.map((a) => (
            <MenuItem key={a.id} value={a.id} sx={{ fontSize: '0.8rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  bgcolor: '#8b5cf618', color: '#8b5cf6',
                  fontSize: '0.65rem', fontWeight: 700,
                }}>
                  {(a.consultant_name || '?').charAt(0).toUpperCase()}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                    {a.consultant_name || a.consultant_email || 'Unknown'}
                  </Typography>
                  {a.consultant_type_name && assignments.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {a.consultant_type_name}
                    </Typography>
                  )}
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {assignments.length === 0 && options.length > 0 && (
        <Typography variant="caption" sx={{ fontSize: '0.6rem', mt: 0.5, display: 'block', color: selectedId ? 'rgba(255,255,255,0.6)' : 'text.secondary' }}>
          No exact match - showing all consultants
        </Typography>
      )}
      {options.length === 0 && (
        <Typography variant="caption" sx={{ fontSize: '0.6rem', mt: 0.5, display: 'block', color: selectedId ? 'rgba(255,255,255,0.6)' : 'text.secondary' }}>
          No consultants assigned yet
        </Typography>
      )}
    </Box>
  )
}

function DetailSection({ icon, title, color, badge, children }: { icon: React.ReactNode; title: string; color: string; badge?: string; children: React.ReactNode }) {
  return (
    <Box sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 2.5,
      overflow: 'hidden', bgcolor: 'background.paper',
    }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.2,
        bgcolor: `${color}10`, borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ color }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem', flex: 1 }}>{title}</Typography>
        {badge && (
          <Chip label={badge} size="small" sx={{
            height: 22, fontSize: '0.7rem', fontWeight: 700,
            bgcolor: `${color}18`, color,
          }} />
        )}
      </Box>
      <Box sx={{ p: 1.5 }}>
        {children}
      </Box>
    </Box>
  )
}
