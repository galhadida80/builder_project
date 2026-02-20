import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { DataTable, Column } from '../components/ui/DataTable'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchField } from '../components/ui/TextField'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import SubsectionCard from '../components/checklist/SubsectionCard'
import ChecklistFillDrawer from '../components/checklist/ChecklistFillDrawer'
import { AreaPickerAutocomplete } from '../components/areas/AreaPickerAutocomplete'
import { checklistsApi } from '../api/checklists'
import type { ChecklistTemplate, ChecklistSubSection, ChecklistInstance } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { ChecklistIcon, AssignmentIcon, ExpandMoreIcon, ExpandLessIcon, AddIcon, DeleteIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, Collapse, IconButton, Tabs, Tab, LinearProgress, TextField, Autocomplete, useTheme } from '@/mui'

type ActiveTab = 'templates' | 'instances'
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed'

export default function ChecklistsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showSuccess, showError } = useToast()
  const theme = useTheme()

  const [activeTab, setActiveTab] = useState<ActiveTab>('templates')
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [instances, setInstances] = useState<ChecklistInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const skeletonTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [unitIdentifier, setUnitIdentifier] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<ChecklistInstance | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null)

  useEffect(() => {
    if (projectId) loadData()
    return () => { if (skeletonTimer.current) { clearTimeout(skeletonTimer.current); skeletonTimer.current = null } }
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    if (skeletonTimer.current) { clearTimeout(skeletonTimer.current); skeletonTimer.current = null }
    setLoading(true); setShowSkeleton(false)
    skeletonTimer.current = setTimeout(() => setShowSkeleton(true), 300)
    try {
      const [tplData, instData] = await Promise.all([checklistsApi.getTemplates(projectId), checklistsApi.getInstances(projectId)])
      setTemplates(tplData); setInstances(instData)
    } catch { showError(t('checklists.failedToLoad')) } finally {
      if (skeletonTimer.current) { clearTimeout(skeletonTimer.current); skeletonTimer.current = null }
      setShowSkeleton(false); setLoading(false)
    }
  }

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter((tpl) => tpl.name.toLowerCase().includes(q) || tpl.group.toLowerCase().includes(q) || tpl.level.toLowerCase().includes(q))
  }, [templates, searchQuery])

  const totalItems = useMemo(() => templates.reduce((sum, tpl) => sum + tpl.subsections.reduce((s, sub) => s + sub.items.length, 0), 0), [templates])
  const totalSubsections = useMemo(() => templates.reduce((sum, tpl) => sum + tpl.subsections.length, 0), [templates])

  const filteredInstances = useMemo(() => {
    let result = instances
    if (statusFilter !== 'all') result = result.filter((inst) => inst.status === statusFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((inst) => {
        const tpl = templates.find((t) => t.id === inst.template_id)
        return inst.unit_identifier.toLowerCase().includes(q) || (tpl && tpl.name.toLowerCase().includes(q))
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

  const getTemplateName = useCallback((templateId: string) => templates.find((t) => t.id === templateId)?.name ?? '—', [templates])
  const getItemCount = (tpl: ChecklistTemplate) => tpl.subsections.reduce((sum, sub) => sum + sub.items.length, 0)

  const getInstanceProgress = useCallback((instance: ChecklistInstance) => {
    const tpl = templates.find((t) => t.id === instance.template_id)
    if (!tpl) return { completed: 0, total: 0, percent: 0 }
    const total = tpl.subsections.reduce((s, sub) => s + sub.items.length, 0)
    const completed = instance.responses.filter((r) => r.status === 'approved' || r.status === 'not_applicable').length
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }, [templates])

  const handleCreateInstance = async () => {
    if (!projectId || !selectedTemplateId || !unitIdentifier.trim()) return
    setCreateLoading(true)
    try {
      const newInstance = await checklistsApi.createInstance(projectId, { template_id: selectedTemplateId, unit_identifier: unitIdentifier.trim(), area_id: selectedAreaId || undefined })
      setInstances((prev) => [newInstance, ...prev])
      showSuccess(t('checklists.checklistCreated'))
      setCreateModalOpen(false); setSelectedTemplateId(null); setUnitIdentifier(''); setSelectedAreaId(null)
    } catch { showError(t('checklists.failedToCreate')) } finally { setCreateLoading(false) }
  }

  const handleDeleteInstance = async () => {
    if (!projectId || !deleteTargetId) return
    setDeleteLoading(true)
    try {
      await checklistsApi.deleteInstance(projectId, deleteTargetId)
      setInstances((prev) => prev.filter((i) => i.id !== deleteTargetId))
      showSuccess(t('checklists.checklistDeleted'))
      setDeleteModalOpen(false); setDeleteTargetId(null)
    } catch { showError(t('checklists.failedToDelete')) } finally { setDeleteLoading(false) }
  }

  const openDrawer = (instance: ChecklistInstance) => {
    const tpl = templates.find((t) => t.id === instance.template_id)
    setSelectedInstance(instance); setSelectedTemplate(tpl || null); setDrawerOpen(true)
  }

  const templateColumns: Column<ChecklistTemplate>[] = [
    { id: 'expand', label: '', minWidth: 50, render: (row) => (
      <IconButton size="small" aria-label={expandedId === row.id ? t('common.collapse') : t('common.expand')}
        onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === row.id ? null : row.id) }}>
        {expandedId === row.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
    )},
    { id: 'name', label: t('checklists.name'), minWidth: 250, render: (row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChecklistIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={500}>{row.name}</Typography>
          {row.category && <Typography variant="caption" color="text.secondary">{row.category}</Typography>}
        </Box>
      </Box>
    )},
    { id: 'group', label: t('checklists.group'), minWidth: 160, hideOnMobile: true, render: (row) => <Chip size="small" label={row.group} color="default" sx={{ fontWeight: 500 }} /> },
    { id: 'level', label: t('checklists.level'), minWidth: 120, hideOnMobile: true, render: (row) => <Typography variant="body2">{t(`checklists.levels.${row.level}`, { defaultValue: row.level })}</Typography> },
    { id: 'subsections', label: t('checklists.subsections'), minWidth: 120, align: 'center', render: (row) => <Chip size="small" label={row.subsections.length} variant="outlined" color="primary" /> },
    { id: 'items', label: t('checklists.items'), minWidth: 100, align: 'center', render: (row) => <Chip size="small" label={getItemCount(row)} variant="outlined" color="info" /> },
  ]

  const instanceColumns: Column<ChecklistInstance>[] = [
    { id: 'templateName', label: t('checklists.templateName'), minWidth: 200, render: (row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'info.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AssignmentIcon sx={{ fontSize: 18, color: 'info.main' }} />
        </Box>
        <Typography variant="body2" fontWeight={500}>{getTemplateName(row.template_id)}</Typography>
      </Box>
    )},
    { id: 'unit', label: t('checklists.unitIdentifier'), minWidth: 140, render: (row) => <Chip size="small" label={row.unit_identifier} variant="outlined" sx={{ fontWeight: 500 }} /> },
    { id: 'area', label: t('areaChecklists.areaPath'), minWidth: 120, hideOnMobile: true, render: (row) => row.area_id ? <Chip size="small" label={row.area_id.substring(0, 8)} variant="outlined" color="info" sx={{ fontSize: '0.7rem' }} /> : <Typography variant="caption" color="text.disabled">-</Typography> },
    { id: 'status', label: t('common.status'), minWidth: 130, render: (row) => <StatusBadge status={row.status} /> },
    { id: 'progress', label: t('checklists.progress'), minWidth: 180, render: (row) => {
      const { percent, completed, total } = getInstanceProgress(row)
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 140 }}>
          <LinearProgress variant="determinate" value={percent} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: percent === 100 ? 'success.main' : 'primary.main' } }} />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 44, textAlign: 'right' }}>{completed}/{total}</Typography>
        </Box>
      )
    }},
    { id: 'createdAt', label: t('common.date'), minWidth: 110, render: (row) => <Typography variant="body2" color="text.secondary">{new Date(row.created_at).toLocaleDateString(getDateLocale())}</Typography> },
    { id: 'actions', label: '', minWidth: 50, align: 'center', render: (row) => (
      <IconButton size="small" color="error" aria-label={t('checklists.deleteChecklist')}
        onClick={(e) => { e.stopPropagation(); setDeleteTargetId(row.id); setDeleteModalOpen(true) }}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    )},
  ]

  if (showSkeleton) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={250} height={24} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader title={t('checklists.title')} subtitle={t('checklists.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.checklists') }]}
      />

      <Box sx={{ mb: 2 }}>
        {activeTab === 'templates' ? (
          <SummaryBar items={[
            { label: t('checklists.templates'), value: templates.length },
            { label: t('checklists.subsections'), value: totalSubsections },
            { label: t('checklists.items'), value: totalItems },
          ]} />
        ) : (
          <SummaryBar items={[
            { label: t('checklists.totalInstances'), value: instanceCounts.total },
            { label: t('checklists.pendingInstances'), value: instanceCounts.pending, color: theme.palette.warning.main },
            { label: t('checklists.inProgressInstances'), value: instanceCounts.inProgress },
            { label: t('checklists.completedInstances'), value: instanceCounts.completed, color: theme.palette.success.main },
          ]} />
        )}
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setSearchQuery('') }}>
            <Tab label={t('checklists.templates')} value="templates" />
            <Tab label={t('checklists.instances')} value="instances" />
          </Tabs>
        </Box>
        <Box sx={{ p: 2 }}>
          {activeTab === 'templates' && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" fontWeight={600}>{t('checklists.templates')}</Typography>
                <SearchField value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('checklists.searchPlaceholder')} />
              </Box>
              {filteredTemplates.length === 0 ? (
                <EmptyState title={t('checklists.noTemplates')} icon={<ChecklistIcon sx={{ fontSize: 48 }} />} />
              ) : (
                <DataTable<ChecklistTemplate> columns={templateColumns} rows={filteredTemplates} getRowId={(row) => row.id}
                  onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
                  renderExpandedRow={(row) => expandedId === row.id ? (
                    <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                      {row.subsections.slice().sort((a, b) => a.order - b.order).map((sub: ChecklistSubSection) => <SubsectionCard key={sub.id} subsection={sub} />)}
                    </Box>
                  ) : null}
                  renderMobileCard={(row) => (
                    <Box onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ChecklistIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{row.name}</Typography>
                          {row.category && <Typography variant="caption" color="text.secondary" noWrap>{row.category}</Typography>}
                        </Box>
                        <IconButton size="small">{expandedId === row.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={row.group} />
                        <Chip size="small" label={`${row.subsections.length} ${t('checklists.subsections')}`} variant="outlined" color="primary" />
                        <Chip size="small" label={`${getItemCount(row)} ${t('checklists.items')}`} variant="outlined" color="info" />
                      </Box>
                      <Collapse in={expandedId === row.id}>
                        <Box sx={{ mt: 1.5 }}>
                          {row.subsections.slice().sort((a, b) => a.order - b.order).map((sub: ChecklistSubSection) => <SubsectionCard key={sub.id} subsection={sub} />)}
                        </Box>
                      </Collapse>
                    </Box>
                  )}
                />
              )}
            </>
          )}

          {activeTab === 'instances' && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button variant="primary" icon={<AddIcon />} onClick={() => setCreateModalOpen(true)}>{t('checklists.newChecklist')}</Button>
                  <FilterChips
                    items={[
                      { label: t('common.all'), value: 'all' },
                      { label: t('checklists.pendingInstances'), value: 'pending' },
                      { label: t('checklists.inProgressInstances'), value: 'in_progress' },
                      { label: t('checklists.completedInstances'), value: 'completed' },
                    ]}
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val as StatusFilter)}
                  />
                </Box>
                <SearchField value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('checklists.searchPlaceholder')} />
              </Box>

              {filteredInstances.length === 0 ? (
                <EmptyState title={t('checklists.noInstances')} description={t('checklists.noInstancesDescription')} icon={<AssignmentIcon sx={{ fontSize: 48 }} />} />
              ) : (
                <DataTable<ChecklistInstance> columns={instanceColumns} rows={filteredInstances} getRowId={(row) => row.id}
                  onRowClick={(row) => openDrawer(row)}
                  renderMobileCard={(row) => {
                    const { percent, completed, total } = getInstanceProgress(row)
                    return (
                      <Box onClick={() => openDrawer(row)}
                        sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'info.light', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <AssignmentIcon sx={{ fontSize: 18, color: 'info.main' }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{getTemplateName(row.template_id)}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip size="small" label={row.unit_identifier} variant="outlined" sx={{ fontWeight: 500, height: 22 }} />
                              <StatusBadge status={row.status} />
                            </Box>
                          </Box>
                          <IconButton size="small" color="error" aria-label={t('checklists.deleteChecklist')}
                            onClick={(e) => { e.stopPropagation(); setDeleteTargetId(row.id); setDeleteModalOpen(true) }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <LinearProgress variant="determinate" value={percent}
                            sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: percent === 100 ? 'success.main' : 'primary.main' } }} />
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 44, textAlign: 'right' }}>{completed}/{total}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(row.created_at).toLocaleDateString(getDateLocale())}</Typography>
                        </Box>
                      </Box>
                    )
                  }}
                />
              )}
            </>
          )}
        </Box>
      </Card>

      <FormModal open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setSelectedTemplateId(null); setUnitIdentifier(''); setSelectedAreaId(null) }}
        onSubmit={handleCreateInstance} title={t('checklists.newChecklist')} submitLabel={t('buttons.create')}
        loading={createLoading} submitDisabled={!selectedTemplateId || !unitIdentifier.trim()}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Autocomplete options={templates} getOptionLabel={(opt) => opt.name} groupBy={(opt) => opt.group}
            value={templates.find((t) => t.id === selectedTemplateId) || null}
            onChange={(_, val) => setSelectedTemplateId(val?.id || null)}
            renderInput={(params) => <TextField {...params} label={t('checklists.selectTemplate')} required />}
          />
          <AreaPickerAutocomplete value={selectedAreaId}
            onChange={(areaId, area) => { setSelectedAreaId(areaId); if (area && !unitIdentifier) setUnitIdentifier(area.name) }}
            projectId={projectId!}
          />
          <TextField label={t('checklists.unitIdentifier')} value={unitIdentifier}
            onChange={(e) => setUnitIdentifier(e.target.value)} placeholder={t('checklists.unitIdentifierHint')}
            helperText={t('areaChecklists.orEnterCustom')} required fullWidth
          />
        </Box>
      </FormModal>

      <ConfirmModal open={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setDeleteTargetId(null) }}
        onConfirm={handleDeleteInstance} title={t('checklists.deleteConfirmation')}
        message={t('checklists.deleteConfirmationMessage')} loading={deleteLoading}
      />

      <ChecklistFillDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        instance={selectedInstance} template={selectedTemplate} projectId={projectId!}
        onInstanceUpdate={(updated) => {
          setSelectedInstance(updated)
          setInstances((prev) => prev.map((inst) => inst.id === updated.id ? updated : inst))
        }}
      />
    </Box>
  )
}
