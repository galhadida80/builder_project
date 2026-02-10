import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ApartmentIcon from '@mui/icons-material/Apartment'
import LocalParkingIcon from '@mui/icons-material/LocalParking'
import RoofingIcon from '@mui/icons-material/Roofing'
import FoundationIcon from '@mui/icons-material/Foundation'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { ProgressBar, CircularProgressDisplay } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { areasApi } from '../api/areas'
import type { ConstructionArea, AreaStatus } from '../types'
import { validateAreaForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'

const AREA_TYPE_ICONS: Record<string, React.ReactNode> = {
  apartment: <ApartmentIcon />,
  parking: <LocalParkingIcon />,
  roof: <RoofingIcon />,
  basement: <FoundationIcon />,
  facade: <ApartmentIcon />,
  common_area: <ApartmentIcon />,
}

const AREA_TYPE_KEYS = ['apartment', 'parking', 'roof', 'basement', 'facade', 'common_area'] as const

const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  completed: 'success',
  in_progress: 'info',
  awaiting_approval: 'warning',
  not_started: 'default',
}

interface AreaNodeProps {
  area: ConstructionArea
  level: number
  onEdit: (area: ConstructionArea) => void
  onDelete: (area: ConstructionArea) => void
  t: (key: string, options?: Record<string, unknown>) => string
}

function AreaNode({ area, level, onEdit, onDelete, t }: AreaNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = area.children && area.children.length > 0
  const overallProgress: number = area.progress && area.progress.length > 0
    ? Math.round(area.progress.reduce((sum, p) => sum + p.progressPercent, 0) / area.progress.length)
    : 0
  const areaTypeIcon = AREA_TYPE_ICONS[area.areaType || ''] || <ApartmentIcon />
  const derivedStatus: AreaStatus = overallProgress === 100 ? 'completed' : overallProgress > 0 ? 'in_progress' : 'not_started'
  const statusColor = STATUS_COLORS[derivedStatus] || 'default'

  return (
    <Box sx={{ marginInlineStart: level * 3 }}>
      <Card hoverable sx={{ mb: 1 }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {hasChildren ? (
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  sx={{
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              ) : <Box sx={{ width: 32 }} />}

              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                }}
              >
                {areaTypeIcon}
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight={600}>{area.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip
                    label={area.areaCode}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: 'action.hover',
                    }}
                  />
                  {area.totalUnits && (
                    <Typography variant="caption" color="text.secondary">
                      {area.totalUnits} {t('areas.units')}
                    </Typography>
                  )}
                  {area.floorNumber !== undefined && (
                    <Typography variant="caption" color="text.secondary">
                      {t('areas.floor')} {area.floorNumber}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ width: 160 }}>
                <ProgressBar
                  value={overallProgress}
                  showValue
                  size="small"
                  color={overallProgress === 100 ? 'success' : 'primary'}
                />
              </Box>

              <Chip
                label={t(`areas.statuses.${derivedStatus}`)}
                size="small"
                color={statusColor}
                sx={{ fontWeight: 500, minWidth: 100 }}
              />

              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => onEdit(area)} title={t('areas.editArea')}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(area)} title={t('areas.deleteArea')} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      {hasChildren && (
        <Collapse in={expanded}>
          {area.children!.map(child => (
            <AreaNode key={child.id} area={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} t={t} />
          ))}
        </Collapse>
      )}
    </Box>
  )
}

