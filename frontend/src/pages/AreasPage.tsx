import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { ProgressBar, CircularProgressDisplay } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import { AreaActionMenu } from '../components/areas/AreaActionMenu'
import { AreaDetailDrawer } from '../components/areas/AreaDetailDrawer'
import { areasApi } from '../api/areas'
import { areaStructureApi } from '../api/areaStructure'
import type { ConstructionArea, AreaStatus } from '../types'
import { validateAreaForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'
import { parseValidationErrors } from '../utils/apiErrors'
import { withMinDuration } from '../utils/async'
import { AddIcon, ExpandMoreIcon, ExpandLessIcon, ApartmentIcon, LocalParkingIcon, RoofingIcon, FoundationIcon, EditIcon, DeleteIcon, AccountTreeIcon, ChecklistIcon } from '@/icons'
import { Box, Typography, Chip, Collapse, IconButton, MenuItem, TextField as MuiTextField, Skeleton, useTheme } from '@/mui'

const AREA_TYPE_ICONS: Record<string, React.ReactNode> = {
  apartment: <ApartmentIcon />, parking: <LocalParkingIcon />, roof: <RoofingIcon />,
  basement: <FoundationIcon />, facade: <ApartmentIcon />, common_area: <ApartmentIcon />,
}
const AREA_TYPE_KEYS = ['apartment', 'parking', 'roof', 'basement', 'facade', 'common_area'] as const
const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  completed: 'success', in_progress: 'info', awaiting_approval: 'warning', not_started: 'default',
}
const STATUS_BORDER_COLORS: Record<string, string> = {
  completed: '#4caf50',
  in_progress: '#e07842',
  not_started: '#9e9e9e',
  awaiting_approval: '#ff9800',
}

interface AreaNodeProps {
  area: ConstructionArea; level: number
  onEdit: (a: ConstructionArea) => void; onDelete: (a: ConstructionArea) => void
  onOpenDrawer: (a: ConstructionArea) => void; onAssignChecklist: (a: ConstructionArea) => void
  onCreateInstances: (a: ConstructionArea) => void; onViewChecklists: (a: ConstructionArea) => void
  onBulkCreate: (a: ConstructionArea) => void; t: (key: string, options?: Record<string, unknown>) => string
}

function AreaNode({ area, level, onEdit, onDelete, onOpenDrawer, onAssignChecklist, onCreateInstances, onViewChecklists, onBulkCreate, t }: AreaNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = area.children && area.children.length > 0
  const overallProgress: number = area.currentProgress ?? 0
  const areaTypeIcon = AREA_TYPE_ICONS[area.areaType || ''] || <ApartmentIcon />
  const derivedStatus: AreaStatus = overallProgress === 100 ? 'completed' : overallProgress > 0 ? 'in_progress' : 'not_started'
  const statusColor = STATUS_COLORS[derivedStatus] || 'default'

  return (
    <Box sx={{ marginInlineStart: { xs: level * 1.5, sm: level * 3 } }}>
      <Card hoverable sx={{ mb: 1, borderInlineStart: '4px solid', borderInlineStartColor: STATUS_BORDER_COLORS[derivedStatus] || '#9e9e9e', ...(overallProgress === 100 && { opacity: 0.85 }) }} onClick={() => onOpenDrawer(area)}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: { xs: 1, sm: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
              {hasChildren ? (
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }} sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
                  {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              ) : <Box sx={{ width: 32 }} />}
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>{areaTypeIcon}</Box>
              <Box>
                <Typography variant="body2" fontWeight={600}>{area.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip label={area.areaCode} size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, bgcolor: `${STATUS_BORDER_COLORS[derivedStatus] || '#9e9e9e'}22`, color: STATUS_BORDER_COLORS[derivedStatus] || '#9e9e9e', border: `1px solid ${STATUS_BORDER_COLORS[derivedStatus] || '#9e9e9e'}44` }} />
                  {area.totalUnits && <Typography variant="caption" color="text.secondary">{area.totalUnits} {t('areas.units')}</Typography>}
                  {area.floorNumber !== undefined && <Typography variant="caption" color="text.secondary">{t('areas.floor')} {area.floorNumber}</Typography>}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 3 } }}>
              <Chip icon={<ChecklistIcon sx={{ fontSize: 14 }} />} label={t('areaChecklists.viewChecklists')} size="small" variant="outlined" color="info" onClick={(e) => { e.stopPropagation(); onOpenDrawer(area) }} sx={{ display: { xs: 'none', sm: 'flex' }, height: 24, fontSize: '0.7rem' }} />
              <Box sx={{ width: { xs: 100, sm: 160 } }}>
                <ProgressBar value={overallProgress} showValue size="small" color={overallProgress === 100 ? 'success' : 'primary'} />
              </Box>
              <Chip label={t(`areas.statuses.${derivedStatus}`)} size="small" color={statusColor} sx={{ fontWeight: 500, minWidth: { xs: 'auto', sm: 100 }, display: { xs: 'none', sm: 'flex' } }} />
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <IconButton size="small" onClick={() => onEdit(area)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => onDelete(area)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                <AreaActionMenu area={area} onAssignChecklist={() => onAssignChecklist(area)} onCreateInstances={() => onCreateInstances(area)} onViewChecklists={() => onViewChecklists(area)} onBulkCreate={() => onBulkCreate(area)} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>
      {hasChildren && (
        <Collapse in={expanded}>
          {area.children!.map(child => (
            <AreaNode key={child.id} area={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} onOpenDrawer={onOpenDrawer} onAssignChecklist={onAssignChecklist} onCreateInstances={onCreateInstances} onViewChecklists={onViewChecklists} onBulkCreate={onBulkCreate} t={t} />
          ))}
        </Collapse>
      )}
    </Box>
  )
}

