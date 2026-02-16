import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { DataTable, Column } from '../components/ui/DataTable'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchField } from '../components/ui/TextField'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { ChecklistSection } from '../components/checklist/ChecklistSection'
import { PhotoCapture } from '../components/checklist/PhotoCapture'
import { SignaturePad } from '../components/checklist/SignaturePad'
import { checklistsApi } from '../api/checklists'
import type {
  ChecklistTemplate,
  ChecklistSubSection,
  ChecklistInstance,
  ChecklistItemTemplate,
  ChecklistItemResponse,
} from '../types'
import { useToast } from '../components/common/ToastProvider'
import {
  ChecklistIcon,
  AssignmentIcon,
  ExpandMoreIcon,
  ExpandLessIcon,
  AddIcon,
  CloseIcon,
  DeleteIcon,
  CheckCircleIcon,
  PendingIcon,
  HourglassEmptyIcon,
} from '@/icons'
import {
  Box,
  Typography,
  Skeleton,
  Chip,
  Collapse,
  IconButton,
  Tabs,
  Tab,
  Drawer,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Autocomplete,
} from '@/mui'

type ActiveTab = 'templates' | 'instances'
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed'

export default function ChecklistsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showSuccess, showError } = useToast()

  const [activeTab, setActiveTab] = useState<ActiveTab>('templates')
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [instances, setInstances] = useState<ChecklistInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [unitIdentifier, setUnitIdentifier] = useState('')

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<ChecklistInstance | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [itemNotes, setItemNotes] = useState('')
  const [itemPhotos, setItemPhotos] = useState<File[]>([])
  const [itemSignature, setItemSignature] = useState<string | null>(null)
  const [savingResponse, setSavingResponse] = useState(false)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [tplData, instData] = await Promise.all([
        checklistsApi.getTemplates(projectId),
        checklistsApi.getInstances(projectId),
      ])
      setTemplates(tplData)
      setInstances(instData)
    } catch {
      showError(t('checklists.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  // Template tab data
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(q) ||
        tpl.group.toLowerCase().includes(q) ||
        tpl.level.toLowerCase().includes(q)
    )
  }, [templates, searchQuery])

  const totalItems = useMemo(
    () => templates.reduce((sum, tpl) => sum + tpl.subsections.reduce((s, sub) => s + sub.items.length, 0), 0),
    [templates]
  )
  const totalSubsections = useMemo(() => templates.reduce((sum, tpl) => sum + tpl.subsections.length, 0), [templates])

  // Instance tab data
  const filteredInstances = useMemo(() => {
    let result = instances
    if (statusFilter !== 'all') {
      result = result.filter((inst) => inst.status === statusFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((inst) => {
        const tpl = templates.find((t) => t.id === inst.template_id)
        return (
          inst.unit_identifier.toLowerCase().includes(q) || (tpl && tpl.name.toLowerCase().includes(q))
        )
      })
    }
    return result
  }, [instances, statusFilter, searchQuery, templates])

  const instanceCounts = useMemo(() => {
    const pending = instances.filter((i) => i.status === 'pending').length
    const inProgress = instances.filter((i) => i.status === 'in_progress').length
    const completed = instances.filter((i) => i.status === 'completed').length
    return { pending, inProgress, completed, total: instances.length }
  }, [instances])

  const getTemplateName = useCallback(
    (templateId: string) => {
      const tpl = templates.find((t) => t.id === templateId)
      return tpl?.name ?? '—'
    },
    [templates]
  )

  const getInstanceProgress = useCallback(
    (instance: ChecklistInstance) => {
      const tpl = templates.find((t) => t.id === instance.template_id)
      if (!tpl) return { completed: 0, total: 0, percent: 0 }
      const total = tpl.subsections.reduce((s, sub) => s + sub.items.length, 0)
      const completed = instance.responses.filter((r) => r.status !== 'pending').length
      return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
    },
    [templates]
  )

  // Create instance
  const handleCreateInstance = async () => {
    if (!projectId || !selectedTemplateId || !unitIdentifier.trim()) return
    setCreateLoading(true)
    try {
      const newInstance = await checklistsApi.createInstance(projectId, {
        template_id: selectedTemplateId,
        unit_identifier: unitIdentifier.trim(),
      })
      setInstances((prev) => [newInstance, ...prev])
      showSuccess(t('checklists.checklistCreated'))
      setCreateModalOpen(false)
      setSelectedTemplateId(null)
      setUnitIdentifier('')
    } catch {
      showError(t('checklists.failedToCreate'))
    } finally {
      setCreateLoading(false)
    }
  }

  // Delete instance
  const handleDeleteInstance = async () => {
    if (!projectId || !deleteTargetId) return
    setDeleteLoading(true)
    try {
      await checklistsApi.deleteInstance(projectId, deleteTargetId)
      setInstances((prev) => prev.filter((i) => i.id !== deleteTargetId))
      showSuccess(t('checklists.checklistDeleted'))
      setDeleteModalOpen(false)
      setDeleteTargetId(null)
    } catch {
      showError(t('checklists.failedToDelete'))
    } finally {
      setDeleteLoading(false)
    }
  }

  // Open drawer for fill-out
  const openDrawer = (instance: ChecklistInstance) => {
    const tpl = templates.find((t) => t.id === instance.template_id)
    setSelectedInstance(instance)
    setSelectedTemplate(tpl || null)
    setActiveItemId(null)
    setDrawerOpen(true)
  }

  // Item response handlers
  const handleItemClick = (item: ChecklistItemTemplate) => {
    if (activeItemId === item.id) {
      setActiveItemId(null)
      return
    }
    setActiveItemId(item.id)
    const existingResponse = selectedInstance?.responses.find((r) => r.item_template_id === item.id)
    setItemNotes(existingResponse?.notes || '')
    setItemPhotos([])
    setItemSignature(existingResponse?.signature_url || null)
  }

  const handleStatusChange = async (item: ChecklistItemTemplate, status: string) => {
    if (!selectedInstance || !projectId || savingResponse) return
    setSavingResponse(true)
    try {
      const existingResponse = selectedInstance.responses.find((r) => r.item_template_id === item.id)
      let updatedResponse: ChecklistItemResponse
      if (existingResponse) {
        updatedResponse = await checklistsApi.updateResponse(selectedInstance.id, existingResponse.id, {
          status,
          notes: itemNotes || undefined,
          signature_url: itemSignature || undefined,
        })
        setSelectedInstance((prev) => {
          if (!prev) return prev
          return { ...prev, responses: prev.responses.map((r) => (r.id === updatedResponse.id ? updatedResponse : r)) }
        })
        setInstances((prev) =>
          prev.map((inst) =>
            inst.id === selectedInstance.id
              ? { ...inst, responses: inst.responses.map((r) => (r.id === updatedResponse.id ? updatedResponse : r)) }
              : inst
          )
        )
      } else {
        updatedResponse = await checklistsApi.createResponse(selectedInstance.id, {
          item_template_id: item.id,
          status,
          notes: itemNotes || undefined,
          signature_url: itemSignature || undefined,
        })
        setSelectedInstance((prev) => {
          if (!prev) return prev
          return { ...prev, responses: [...prev.responses, updatedResponse] }
        })
        setInstances((prev) =>
          prev.map((inst) =>
            inst.id === selectedInstance.id ? { ...inst, responses: [...inst.responses, updatedResponse] } : inst
          )
        )
      }
    } catch {
      showError(t('checklists.failedToSave'))
    } finally {
      setSavingResponse(false)
    }
  }

  const handleCompleteChecklist = async () => {
    if (!selectedInstance || !projectId) return
    try {
      const updated = await checklistsApi.updateInstance(projectId, selectedInstance.id, { status: 'completed' })
      setSelectedInstance(updated)
      setInstances((prev) => prev.map((inst) => (inst.id === updated.id ? updated : inst)))
      showSuccess(t('checklists.checklistCompleted'))
      setDrawerOpen(false)
    } catch {
      showError(t('checklists.failedToUpdate'))
    }
  }

  const getItemCount = (tpl: ChecklistTemplate) => tpl.subsections.reduce((sum, sub) => sum + sub.items.length, 0)

  // Template columns
  const templateColumns: Column<ChecklistTemplate>[] = [
    {
      id: 'expand',
      label: '',
      minWidth: 50,
      render: (row) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            setExpandedId(expandedId === row.id ? null : row.id)
          }}
        >
          {expandedId === row.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      ),
    },
    {
      id: 'name',
      label: t('checklists.name'),
      minWidth: 250,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChecklistIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.name}
            </Typography>
            {row.category && (
              <Typography variant="caption" color="text.secondary">
                {row.category}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      id: 'group',
      label: t('checklists.group'),
      minWidth: 160,
      hideOnMobile: true,
      render: (row) => <Chip size="small" label={row.group} color="default" sx={{ fontWeight: 500 }} />,
    },
    {
      id: 'level',
      label: t('checklists.level'),
      minWidth: 120,
      hideOnMobile: true,
      render: (row) => <Typography variant="body2">{row.level}</Typography>,
    },
    {
      id: 'subsections',
      label: t('checklists.subsections'),
      minWidth: 120,
      align: 'center',
      render: (row) => <Chip size="small" label={row.subsections.length} variant="outlined" color="primary" />,
    },
    {
      id: 'items',
      label: t('checklists.items'),
      minWidth: 100,
      align: 'center',
      render: (row) => <Chip size="small" label={getItemCount(row)} variant="outlined" color="info" />,
    },
  ]

  // Instance columns
  const instanceColumns: Column<ChecklistInstance>[] = [
    {
      id: 'templateName',
      label: t('checklists.templateName'),
      minWidth: 200,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'info.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssignmentIcon sx={{ fontSize: 18, color: 'info.main' }} />
          </Box>
          <Typography variant="body2" fontWeight={500}>
            {getTemplateName(row.template_id)}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'unit',
      label: t('checklists.unitIdentifier'),
      minWidth: 140,
      render: (row) => (
        <Chip size="small" label={row.unit_identifier} variant="outlined" sx={{ fontWeight: 500 }} />
      ),
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: 130,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'progress',
      label: t('checklists.progress'),
      minWidth: 180,
      render: (row) => {
        const { percent, completed, total } = getInstanceProgress(row)
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 140 }}>
            <LinearProgress
              variant="determinate"
              value={percent}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor: percent === 100 ? 'success.main' : 'primary.main',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 44, textAlign: 'right' }}>
              {completed}/{total}
            </Typography>
          </Box>
        )
      },
    },
    {
      id: 'createdAt',
      label: t('common.date'),
      minWidth: 110,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(row.created_at).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 50,
      align: 'center',
      render: (row) => (
        <IconButton
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteTargetId(row.id)
            setDeleteModalOpen(true)
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={250} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4, overflow: 'hidden' }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  // Drawer progress
  const drawerProgress = selectedInstance ? getInstanceProgress(selectedInstance) : { completed: 0, total: 0, percent: 0 }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('checklists.title')}
        subtitle={t('checklists.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.checklists') }]}
      />

      {/* KPI Cards — context-sensitive */}
      {activeTab === 'templates' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3, overflow: 'hidden' }}>
          <KPICard title={t('checklists.templates')} value={templates.length} icon={<ChecklistIcon />} color="primary" />
          <KPICard title={t('checklists.subsections')} value={totalSubsections} icon={<AssignmentIcon />} color="info" />
          <KPICard title={t('checklists.items')} value={totalItems} icon={<AssignmentIcon />} color="success" />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3, overflow: 'hidden' }}>
          <KPICard title={t('checklists.totalInstances')} value={instanceCounts.total} icon={<ChecklistIcon />} color="primary" />
          <KPICard title={t('checklists.pendingInstances')} value={instanceCounts.pending} icon={<PendingIcon />} color="warning" />
          <KPICard title={t('checklists.inProgressInstances')} value={instanceCounts.inProgress} icon={<HourglassEmptyIcon />} color="info" />
          <KPICard title={t('checklists.completedInstances')} value={instanceCounts.completed} icon={<CheckCircleIcon />} color="success" />
        </Box>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setSearchQuery('') }}>
            <Tab label={t('checklists.templates')} value="templates" />
            <Tab label={t('checklists.instances')} value="instances" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  {t('checklists.templates')}
                </Typography>
                <SearchField
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('checklists.searchPlaceholder')}
                />
              </Box>
              {filteredTemplates.length === 0 ? (
                <EmptyState title={t('checklists.noTemplates')} icon={<ChecklistIcon sx={{ fontSize: 48 }} />} />
              ) : (
                <DataTable<ChecklistTemplate>
                  columns={templateColumns}
                  rows={filteredTemplates}
                  getRowId={(row) => row.id}
                  onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
                  renderExpandedRow={(row) =>
                    expandedId === row.id ? (
                      <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                        {row.subsections
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((sub: ChecklistSubSection) => (
                            <SubsectionCard key={sub.id} subsection={sub} />
                          ))}
                      </Box>
                    ) : null
                  }
                />
              )}
            </>
          )}

          {/* Instances Tab */}
          {activeTab === 'instances' && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button variant="primary" icon={<AddIcon />} onClick={() => setCreateModalOpen(true)}>
                    {t('checklists.newChecklist')}
                  </Button>
                  <Chip
                    label={t('common.all')}
                    variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                    color={statusFilter === 'all' ? 'primary' : 'default'}
                    onClick={() => setStatusFilter('all')}
                    size="small"
                  />
                  <Chip
                    label={t('checklists.pendingInstances')}
                    variant={statusFilter === 'pending' ? 'filled' : 'outlined'}
                    color={statusFilter === 'pending' ? 'warning' : 'default'}
                    onClick={() => setStatusFilter('pending')}
                    size="small"
                  />
                  <Chip
                    label={t('checklists.inProgressInstances')}
                    variant={statusFilter === 'in_progress' ? 'filled' : 'outlined'}
                    color={statusFilter === 'in_progress' ? 'info' : 'default'}
                    onClick={() => setStatusFilter('in_progress')}
                    size="small"
                  />
                  <Chip
                    label={t('checklists.completedInstances')}
                    variant={statusFilter === 'completed' ? 'filled' : 'outlined'}
                    color={statusFilter === 'completed' ? 'success' : 'default'}
                    onClick={() => setStatusFilter('completed')}
                    size="small"
                  />
                </Box>
                <SearchField
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('checklists.searchPlaceholder')}
                />
              </Box>

              {filteredInstances.length === 0 ? (
                <EmptyState
                  title={t('checklists.noInstances')}
                  description={t('checklists.noInstancesDescription')}
                  icon={<AssignmentIcon sx={{ fontSize: 48 }} />}
                />
              ) : (
                <DataTable<ChecklistInstance>
                  columns={instanceColumns}
                  rows={filteredInstances}
                  getRowId={(row) => row.id}
                  onRowClick={(row) => openDrawer(row)}
                />
              )}
            </>
          )}
        </Box>
      </Card>

      {/* Create Instance Modal */}
      <FormModal
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setSelectedTemplateId(null); setUnitIdentifier('') }}
        onSubmit={handleCreateInstance}
        title={t('checklists.newChecklist')}
        submitLabel={t('buttons.create')}
        loading={createLoading}
        submitDisabled={!selectedTemplateId || !unitIdentifier.trim()}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Autocomplete
            options={templates}
            getOptionLabel={(opt) => opt.name}
            groupBy={(opt) => opt.group}
            value={templates.find((t) => t.id === selectedTemplateId) || null}
            onChange={(_, val) => setSelectedTemplateId(val?.id || null)}
            renderInput={(params) => (
              <TextField {...params} label={t('checklists.selectTemplate')} required />
            )}
          />
          <TextField
            label={t('checklists.unitIdentifier')}
            value={unitIdentifier}
            onChange={(e) => setUnitIdentifier(e.target.value)}
            placeholder={t('checklists.unitIdentifierHint')}
            required
            fullWidth
          />
        </Box>
      </FormModal>

      {/* Delete Instance Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteTargetId(null) }}
        onConfirm={handleDeleteInstance}
        title={t('checklists.deleteConfirmation')}
        message={t('checklists.deleteConfirmationMessage')}
        loading={deleteLoading}
      />

      {/* Fill-Out Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 540 }, maxWidth: '100vw' } }}
      >
        {selectedInstance && selectedTemplate && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedTemplate.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip size="small" label={selectedInstance.unit_identifier} variant="outlined" />
                    <StatusBadge status={selectedInstance.status} />
                  </Box>
                </Box>
                <IconButton
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Progress */}
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('checklists.overallProgress')}
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {t('checklists.itemsCompleted', { completed: drawerProgress.completed, total: drawerProgress.total })}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={drawerProgress.percent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor: drawerProgress.percent === 100 ? 'success.main' : 'primary.main',
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Body — Sections */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {selectedTemplate.subsections
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <Box key={section.id}>
                    <ChecklistSection
                      section={section}
                      responses={selectedInstance.responses}
                      defaultExpanded
                      onItemClick={handleItemClick}
                    />
                    {/* Inline item response form */}
                    {section.items.map((item) =>
                      activeItemId === item.id ? (
                        <Box
                          key={`form-${item.id}`}
                          sx={{
                            mx: 2,
                            mb: 2,
                            mt: -1,
                            p: 2,
                            borderRadius: 2,
                            border: 1,
                            borderColor: 'primary.light',
                            bgcolor: 'background.paper',
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                            {item.name}
                          </Typography>

                          {/* Status selector */}
                          <ToggleButtonGroup
                            value={
                              selectedInstance.responses.find((r) => r.item_template_id === item.id)?.status || 'pending'
                            }
                            exclusive
                            onChange={(_, val) => {
                              if (val) handleStatusChange(item, val)
                            }}
                            size="small"
                            sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButton-root': { borderRadius: '8px !important', border: '1px solid', borderColor: 'divider' } }}
                          >
                            <ToggleButton value="pending" sx={{ textTransform: 'none', fontSize: '0.75rem', px: { xs: 1, sm: 1.5 } }}>
                              {t('checklists.statusPending')}
                            </ToggleButton>
                            <ToggleButton value="approved" color="success" sx={{ textTransform: 'none', fontSize: '0.75rem', px: { xs: 1, sm: 1.5 } }}>
                              {t('checklists.statusApproved')}
                            </ToggleButton>
                            <ToggleButton value="rejected" color="error" sx={{ textTransform: 'none', fontSize: '0.75rem', px: { xs: 1, sm: 1.5 } }}>
                              {t('checklists.statusRejected')}
                            </ToggleButton>
                            <ToggleButton value="not_applicable" sx={{ textTransform: 'none', fontSize: '0.75rem', px: { xs: 1, sm: 1.5 } }}>
                              {t('checklists.statusNotApplicable')}
                            </ToggleButton>
                          </ToggleButtonGroup>

                          {/* Notes */}
                          {(item.must_note || itemNotes) && (
                            <TextField
                              fullWidth
                              multiline
                              rows={2}
                              size="small"
                              label={t('common.notes')}
                              placeholder={t('checklists.addNotes')}
                              value={itemNotes}
                              onChange={(e) => setItemNotes(e.target.value)}
                              sx={{ mb: 2 }}
                            />
                          )}

                          {/* Photo */}
                          {item.must_image && (
                            <Box sx={{ mb: 2 }}>
                              <PhotoCapture
                                maxPhotos={5}
                                onPhotosChange={(files) => setItemPhotos(files)}
                                disabled={savingResponse}
                              />
                            </Box>
                          )}

                          {/* Signature */}
                          {item.must_signature && (
                            <Box sx={{ mb: 2 }}>
                              <SignaturePad
                                onSignatureChange={(sig) => setItemSignature(sig)}
                                required
                                disabled={savingResponse}
                              />
                            </Box>
                          )}
                        </Box>
                      ) : null
                    )}
                  </Box>
                ))}
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                variant="primary"
                fullWidth
                icon={<CheckCircleIcon />}
                onClick={handleCompleteChecklist}
                disabled={
                  selectedInstance.status === 'completed' || drawerProgress.completed < drawerProgress.total
                }
              >
                {t('checklists.completeChecklist')}
              </Button>
              {drawerProgress.completed < drawerProgress.total && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                  {t('checklists.allItemsRequired')}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  )
}

function SubsectionCard({ subsection }: { subsection: ChecklistSubSection }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          bgcolor: 'background.paper',
          borderRadius: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'grey.50' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {subsection.order + 1}
          </Box>
          <Typography variant="body2" fontWeight={500}>
            {subsection.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip size="small" label={`${subsection.items.length} ${t('checklists.items')}`} variant="outlined" />
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>
      <Collapse in={open}>
        <Box sx={{ pl: 5, pr: 2, py: 1 }}>
          {subsection.items.map((item, idx) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 0.75,
                borderBottom: idx < subsection.items.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.primary">
                {item.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {item.must_image && (
                  <Chip
                    size="small"
                    label={t('checklists.requiresImage')}
                    color="warning"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                )}
                {item.must_note && (
                  <Chip
                    size="small"
                    label={t('checklists.requiresNote')}
                    color="info"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                )}
                {item.must_signature && (
                  <Chip
                    size="small"
                    label={t('checklists.requiresSignature')}
                    color="secondary"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}
