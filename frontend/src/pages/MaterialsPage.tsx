import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import DeleteIcon from '@mui/icons-material/Delete'
import { materialsApi } from '../api/materials'
import StatusBadge from '../components/common/StatusBadge'
import type { Material } from '../types'
import { validateMaterialForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'

const materialTypes = ['Structural', 'Finishing', 'Safety', 'MEP', 'Insulation']
const unitOptions = ['ton', 'm3', 'm2', 'm', 'kg', 'unit', 'box', 'pallet', 'roll']

export default function MaterialsPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<Material[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)
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
      console.error('Failed to load materials:', error)
      showError(t('pages.materials.failedToLoadMaterials'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', materialType: '', manufacturer: '', modelNumber: '', quantity: '', unit: '', expectedDelivery: '', storageLocation: '', notes: '' })
    setErrors({})
    setEditingMaterial(null)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = (material: Material) => {
    setEditingMaterial(material)
    setFormData({
      name: material.name,
      materialType: material.materialType || '',
      manufacturer: material.manufacturer || '',
      modelNumber: material.modelNumber || '',
      quantity: material.quantity?.toString() || '',
      unit: material.unit || '',
      expectedDelivery: material.expectedDelivery || '',
      storageLocation: material.storageLocation || '',
      notes: material.notes || ''
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleSaveMaterial = async () => {
    if (!projectId) return
    const validationErrors = validateMaterialForm({
      name: formData.name,
      notes: formData.notes,
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined
    })
    const dateWarning = validateFutureDate(formData.expectedDelivery, 'Expected Delivery Date')
    validationErrors.expectedDelivery = dateWarning
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        material_type: formData.materialType || undefined,
        manufacturer: formData.manufacturer || undefined,
        model_number: formData.modelNumber || undefined,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unit: formData.unit || undefined,
        expected_delivery: formData.expectedDelivery || undefined,
        storage_location: formData.storageLocation || undefined,
        notes: formData.notes || undefined
      }

      if (editingMaterial) {
        await materialsApi.update(projectId, editingMaterial.id, payload)
        showSuccess(t('pages.materials.materialUpdatedSuccessfully'))
      } else {
        await materialsApi.create(projectId, payload)
        showSuccess(t('pages.materials.materialCreatedSuccessfully'))
      }
      handleCloseDialog()
      loadMaterials()
    } catch (error) {
      console.error('Failed to save material:', error)
      showError(editingMaterial ? t('pages.materials.failedToUpdateMaterial') : t('pages.materials.failedToCreateMaterial'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (material: Material) => {
    setMaterialToDelete(material)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectId || !materialToDelete) return

    try {
      await materialsApi.delete(projectId, materialToDelete.id)
      showSuccess(t('pages.materials.materialDeletedSuccessfully'))
      setDeleteDialogOpen(false)
      setMaterialToDelete(null)
      loadMaterials()
    } catch (error) {
      console.error('Failed to delete material:', error)
      showError(t('pages.materials.failedToDeleteMaterial'))
    }
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
        <Typography variant="h5" fontWeight="bold">{t('pages.materials.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          {t('pages.materials.addMaterial')}
        </Button>
      </Box>

      <TextField
        placeholder={t('pages.materials.searchMaterials')}
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
                <TableCell>{t('common.name', { defaultValue: 'Name' })}</TableCell>
                <TableCell>{t('pages.materials.materialType')}</TableCell>
                <TableCell>{t('pages.materials.manufacturer')}</TableCell>
                <TableCell>{t('pages.materials.quantity')}</TableCell>
                <TableCell>{t('pages.materials.status', { defaultValue: 'Status' })}</TableCell>
                <TableCell align="right">{t('common.actions', { defaultValue: 'Actions' })}</TableCell>
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
                    <IconButton size="small" onClick={() => handleOpenEdit(material)} title={t('pages.materials.editMaterial')}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteClick(material)} title={t('pages.materials.deleteMaterial')} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {filteredMaterials.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">{t('pages.materials.noMaterials')}</Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingMaterial ? t('pages.materials.editMaterial') : t('pages.materials.addNewMaterial')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('pages.materials.materialName')}
            margin="normal"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name || formData.name.length >= VALIDATION.MAX_NAME_LENGTH}
            helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}${formData.name.length >= VALIDATION.MAX_NAME_LENGTH * 0.9 ? ' - ' + t('pages.projects.approachingLimit') : ''}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            select
            label={t('pages.materials.materialType')}
            margin="normal"
            value={formData.materialType}
            onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
          >
            <MenuItem value="">{t('pages.materials.selectType')}</MenuItem>
            {materialTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            label={t('pages.materials.manufacturer')}
            margin="normal"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.materials.modelNumber')}
            margin="normal"
            value={formData.modelNumber}
            onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
            inputProps={{ maxLength: 100 }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label={t('pages.materials.quantity')}
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
              select
              label={t('pages.materials.unit')}
              margin="normal"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            >
              <MenuItem value="">{t('pages.materials.selectUnit')}</MenuItem>
              {unitOptions.map(unit => <MenuItem key={unit} value={unit}>{unit}</MenuItem>)}
            </TextField>
          </Box>
          <TextField
            fullWidth
            label={t('pages.materials.expectedDeliveryDate')}
            type="date"
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={formData.expectedDelivery}
            onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
            helperText={errors.expectedDelivery}
          />
          <TextField
            fullWidth
            label={t('pages.materials.storageLocation')}
            margin="normal"
            value={formData.storageLocation}
            onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.materials.notes', { defaultValue: 'Notes' })}
            margin="normal"
            multiline
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            error={!!errors.notes || formData.notes.length >= VALIDATION.MAX_NOTES_LENGTH}
            helperText={errors.notes || (formData.notes.length > 0 ? `${formData.notes.length}/${VALIDATION.MAX_NOTES_LENGTH}${formData.notes.length >= VALIDATION.MAX_NOTES_LENGTH * 0.9 ? ' - ' + t('pages.projects.approachingLimit') : ''}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NOTES_LENGTH }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSaveMaterial} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : (editingMaterial ? t('common.save') : t('pages.materials.addMaterial'))}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('pages.materials.deleteMaterial')}</DialogTitle>
        <DialogContent>
          <Typography dangerouslySetInnerHTML={{ __html: t('pages.materials.areYouSureYouWantToDeleteMaterial', { name: materialToDelete?.name || '' }) }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
