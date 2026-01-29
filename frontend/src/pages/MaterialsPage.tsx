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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { materialsApi } from '../api/materials'
import StatusBadge from '../components/common/StatusBadge'
import type { Material } from '../types'
import { validateMaterialForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'

const materialTypes = ['Structural', 'Finishing', 'Safety', 'MEP', 'Insulation']

export default function MaterialsPage() {
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<Material[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [formData, setFormData] = useState({
    name: '',
    materialType: '',
    manufacturer: '',
    modelNumber: '',
    quantity: '',
    unit: '',
    expectedDelivery: '',
    storageLocation: '',
    notes: ''
  })

  useEffect(() => {
    loadMaterials()
  }, [projectId])

  const loadMaterials = async () => {
    try {
      setLoading(true)
      const data = await materialsApi.list(projectId)
      setMaterials(data)
    } catch (error) {
      showError('Failed to load materials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMaterial = async () => {
    if (!projectId) return
    const validationErrors = validateMaterialForm({
      name: formData.name,
      notes: formData.notes,
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return
    try {
      await materialsApi.create(projectId, {
        name: formData.name,
        material_type: formData.materialType || undefined,
        manufacturer: formData.manufacturer || undefined,
        model_number: formData.modelNumber || undefined,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unit: formData.unit || undefined,
        expected_delivery: formData.expectedDelivery || undefined,
        storage_location: formData.storageLocation || undefined,
        notes: formData.notes || undefined
      })
      showSuccess('Material created successfully!')
      handleCloseDialog()
      loadMaterials()
    } catch (error) {
      showError('Failed to create material. Please try again.')
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setErrors({})
    setFormData({ name: '', materialType: '', manufacturer: '', modelNumber: '', quantity: '', unit: '', expectedDelivery: '', storageLocation: '', notes: '' })
  }

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.materialType?.toLowerCase().includes(search.toLowerCase())
  )

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
        <Typography variant="h5" fontWeight="bold">Materials</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Material
        </Button>
      </Box>

      <TextField
        placeholder="Search materials..."
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
                <TableCell>Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id} hover>
                  <TableCell>
                    <Typography fontWeight="medium">{material.name}</Typography>
                  </TableCell>
                  <TableCell>{material.materialType || '-'}</TableCell>
                  <TableCell>{material.manufacturer || '-'}</TableCell>
                  <TableCell>
                    {material.quantity ? `${material.quantity} ${material.unit || ''}` : '-'}
                  </TableCell>
                  <TableCell><StatusBadge status={material.status} /></TableCell>
                  <TableCell align="right">
                    <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {filteredMaterials.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No materials found</Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Material</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Material Name"
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
            label="Material Type"
            margin="normal"
            value={formData.materialType}
            onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
          >
            {materialTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
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
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              margin="normal"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              error={!!errors.quantity}
              helperText={errors.quantity}
              inputProps={{ min: 0, max: 999999999 }}
            />
            <TextField
              fullWidth
              label="Unit"
              margin="normal"
              placeholder="e.g., ton, m3, unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              inputProps={{ maxLength: 50 }}
            />
          </Box>
          <TextField
            fullWidth
            label="Expected Delivery Date"
            type="date"
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={formData.expectedDelivery}
            onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
          />
          <TextField
            fullWidth
            label="Storage Location"
            margin="normal"
            value={formData.storageLocation}
            onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label="Notes"
            margin="normal"
            multiline
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            error={!!errors.notes}
            helperText={errors.notes || `${formData.notes.length}/${VALIDATION.MAX_NOTES_LENGTH}`}
            inputProps={{ maxLength: VALIDATION.MAX_NOTES_LENGTH }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateMaterial}>Add Material</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
