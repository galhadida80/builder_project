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
import { areasApi } from '../api/areas'
import type { ConstructionArea, AreaStatus } from '../types'
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
}

function AreaNode({ area, level }: AreaNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = area.children && area.children.length > 0
  const overallProgress = 65
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
              <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
      {hasChildren && (
        <Collapse in={expanded}>
          {area.children!.map(child => <AreaNode key={child.id} area={child} level={level + 1} />)}
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
  const [formData, setFormData] = useState({ name: '', areaCode: '', areaType: '', parentId: '', floorNumber: '', totalUnits: '' })

  useEffect(() => {
    loadAreas()
  }, [projectId])

  const loadAreas = async () => {
    try {
      setLoading(true)
      const data = await areasApi.list(projectId)
      setAreas(data)
    } catch (error) {
      showError('Failed to load areas. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateArea = async () => {
    if (!projectId) return
    try {
      await areasApi.create(projectId, {
        name: formData.name,
        areaCode: formData.areaCode,
        areaType: formData.areaType || undefined,
        parentId: formData.parentId || undefined,
        floorNumber: formData.floorNumber ? parseInt(formData.floorNumber) : undefined,
        totalUnits: formData.totalUnits ? parseInt(formData.totalUnits) : undefined
      })
      showSuccess('Area created successfully!')
      setDialogOpen(false)
      setFormData({ name: '', areaCode: '', areaType: '', parentId: '', floorNumber: '', totalUnits: '' })
      loadAreas()
    } catch (error) {
      showError('Failed to create area. Please try again.')
    }
  }

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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Add Area</Button>
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
                <LinearProgress variant="determinate" value={58} sx={{ flexGrow: 1, height: 12, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }} />
                <Typography variant="h4" fontWeight="bold">58%</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box>
        {areas.map(area => <AreaNode key={area.id} area={area} level={0} />)}
      </Box>

      {areas.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No construction areas found</Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Construction Area</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Area Name" margin="normal" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <TextField fullWidth label="Area Code" margin="normal" required value={formData.areaCode} onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })} />
          <TextField fullWidth select label="Area Type" margin="normal" value={formData.areaType} onChange={(e) => setFormData({ ...formData, areaType: e.target.value })}>
            {areaTypes.map(type => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth select label="Parent Area (optional)" margin="normal" value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}>
            <MenuItem value="">None (Top Level)</MenuItem>
            {areas.map(area => <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Floor Number" type="number" margin="normal" value={formData.floorNumber} onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })} />
          <TextField fullWidth label="Total Units" type="number" margin="normal" value={formData.totalUnits} onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateArea}>Add Area</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
