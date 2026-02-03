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
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
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
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SendIcon from '@mui/icons-material/Send'
import { equipmentApi } from '../api/equipment'
import { filesApi } from '../api/files'
import StatusBadge from '../components/common/StatusBadge'
import { formatFileSize } from '../utils/fileUtils'
import type { Equipment } from '../types'
import type { FileRecord } from '../api/files'
import { validateEquipmentForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'

const equipmentTypes = ['Heavy Machinery', 'Lifting Equipment', 'Power Equipment', 'Safety Equipment', 'Tools']

export default function EquipmentPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [search, setSearch] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [formData, setFormData] = useState({
    name: '',
    equipmentType: '',
    manufacturer: '',
    modelNumber: '',
    serialNumber: '',
    notes: ''
  })
  const [files, setFiles] = useState<FileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  useEffect(() => {
    loadEquipment()
  }, [projectId])

  useEffect(() => {
    const loadFiles = async () => {
      if (!drawerOpen || !selectedEquipment || !projectId) {
        setFiles([])
        setFilesError(null)
        return
      }
      try {
        setFilesLoading(true)
        setFilesError(null)
        const data = await filesApi.list(projectId, 'equipment', selectedEquipment.id)
        setFiles(data)
      } catch (error) {
        setFilesError('Failed to load files')
      } finally {
        setFilesLoading(false)
      }
    }
    loadFiles()
  }, [drawerOpen, selectedEquipment, projectId])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const data = await equipmentApi.list(projectId!)
      setEquipment(data)
    } catch (error) {
      console.error('Failed to load equipment:', error)
      showError(t('pages.equipment.failedToLoadEquipment'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', equipmentType: '', manufacturer: '', modelNumber: '', serialNumber: '', notes: '' })
    setErrors({})
    setEditingEquipment(null)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = (eq: Equipment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingEquipment(eq)
    setFormData({
      name: eq.name,
      equipmentType: eq.equipmentType || '',
      manufacturer: eq.manufacturer || '',
      modelNumber: eq.modelNumber || '',
      serialNumber: eq.serialNumber || '',
      notes: eq.notes || ''
    })
    setErrors({})
    setDialogOpen(true)
    setDrawerOpen(false)
  }

  const handleSaveEquipment = async () => {
    if (!projectId) return
    const validationErrors = validateEquipmentForm(formData)
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        equipment_type: formData.equipmentType || undefined,
        manufacturer: formData.manufacturer || undefined,
        model_number: formData.modelNumber || undefined,
        serial_number: formData.serialNumber || undefined,
        notes: formData.notes || undefined
      }

      if (editingEquipment) {
        await equipmentApi.update(projectId, editingEquipment.id, payload)
        showSuccess(t('pages.equipment.equipmentUpdatedSuccessfully'))
      } else {
        await equipmentApi.create(projectId, payload)
        showSuccess(t('pages.equipment.equipmentCreatedSuccessfully'))
      }
      handleCloseDialog()
      loadEquipment()
    } catch (error) {
      console.error('Failed to save equipment:', error)
      showError(editingEquipment ? t('pages.equipment.failedToUpdateEquipment') : t('pages.equipment.failedToCreateEquipment'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (eq: Equipment, e: React.MouseEvent) => {
    e.stopPropagation()
    setEquipmentToDelete(eq)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectId || !equipmentToDelete) return

    try {
      await equipmentApi.delete(projectId, equipmentToDelete.id)
      showSuccess(t('pages.equipment.equipmentDeletedSuccessfully'))
      setDeleteDialogOpen(false)
      setEquipmentToDelete(null)
      setDrawerOpen(false)
      loadEquipment()
    } catch (error) {
      console.error('Failed to delete equipment:', error)
      showError(t('pages.equipment.failedToDeleteEquipment'))
    }
  }

  const handleSubmitForApproval = async () => {
    if (!projectId || !selectedEquipment) return

    setSubmitting(true)
    try {
      await equipmentApi.submit(projectId, selectedEquipment.id)
      showSuccess(t('pages.equipment.equipmentSubmittedForApproval'))
      loadEquipment()
      setDrawerOpen(false)
    } catch (error) {
      console.error('Failed to submit equipment:', error)
      showError(t('pages.equipment.failedToSubmitEquipment'))
    } finally {
      setSubmitting(false)
    }
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
        <Typography variant="h5" fontWeight="bold">{t('pages.equipment.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          {t('pages.equipment.addEquipment')}
        </Button>
      </Box>

      <TextField
        placeholder={t('pages.equipment.searchEquipment')}
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
                <TableCell>{t('pages.equipment.equipmentType')}</TableCell>
                <TableCell>{t('pages.equipment.manufacturer')}</TableCell>
                <TableCell>{t('pages.equipment.model')}</TableCell>
                <TableCell>{t('pages.equipment.status')}</TableCell>
                <TableCell align="right">{t('common.actions', { defaultValue: 'Actions' })}</TableCell>
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
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewDetails(eq); }} title={t('common.view', { defaultValue: 'View' })}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => handleOpenEdit(eq, e)} title={t('pages.equipment.editEquipment')}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => handleDeleteClick(eq, e)} title={t('pages.equipment.deleteEquipment')} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {filteredEquipment.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">{t('pages.equipment.noEquipment')}</Typography>
        </Box>
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer} PaperProps={{ sx: { width: 480 } }}>
        {selectedEquipment && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">{t('pages.equipment.equipmentDetails')}</Typography>
              <IconButton onClick={handleCloseDrawer}><CloseIcon /></IconButton>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">{selectedEquipment.name}</Typography>
              <StatusBadge status={selectedEquipment.status} />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('pages.equipment.details')}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <Box><Typography variant="caption" color="text.secondary">{t('pages.equipment.equipmentType')}</Typography><Typography>{selectedEquipment.equipmentType || '-'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">{t('pages.equipment.manufacturer')}</Typography><Typography>{selectedEquipment.manufacturer || '-'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">{t('pages.equipment.model')}</Typography><Typography>{selectedEquipment.modelNumber || '-'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">{t('pages.equipment.serialNumber')}</Typography><Typography>{selectedEquipment.serialNumber || '-'}</Typography></Box>
              {selectedEquipment.notes && <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="caption" color="text.secondary">{t('pages.equipment.notes', { defaultValue: 'Notes' })}</Typography><Typography>{selectedEquipment.notes}</Typography></Box>}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('pages.equipment.documents')}</Typography>
            {filesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filesError ? (
              <Box sx={{ py: 2 }}>
                <Typography color="error" variant="body2">{filesError}</Typography>
              </Box>
            ) : files.length === 0 ? (
              <Box sx={{ py: 2 }}>
                <Typography color="text.secondary" variant="body2">{t('pages.equipment.noDocumentsAttached')}</Typography>
              </Box>
            ) : (
              <List dense>
                {files.map((file) => (
                  <ListItem key={file.id}>
                    <ListItemIcon><DescriptionIcon /></ListItemIcon>
                    <ListItemText
                      primary={file.filename}
                      secondary={`${file.fileType.toUpperCase()} - ${formatFileSize(file.fileSize)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            <Button size="small" startIcon={<AddIcon />}>{t('pages.equipment.addDocument')}</Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('pages.equipment.approvalTimeline')}</Typography>
            <List dense>
              <ListItem><ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon><ListItemText primary={t('pages.equipment.submitted')} secondary={t('pages.equipment.pendingReview')} /></ListItem>
            </List>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              {selectedEquipment.status === 'draft' && (
                <Button
                  variant="contained"
                  startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
                  fullWidth
                  onClick={handleSubmitForApproval}
                  disabled={submitting}
                >
                  {t('pages.equipment.submitForApproval')}
                </Button>
              )}
              <Button variant="outlined" fullWidth onClick={() => handleOpenEdit(selectedEquipment)}>
                {t('pages.equipment.editEquipment')}
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEquipment ? t('pages.equipment.editEquipment') : t('pages.equipment.addNewEquipment')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('pages.equipment.equipmentName')}
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
            label={t('pages.equipment.equipmentType')}
            margin="normal"
            value={formData.equipmentType}
            onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
          >
            <MenuItem value="">{t('pages.equipment.selectType')}</MenuItem>
            {equipmentTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            label={t('pages.equipment.manufacturer')}
            margin="normal"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label={t('pages.equipment.modelNumber')}
            margin="normal"
            value={formData.modelNumber}
            onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            fullWidth
            label={t('pages.equipment.serialNumber')}
            margin="normal"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            error={!!errors.serialNumber}
            helperText={errors.serialNumber || `${formData.serialNumber.length}/100`}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            fullWidth
            label={t('pages.equipment.notes', { defaultValue: 'Notes' })}
            margin="normal"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            error={!!errors.notes || formData.notes.length >= VALIDATION.MAX_NOTES_LENGTH}
            helperText={errors.notes || (formData.notes.length > 0 ? `${formData.notes.length}/${VALIDATION.MAX_NOTES_LENGTH}${formData.notes.length >= VALIDATION.MAX_NOTES_LENGTH * 0.9 ? ' - ' + t('pages.projects.approachingLimit') : ''}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NOTES_LENGTH }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSaveEquipment} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : (editingEquipment ? t('common.save') : t('pages.equipment.addEquipment'))}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('pages.equipment.deleteEquipment')}</DialogTitle>
        <DialogContent>
          <Typography dangerouslySetInnerHTML={{ __html: t('pages.equipment.areYouSureYouWantToDeleteEquipment', { name: equipmentToDelete?.name || '' }) }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