export default function AreasPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const [loading, setLoading] = useState(true)
  const [areas, setAreas] = useState<ConstructionArea[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<ConstructionArea | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<ConstructionArea | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedArea, setSelectedArea] = useState<ConstructionArea | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [floorFilter, setFloorFilter] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', areaCode: '', areaType: '', parentId: '', floorNumber: '', totalUnits: '' })

  useEffect(() => { loadAreas() }, [projectId])

  const getAllAreas = (areas: ConstructionArea[]): ConstructionArea[] => {
    const flatList: ConstructionArea[] = []
    const flatten = (areaList: ConstructionArea[]) => { areaList.forEach(area => { flatList.push(area); if (area.children?.length) flatten(area.children) }) }
    flatten(areas); return flatList
  }

  const loadAreas = async () => { try { setLoading(true); const data = await areasApi.list(projectId!); setAreas(data) } catch { showError(t('areas.failedToLoadAreas')) } finally { setLoading(false) } }
  const resetForm = () => { setFormData({ name: '', areaCode: '', areaType: '', parentId: '', floorNumber: '', totalUnits: '' }); setErrors({}); setEditingArea(null) }
  const handleOpenCreate = () => { resetForm(); setDialogOpen(true) }
  const handleOpenEdit = (area: ConstructionArea) => { setEditingArea(area); setFormData({ name: area.name, areaCode: area.areaCode || '', areaType: area.areaType || '', parentId: area.parentId || '', floorNumber: area.floorNumber?.toString() || '', totalUnits: area.totalUnits?.toString() || '' }); setErrors({}); setDialogOpen(true) }

  const handleSaveArea = async () => {
    if (!projectId) return
    const validationErrors = validateAreaForm({ name: formData.name, areaCode: formData.areaCode, floor_number: formData.floorNumber ? parseInt(formData.floorNumber) : undefined, total_units: formData.totalUnits ? parseInt(formData.totalUnits) : undefined })
    setErrors(validationErrors); if (hasErrors(validationErrors)) return
    setSaving(true)
    try {
      const payload = { name: formData.name, area_code: formData.areaCode, area_type: formData.areaType || undefined, parent_id: formData.parentId || undefined, floor_number: formData.floorNumber ? parseInt(formData.floorNumber) : undefined, total_units: formData.totalUnits ? parseInt(formData.totalUnits) : undefined }
      if (editingArea) { await withMinDuration(areasApi.update(projectId, editingArea.id, payload)); showSuccess(t('areas.areaUpdatedSuccessfully')) }
      else { await withMinDuration(areasApi.create(projectId, payload)); showSuccess(t('areas.areaCreatedSuccessfully')) }
      setDialogOpen(false); resetForm(); loadAreas()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) { setErrors(prev => ({ ...prev, ...serverErrors })); showError(t('validation.checkFields')); return }
      showError(editingArea ? t('areas.failedToUpdateArea') : t('areas.failedToCreateArea'))
    } finally { setSaving(false) }
  }

  const handleDeleteClick = (area: ConstructionArea) => { setAreaToDelete(area); setDeleteDialogOpen(true) }
  const handleConfirmDelete = async () => {
    if (!projectId || !areaToDelete) return; setDeleting(true)
    try { await withMinDuration(areasApi.delete(projectId, areaToDelete.id)); showSuccess(t('areas.areaDeletedSuccessfully')); setDeleteDialogOpen(false); setAreaToDelete(null); loadAreas() }
    catch { showError(t('areas.failedToDeleteArea')) } finally { setDeleting(false) }
  }

  const handleOpenDrawer = (area: ConstructionArea) => { setSelectedArea(area); setDrawerOpen(true) }
  const handleCreateInstances = async (area: ConstructionArea) => { if (!projectId) return; try { const result = await areaStructureApi.createAreaChecklists(projectId, area.id); showSuccess(t('areaChecklists.checklistsCreated', { count: result.checklists_created })) } catch { showError(t('checklists.failedToCreate')) } }
  const handleBulkCreate = async (area: ConstructionArea) => {
    if (!projectId || !area.children) return
    try { let total = 0; for (const child of area.children) { const result = await areaStructureApi.createAreaChecklists(projectId, child.id); total += result.checklists_created } showSuccess(t('areaChecklists.checklistsCreated', { count: total })) }
    catch { showError(t('checklists.failedToCreate')) }
  }

  const allAreas = getAllAreas(areas)
  const completedAreas = allAreas.filter(a => (a.currentProgress ?? 0) === 100).length
  const inProgressAreas = allAreas.filter(a => { const p = a.currentProgress ?? 0; return p > 0 && p < 100 }).length
  const overallProgress = allAreas.length > 0 ? Math.round(allAreas.reduce((sum, a) => sum + (a.currentProgress ?? 0), 0) / allAreas.length) : 0

  const uniqueFloors = useMemo(() => {
    const floors = allAreas.filter(a => a.floorNumber !== undefined && a.floorNumber !== null).map(a => a.floorNumber!)
    return [...new Set(floors)].sort((a, b) => a - b)
  }, [allAreas])

  const filterAreasByFloor = (areaList: ConstructionArea[]): ConstructionArea[] => {
    if (floorFilter === null) return areaList
    return areaList.reduce<ConstructionArea[]>((acc, area) => {
      if (area.floorNumber === floorFilter) {
        acc.push(area)
      } else if (area.children?.length) {
        const filteredChildren = filterAreasByFloor(area.children)
        if (filteredChildren.length > 0) {
          acc.push({ ...area, children: filteredChildren })
        }
      }
      return acc
    }, [])
  }
  const filteredAreas = filterAreasByFloor(areas)

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={60} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('areas.pageTitle')} subtitle={t('areas.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('areas.title') }]}
        actions={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="secondary" icon={<AccountTreeIcon />} onClick={() => navigate(`/projects/${projectId}/structure-wizard`)}>{t('areas.structureWizard')}</Button>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}><Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>{t('areas.addArea')}</Button></Box>
          </Box>
        }
      />

      <Box sx={{ mb: 2 }}>
        <SummaryBar items={[
          { label: t('areas.totalAreas'), value: allAreas.length },
          { label: t('areas.completed'), value: completedAreas, color: theme.palette.success.main },
          { label: t('areas.inProgress'), value: inProgressAreas, color: theme.palette.info.main },
          { label: t('areas.overallProgress'), value: `${overallProgress}%`, color: theme.palette.primary.main },
        ]} />
      </Box>

      {uniqueFloors.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
          <Chip label={t('common.all')} onClick={() => setFloorFilter(null)}
            sx={{ bgcolor: floorFilter === null ? 'primary.main' : 'action.hover', color: floorFilter === null ? 'white' : 'text.primary', fontWeight: 600 }} />
          {uniqueFloors.map(floor => (
            <Chip key={floor} label={`${t('areas.floor')} ${floor}`} onClick={() => setFloorFilter(floor)}
              sx={{ bgcolor: floorFilter === floor ? 'primary.main' : 'action.hover', color: floorFilter === floor ? 'white' : 'text.primary', fontWeight: 600 }} />
          ))}
        </Box>
      )}

      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: { xs: 2, sm: 3 }, background: (th) => th.palette.mode === 'dark' ? 'linear-gradient(135deg, #1e1e1e 0%, #0a0a0a 100%)' : 'linear-gradient(135deg, #e07842 0%, #0a0a0a 100%)', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={600} color="white" noWrap>{t('areas.overallProjectProgress')}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>{t('areas.basedOnAllAreas', { count: allAreas.length })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 4 } }}>
              <Box sx={{ width: { xs: 140, sm: 200 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{t('areas.progress')}</Typography>
                  <Typography variant="body2" fontWeight={600} color="white">{overallProgress}%</Typography>
                </Box>
                <Box sx={{ height: 10, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 5, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${overallProgress}%`, bgcolor: 'white', borderRadius: 5, transition: 'width 0.5s ease-in-out' }} />
                </Box>
              </Box>
              <CircularProgressDisplay value={overallProgress} size={80} thickness={6} showLabel />
            </Box>
          </Box>
        </Box>
      </Card>

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600} noWrap>{t('areas.areaHierarchy')}</Typography>
            <Chip label={t('areas.title', { count: allAreas.length })} size="small" />
          </Box>

          <Box sx={{ mb: 2 }}>
            <FilterChips
              items={[
                { label: t('common.all'), value: 'all' },
                { label: t('areas.statuses.completed'), value: 'completed', count: completedAreas },
                { label: t('areas.statuses.in_progress'), value: 'in_progress', count: inProgressAreas },
                { label: t('areas.statuses.not_started'), value: 'not_started', count: allAreas.length - completedAreas - inProgressAreas },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </Box>

          {filteredAreas.length === 0 ? (
            <EmptyState variant="no-data" title={t('areas.noAreasYet')} description={t('areas.noAreasDescription')} action={{ label: t('areas.addFirstArea'), onClick: handleOpenCreate }} secondaryAction={{ label: t('areas.structureWizard'), onClick: () => navigate(`/projects/${projectId}/structure-wizard`) }} />
          ) : (
            <Box>
              {filteredAreas.map(area => (
                <AreaNode key={area.id} area={area} level={0} onEdit={handleOpenEdit} onDelete={handleDeleteClick} onOpenDrawer={handleOpenDrawer} onAssignChecklist={handleOpenDrawer} onCreateInstances={handleCreateInstances} onViewChecklists={handleOpenDrawer} onBulkCreate={handleBulkCreate} t={t} />
              ))}
            </Box>
          )}
        </Box>
      </Card>

      <FormModal open={dialogOpen} onClose={() => { setDialogOpen(false); resetForm() }} onSubmit={handleSaveArea} title={editingArea ? t('areas.editConstructionArea') : t('areas.addConstructionArea')} submitLabel={editingArea ? t('areas.saveChanges') : t('areas.addArea')} loading={saving}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField fullWidth label={t('areas.areaName')} required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={!!errors.name} helperText={errors.name || `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}`} inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }} />
          <TextField fullWidth label={t('areas.areaCode')} required disabled={!!editingArea} value={formData.areaCode} onChange={(e) => setFormData({ ...formData, areaCode: e.target.value.toUpperCase() })} error={!!errors.areaCode} helperText={editingArea ? t('areas.codeCannotBeChanged') : (errors.areaCode || t('areas.codeHint'))} inputProps={{ maxLength: VALIDATION.MAX_CODE_LENGTH }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <MuiTextField fullWidth select label={t('areas.areaType')} value={formData.areaType} onChange={(e) => setFormData({ ...formData, areaType: e.target.value })}>
              <MenuItem value="">{t('areas.selectType')}</MenuItem>
              {AREA_TYPE_KEYS.map(key => <MenuItem key={key} value={key}>{t(`areas.types.${key}`)}</MenuItem>)}
            </MuiTextField>
            <MuiTextField fullWidth select label={t('areas.parentArea')} value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}>
              <MenuItem value="">{t('areas.noneTopLevel')}</MenuItem>
              {allAreas.filter(a => !editingArea || a.id !== editingArea.id).map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
            </MuiTextField>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField fullWidth label={t('areas.floorNumber')} type="number" value={formData.floorNumber} onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })} inputProps={{ min: -10, max: 200 }} />
            <TextField fullWidth label={t('areas.totalUnits')} type="number" value={formData.totalUnits} onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })} inputProps={{ min: 0, max: 10000 }} />
          </Box>
        </Box>
      </FormModal>

      <ConfirmModal open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleConfirmDelete} title={t('areas.deleteArea')} message={areaToDelete?.children?.length ? t('areas.deleteConfirmation', { name: areaToDelete?.name, count: areaToDelete.children.length }) : t('areas.deleteConfirmationNoChildren', { name: areaToDelete?.name })} confirmLabel={t('common.delete')} variant="danger" loading={deleting} />

      <AreaDetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} area={selectedArea} projectId={projectId!} />
    </Box>
  )
}
