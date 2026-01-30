import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ApartmentIcon from '@mui/icons-material/Apartment'
import LocalParkingIcon from '@mui/icons-material/LocalParking'
import RoofingIcon from '@mui/icons-material/Roofing'
import FoundationIcon from '@mui/icons-material/Foundation'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { areasApi } from '../api/areas'
import type { ConstructionArea, AreaStatus } from '../types'
import { validateAreaForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'

const areaTypes = [
  { value: 'apartment', label: 'Apartment', icon: <ApartmentIcon /> },
  { value: 'parking', label: 'Parking', icon: <LocalParkingIcon /> },
  { value: 'roof', label: 'Roof', icon: <RoofingIcon /> },
  { value: 'basement', label: 'Basement', icon: <FoundationIcon /> },
  { value: 'facade', label: 'Facade', icon: <ApartmentIcon /> },
  { value: 'common_area', label: 'Common Area', icon: <ApartmentIcon /> },
]

interface AreaNodeProps {
  area: ConstructionArea
  level: number
  onEdit: (area: ConstructionArea) => void
  onDelete: (area: ConstructionArea) => void
}

function AreaNode({ area, level, onEdit, onDelete }: AreaNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = area.children && area.children.length > 0
  const overallProgress: number = area.progress && area.progress.length > 0
    ? Math.round(area.progress.reduce((sum, p) => sum + p.progressPercent, 0) / area.progress.length)
    : 0
  const areaType = areaTypes.find(t => t.value === area.areaType)

  const getStatusColor = (status: AreaStatus) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': return 'primary'
      case 'awaiting_approval': return 'warning'
      default: return 'default'
    }
  }

  return (
    <Box sx={{ ml: level * 3 }}>
      <Card sx={{ mb: 1, '&:hover': { boxShadow: 2 } }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {hasChildren ? (
                <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              ) : <Box sx={{ width: 28 }} />}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {areaType?.icon}
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">{area.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={area.areaCode} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                    {area.totalUnits && <Typography variant="caption" color="text.secondary">{area.totalUnits} units</Typography>}
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 150 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Progress</Typography>
                  <Typography variant="caption" fontWeight="bold">{overallProgress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={overallProgress} sx={{ height: 6, borderRadius: 3 }} color={overallProgress === 100 ? 'success' : 'primary'} />
              </Box>
              <Chip label="In Progress" size="small" color={getStatusColor('in_progress')} />
              <IconButton size="small" onClick={() => onEdit(area)} title="Edit area">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onDelete(area)} title="Delete area" color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
      {hasChildren && (
        <Collapse in={expanded}>
          {area.children!.map(child => (
            <AreaNode key={child.id} area={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </Collapse>
      )}
    </Box>
  )
}

export default function AreasPage() {
  const { projectId } = useParams()
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

  const validateAreaCodeUniqueness = (areaCode: string): boolean => {
    const allAreas = getAllAreas(areas)
    return !allAreas.some(area => area.areaCode.toLowerCase() === areaCode.toLowerCase())
  }

  const validateField = (fieldName: string) => {
    let error: string | null = null

    switch (fieldName) {
      case 'name':
        error = validateRequired(formData.name, 'Area Name')
          || validateMinLength(formData.name, VALIDATION.MIN_NAME_LENGTH, 'Area Name')
          || validateMaxLength(formData.name, VALIDATION.MAX_NAME_LENGTH, 'Area Name')
        break
      case 'areaCode':
        error = validateCode(formData.areaCode, 'Area Code')
          || validateMaxLength(formData.areaCode, VALIDATION.MAX_CODE_LENGTH, 'Area Code')
        if (!error && formData.areaCode && !validateAreaCodeUniqueness(formData.areaCode)) {
          error = 'Area Code already exists'
        }
        break
      case 'floorNumber':
        error = validateInteger(formData.floorNumber, 'Floor Number')
        break
      case 'totalUnits':
        error = validateInteger(formData.totalUnits, 'Total Units')
        if (!error && formData.totalUnits) {
          const num = Number(formData.totalUnits)
          if (!isNaN(num) && num <= 0) {
            error = 'Total Units must be greater than zero'
          }
        }
        break
    }

    setErrors(prev => ({ ...prev, [fieldName]: error }))
  }

  const loadAreas = async () => {
    try {
      setLoading(true)
      const data = await areasApi.list(projectId!)
      setAreas(data)
    } catch (error) {
      console.error('Failed to load areas:', error)
      showError('Failed to load areas. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getAllAreas = (areaList: ConstructionArea[]): ConstructionArea[] => {
    const result: ConstructionArea[] = []
    const traverse = (areas: ConstructionArea[]) => {
      for (const area of areas) {
        result.push(area)
        if (area.children && area.children.length > 0) {
          traverse(area.children)
        }
      }
    }
    traverse(areaList)
    return result
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
        showSuccess('Area updated successfully!')
      } else {
        await areasApi.create(projectId, payload)
        showSuccess('Area created successfully!')
      }
      handleCloseDialog()
      loadAreas()
    } catch (error) {
      console.error('Failed to save area:', error)
      showError(`Failed to ${editingArea ? 'update' : 'create'} area. Please try again.`)
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
      showSuccess('Area deleted successfully!')
      setDeleteDialogOpen(false)
      setAreaToDelete(null)
      loadAreas()
    } catch (error) {
      console.error('Failed to delete area:', error)
      showError('Failed to delete area. Please try again.')
    }
  }

  const allAreas = getAllAreas(areas)

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Construction Areas</Typography>
          <Typography variant="body2" color="text.secondary">Track progress by building area</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>Add Area</Button>
      </Box>

      <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Overall Project Progress</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Based on all construction areas</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress variant="determinate" value={overallProgress} sx={{ flexGrow: 1, height: 12, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }} />
                <Typography variant="h4" fontWeight="bold">{overallProgress}%</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box>
        {areas.map(area => (
          <AreaNode
            key={area.id}
            area={area}
            level={0}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteClick}
          />
        ))}
      </Box>

      {areas.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No construction areas found</Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingArea ? 'Edit Construction Area' : 'Add Construction Area'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Area Name"
            margin="normal"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name || formData.name.length >= VALIDATION.MAX_NAME_LENGTH}
            helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}${formData.name.length >= VALIDATION.MAX_NAME_LENGTH * 0.9 ? ' - Approaching limit' : ''}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label="Area Code"
            margin="normal"
            required
            disabled={!!editingArea}
            value={formData.areaCode}
            onChange={(e) => setFormData({ ...formData, areaCode: e.target.value.toUpperCase() })}
            error={!!errors.areaCode}
            helperText={editingArea ? 'Code cannot be changed' : (errors.areaCode || 'Letters, numbers, hyphens only')}
            inputProps={{ maxLength: VALIDATION.MAX_CODE_LENGTH }}
          />
          <TextField
            fullWidth
            select
            label="Area Type"
            margin="normal"
            value={formData.areaType}
            onChange={(e) => setFormData({ ...formData, areaType: e.target.value })}
          >
            <MenuItem value="">Select type...</MenuItem>
            {areaTypes.map(type => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            select
            label="Parent Area (optional)"
            margin="normal"
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
          >
            <MenuItem value="">None (Top Level)</MenuItem>
            {allAreas
              .filter(area => !editingArea || area.id !== editingArea.id)
              .map(area => <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            label="Floor Number"
            type="number"
            margin="normal"
            value={formData.floorNumber}
            onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
            inputProps={{ min: -10, max: 200 }}
          />
          <TextField
            fullWidth
            label="Total Units"
            type="number"
            margin="normal"
            value={formData.totalUnits}
            onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })}
            inputProps={{ min: 0, max: 10000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveArea} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : (editingArea ? 'Save Changes' : 'Add Area')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Area</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{areaToDelete?.name}</strong>?
            {areaToDelete?.children && areaToDelete.children.length > 0 && (
              <> This will also delete all child areas.</>
            )}
            {' '}This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
