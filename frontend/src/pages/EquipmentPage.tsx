import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SendIcon from '@mui/icons-material/Send'
import { equipmentApi } from '../api/equipment'
import StatusBadge from '../components/common/StatusBadge'
import type { Equipment } from '../types'
import { validateEquipmentForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'

const equipmentTypes = ['Heavy Machinery', 'Lifting Equipment', 'Power Equipment', 'Safety Equipment', 'Tools']

export default function EquipmentPage() {
  const { projectId } = useParams()
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [search, setSearch] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [formData, setFormData] = useState({
    name: '',
    equipmentType: '',
    manufacturer: '',
    modelNumber: '',
    serialNumber: '',
    notes: ''
  })

  useEffect(() => {
    loadEquipment()
  }, [projectId])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const data = await equipmentApi.list(projectId)
      setEquipment(data)
    } catch (error) {
      console.error('Failed to load equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEquipment = async () => {
    if (!projectId) return
    const validationErrors = validateEquipmentForm(formData)
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return
    try {
      await equipmentApi.create(projectId, {
        name: formData.name,
        equipment_type: formData.equipmentType || undefined,
        manufacturer: formData.manufacturer || undefined,
        model_number: formData.modelNumber || undefined,
        serial_number: formData.serialNumber || undefined,
        notes: formData.notes || undefined
      })
      handleCloseDialog()
      loadEquipment()
    } catch (error) {
      console.error('Failed to create equipment:', error)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setErrors({})
    setFormData({ name: '', equipmentType: '', manufacturer: '', modelNumber: '', serialNumber: '', notes: '' })
  }

  const filteredEquipment = equipment.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.equipmentType?.toLowerCase().includes(search.toLowerCase())
  )

  const handleViewDetails = (eq: Equipment) => {
    setSelectedEquipment(eq)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedEquipment(null)
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
        <Typography variant="h5" fontWeight="bold">Equipment</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Equipment
        </Button>
      </Box>

      <TextField
        placeholder="Search equipment..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, width: 300 }}
        size="small"
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
        }}
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEquipment.map((eq) => (
                <TableRow key={eq.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleViewDetails(eq)}>
                  <TableCell><Typography fontWeight="medium">{eq.name}</Typography></TableCell>
                  <TableCell>{eq.equipmentType || '-'}</TableCell>
                  <TableCell>{eq.manufacturer || '-'}</TableCell>
                  <TableCell>{eq.modelNumber || '-'}</TableCell>
                  <TableCell><StatusBadge status={eq.status} /></TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewDetails(eq); }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {filteredEquipment.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No equipment found</Typography>
        </Box>
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer} PaperProps={{ sx: { width: 480 } }}>
        {selectedEquipment && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Equipment Details</Typography>
              <IconButton onClick={handleCloseDrawer}><CloseIcon /></IconButton>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">{selectedEquipment.name}</Typography>
              <StatusBadge status={selectedEquipment.status} />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Details</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <Box><Typography variant="caption" color="text.secondary">Type</Typography><Typography>{selectedEquipment.equipmentType || '-'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Manufacturer</Typography><Typography>{selectedEquipment.manufacturer || '-'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Model</Typography><Typography>{selectedEquipment.modelNumber || '-'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Serial Number</Typography><Typography>{selectedEquipment.serialNumber || '-'}</Typography></Box>
              {selectedEquipment.notes && <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="caption" color="text.secondary">Notes</Typography><Typography>{selectedEquipment.notes}</Typography></Box>}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Documents</Typography>
            <List dense>
              <ListItem><ListItemIcon><DescriptionIcon /></ListItemIcon><ListItemText primary="Technical Specifications" secondary="PDF - 2.4 MB" /></ListItem>
              <ListItem><ListItemIcon><DescriptionIcon /></ListItemIcon><ListItemText primary="Safety Certificate" secondary="PDF - 1.1 MB" /></ListItem>
              <ListItem><ListItemIcon><DescriptionIcon /></ListItemIcon><ListItemText primary="Installation Manual" secondary="PDF - 5.8 MB" /></ListItem>
            </List>
            <Button size="small" startIcon={<AddIcon />}>Add Document</Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Approval Timeline</Typography>
            <List dense>
              <ListItem><ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon><ListItemText primary="Submitted" secondary="Pending review" /></ListItem>
            </List>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              {selectedEquipment.status === 'draft' && (
                <Button variant="contained" startIcon={<SendIcon />} fullWidth>Submit for Approval</Button>
              )}
              <Button variant="outlined" fullWidth>Edit Equipment</Button>
            </Box>
          </Box>
        )}
      </Drawer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Equipment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Equipment Name"
            margin="normal"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name || `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}`}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            select
            label="Equipment Type"
            margin="normal"
            value={formData.equipmentType}
            onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
          >
            {equipmentTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            label="Manufacturer"
            margin="normal"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label="Model Number"
            margin="normal"
            value={formData.modelNumber}
            onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            fullWidth
            label="Serial Number"
            margin="normal"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            error={!!errors.serialNumber}
            helperText={errors.serialNumber || `${formData.serialNumber.length}/100`}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            fullWidth
            label="Notes"
            margin="normal"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            error={!!errors.notes}
            helperText={errors.notes || `${formData.notes.length}/${VALIDATION.MAX_NOTES_LENGTH}`}
            inputProps={{ maxLength: VALIDATION.MAX_NOTES_LENGTH }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateEquipment}>Add Equipment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
