import { useState } from 'react'
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
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ApartmentIcon from '@mui/icons-material/Apartment'
import LocalParkingIcon from '@mui/icons-material/LocalParking'
import RoofingIcon from '@mui/icons-material/Roofing'
import FoundationIcon from '@mui/icons-material/Foundation'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import EditIcon from '@mui/icons-material/Edit'
import { mockAreas } from '../mocks/data'
import type { ConstructionArea, AreaStatus } from '../types'

const areaTypes = [
  { value: 'apartment', label: 'Apartment', icon: <ApartmentIcon /> },
  { value: 'parking', label: 'Parking', icon: <LocalParkingIcon /> },
  { value: 'roof', label: 'Roof', icon: <RoofingIcon /> },
  { value: 'basement', label: 'Basement', icon: <FoundationIcon /> },
  { value: 'facade', label: 'Facade', icon: <ApartmentIcon /> },
  { value: 'infrastructure', label: 'Infrastructure', icon: <FoundationIcon /> },
  { value: 'common_area', label: 'Common Area', icon: <ApartmentIcon /> },
]

const tasks = [
  { category: 'Structure', tasks: ['Foundation', 'Columns', 'Beams', 'Slabs'] },
  { category: 'MEP', tasks: ['Electrical Rough-in', 'Plumbing Rough-in', 'HVAC Installation'] },
  { category: 'Finishing', tasks: ['Plastering', 'Tiling', 'Painting', 'Fixtures'] },
]

interface AreaNodeProps {
  area: ConstructionArea
  level: number
}

function AreaNode({ area, level }: AreaNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const hasChildren = area.children && area.children.length > 0

  const overallProgress: number = 65
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
              {hasChildren && (
                <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
              {!hasChildren && <Box sx={{ width: 28 }} />}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {areaType?.icon}
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">{area.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={area.areaCode} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                    {area.totalUnits && (
                      <Typography variant="caption" color="text.secondary">
                        {area.totalUnits} units
                      </Typography>
                    )}
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
                <LinearProgress
                  variant="determinate"
                  value={overallProgress}
                  sx={{ height: 6, borderRadius: 3 }}
                  color={overallProgress === 100 ? 'success' : 'primary'}
                />
              </Box>
              <Chip
                label="In Progress"
                size="small"
                color={getStatusColor('in_progress')}
              />
              <IconButton size="small" onClick={() => setEditOpen(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {hasChildren && (
        <Collapse in={expanded}>
          {area.children!.map(child => (
            <AreaNode key={child.id} area={child} level={level + 1} />
          ))}
        </Collapse>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Update Progress - {area.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {tasks.map(category => (
              <Grid item xs={12} md={4} key={category.category}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {category.category}
                </Typography>
                <List dense>
                  {category.tasks.map(task => (
                    <ListItem key={task} sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleOutlineIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={task}
                        secondary={
                          <LinearProgress variant="determinate" value={Math.random() * 100} sx={{ mt: 0.5, height: 4, borderRadius: 2 }} />
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setEditOpen(false)}>Save Progress</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function AreasPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Construction Areas</Typography>
          <Typography variant="body2" color="text.secondary">
            Track progress by building area
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Area
        </Button>
      </Box>

      <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Overall Project Progress</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Based on all construction areas
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={58}
                  sx={{ flexGrow: 1, height: 12, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }}
                />
                <Typography variant="h4" fontWeight="bold">58%</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box>
        {mockAreas.map(area => (
          <AreaNode key={area.id} area={area} level={0} />
        ))}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Construction Area</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Area Name" margin="normal" required />
          <TextField fullWidth label="Area Code" margin="normal" required />
          <TextField fullWidth select label="Area Type" margin="normal">
            {areaTypes.map(type => (
              <MenuItem key={type.value} value={type.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {type.icon}
                  {type.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <TextField fullWidth select label="Parent Area (optional)" margin="normal">
            <MenuItem value="">None (Top Level)</MenuItem>
            {mockAreas.map(area => (
              <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth label="Floor Number" type="number" margin="normal" />
          <TextField fullWidth label="Total Units" type="number" margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>Add Area</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