export default function AreasPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [areas, setAreas] = useState<ConstructionArea[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<ConstructionArea | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<ConstructionArea | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [formData, setFormData] = useState({
    name: '',
    areaCode: '',
    areaType: '',
    parentId: '',
    floorNumber: '',
    totalUnits: ''
  })

  useEffect(() => {
    loadAreas()
  }, [projectId])

  const getAllAreas = (areas: ConstructionArea[]): ConstructionArea[] => {
    const flatList: ConstructionArea[] = []
    const flatten = (areaList: ConstructionArea[]) => {
      areaList.forEach(area => {
        flatList.push(area)
        if (area.children && area.children.length > 0) {
          flatten(area.children)
        }
      })
    }
    flatten(areas)
    return flatList
  }

  const loadAreas = async () => {
    try {
      setLoading(true)
      const data = await areasApi.list(projectId!)
      setAreas(data)
    } catch {
      showError(t('areas.failedToLoadAreas'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', areaCode: '', areaType: '', parentId: '', floorNumber: '', totalUnits: '' })
    setErrors({})
    setEditingArea(null)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = (area: ConstructionArea) => {
    setEditingArea(area)
    setFormData({
      name: area.name,
      areaCode: area.areaCode || '',
      areaType: area.areaType || '',
      parentId: area.parentId || '',
      floorNumber: area.floorNumber?.toString() || '',
      totalUnits: area.totalUnits?.toString() || ''
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleSaveArea = async () => {
    if (!projectId) return

    const validationErrors = validateAreaForm({
      name: formData.name,
      areaCode: formData.areaCode
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        area_code: formData.areaCode,
        area_type: formData.areaType || undefined,
        parent_id: formData.parentId || undefined,
        floor_number: formData.floorNumber ? parseInt(formData.floorNumber) : undefined,
        total_units: formData.totalUnits ? parseInt(formData.totalUnits) : undefined
      }

      if (editingArea) {
        await areasApi.update(projectId, editingArea.id, payload)
        showSuccess(t('areas.areaUpdatedSuccessfully'))
      } else {
        await areasApi.create(projectId, payload)
        showSuccess(t('areas.areaCreatedSuccessfully'))
      }
      handleCloseDialog()
      loadAreas()
    } catch {
      showError(editingArea ? t('areas.failedToUpdateArea') : t('areas.failedToCreateArea'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (area: ConstructionArea) => {
    setAreaToDelete(area)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectId || !areaToDelete) return

    try {
      await areasApi.delete(projectId, areaToDelete.id)
      showSuccess(t('areas.areaDeletedSuccessfully'))
      setDeleteDialogOpen(false)
      setAreaToDelete(null)
      loadAreas()
    } catch {
      showError(t('areas.failedToDeleteArea'))
    }
  }

  const allAreas = getAllAreas(areas)
  const completedAreas = allAreas.filter(a => {
    const progress = a.progress && a.progress.length > 0
      ? a.progress.reduce((s, p) => s + p.progressPercent, 0) / a.progress.length
      : 0
    return progress === 100
  }).length

  const inProgressAreas = allAreas.filter(a => {
    const progress = a.progress && a.progress.length > 0
      ? a.progress.reduce((s, p) => s + p.progressPercent, 0) / a.progress.length
      : 0
    return progress > 0 && progress < 100
  }).length

  const overallProgress = allAreas.length > 0
    ? Math.round(allAreas.reduce((sum, area) => {
        const areaProgress = area.progress && area.progress.length > 0
          ? area.progress.reduce((s, p) => s + p.progressPercent, 0) / area.progress.length
          : 0
        return sum + areaProgress
      }, 0) / allAreas.length)
    : 0

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t('areas.pageTitle')}
        subtitle={t('areas.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('areas.title') }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            {t('areas.addArea')}
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <KPICard
          title={t('areas.totalAreas')}
          value={allAreas.length}
          icon={<AccountTreeIcon />}
          color="primary"
        />
        <KPICard
          title={t('areas.completed')}
          value={completedAreas}
          icon={<CheckCircleIcon />}
          color="success"
        />
        <KPICard
          title={t('areas.inProgress')}
          value={inProgressAreas}
          icon={<PendingActionsIcon />}
          color="info"
        />
        <KPICard
          title={t('areas.overallProgress')}
          value={`${overallProgress}%`}
          icon={<TrendingUpIcon />}
          color="warning"
        />
      </Box>

      <Card sx={{ mb: 4 }}>
        <Box
          sx={{
            p: 3,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #0369A1 0%, #0F172A 100%)',
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" fontWeight={600} color="white">
                {t('areas.overallProjectProgress')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                {t('areas.basedOnAllAreas', { count: allAreas.length })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Box sx={{ width: 200 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t('areas.progress')}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="white">
                    {overallProgress}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 10,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    borderRadius: 5,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${overallProgress}%`,
                      bgcolor: 'white',
                      borderRadius: 5,
                      transition: 'width 0.5s ease-in-out',
                    }}
                  />
                </Box>
              </Box>
              <CircularProgressDisplay
                value={overallProgress}
                size={80}
                thickness={6}
                showLabel
              />
            </Box>
          </Box>
        </Box>
      </Card>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              {t('areas.areaHierarchy')}
            </Typography>
            <Chip label={t('areas.title', { count: allAreas.length })} size="small" />
          </Box>

          {areas.length === 0 ? (
            <EmptyState
              variant="no-data"
              title={t('areas.noAreasYet')}
              description={t('areas.noAreasDescription')}
              action={{ label: t('areas.addFirstArea'), onClick: handleOpenCreate }}
            />
          ) : (
            <Box>
              {areas.map(area => (
                <AreaNode
                  key={area.id}
                  area={area}
                  level={0}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteClick}
                  t={t}
                />
              ))}
            </Box>
          )}
        </Box>
      </Card>

      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveArea}
        title={editingArea ? t('areas.editConstructionArea') : t('areas.addConstructionArea')}
        submitLabel={editingArea ? t('areas.saveChanges') : t('areas.addArea')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('areas.areaName')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name || `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}`}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('areas.areaCode')}
            required
            disabled={!!editingArea}
            value={formData.areaCode}
            onChange={(e) => setFormData({ ...formData, areaCode: e.target.value.toUpperCase() })}
            error={!!errors.areaCode}
            helperText={editingArea ? t('areas.codeCannotBeChanged') : (errors.areaCode || t('areas.codeHint'))}
            inputProps={{ maxLength: VALIDATION.MAX_CODE_LENGTH }}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <MuiTextField
              fullWidth
              select
              label={t('areas.areaType')}
              value={formData.areaType}
              onChange={(e) => setFormData({ ...formData, areaType: e.target.value })}
            >
              <MenuItem value="">{t('areas.selectType')}</MenuItem>
              {AREA_TYPE_KEYS.map(key => <MenuItem key={key} value={key}>{t(`areas.types.${key}`)}</MenuItem>)}
            </MuiTextField>
            <MuiTextField
              fullWidth
              select
              label={t('areas.parentArea')}
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            >
              <MenuItem value="">{t('areas.noneTopLevel')}</MenuItem>
              {allAreas
                .filter(area => !editingArea || area.id !== editingArea.id)
                .map(area => <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>)}
            </MuiTextField>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label={t('areas.floorNumber')}
              type="number"
              value={formData.floorNumber}
              onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
              inputProps={{ min: -10, max: 200 }}
            />
            <TextField
              fullWidth
              label={t('areas.totalUnits')}
              type="number"
              value={formData.totalUnits}
              onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })}
              inputProps={{ min: 0, max: 10000 }}
            />
          </Box>
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('areas.deleteArea')}
        message={
          areaToDelete?.children && areaToDelete.children.length > 0
            ? t('areas.deleteConfirmation', { name: areaToDelete?.name, count: areaToDelete.children.length })
            : t('areas.deleteConfirmationNoChildren', { name: areaToDelete?.name })
        }
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </Box>
  )
}
