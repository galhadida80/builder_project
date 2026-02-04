import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import SendIcon from '@mui/icons-material/Send'
import BuildIcon from '@mui/icons-material/Build'
import FilterListIcon from '@mui/icons-material/FilterList'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { ApprovalStepper } from '../components/ui/Stepper'
import { equipmentApi } from '../api/equipment'
import { filesApi } from '../api/files'
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
  const [activeTab, setActiveTab] = useState('all')
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
      } catch {
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
    } catch {
      showError(t('equipment.failedToLoadEquipment'))
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
        showSuccess(t('equipment.equipmentUpdatedSuccessfully'))
      } else {
        await equipmentApi.create(projectId, payload)
        showSuccess(t('equipment.equipmentCreatedSuccessfully'))
      }
      handleCloseDialog()
      loadEquipment()
    } catch {
      showError(editingEquipment ? t('equipment.failedToUpdateEquipment') : t('equipment.failedToCreateEquipment'))
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
      showSuccess(t('equipment.equipmentDeletedSuccessfully'))
      setDeleteDialogOpen(false)
      setEquipmentToDelete(null)
      setDrawerOpen(false)
      loadEquipment()
    } catch {
      showError(t('equipment.failedToDeleteEquipment'))
    }
  }

  const handleSubmitForApproval = async () => {
    if (!projectId || !selectedEquipment) return
    setSubmitting(true)
    try {
      await equipmentApi.submit(projectId, selectedEquipment.id)
      showSuccess(t('equipment.equipmentSubmittedSuccessfully'))
      loadEquipment()
      setDrawerOpen(false)
    } catch {
      showError(t('equipment.failedToSubmitEquipment'))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEquipment = equipment.filter(e => {
    if (activeTab !== 'all' && e.status !== activeTab) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) &&
        !e.equipmentType?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleViewDetails = (eq: Equipment) => {
    setSelectedEquipment(eq)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedEquipment(null)
  }

  const columns: Column<Equipment>[] = [
    {
      id: 'name',
      label: t('equipment.title'),
      minWidth: 250,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BuildIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.equipmentType || t('equipment.noTypeSpecified')}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'manufacturer',
      label: t('equipment.manufacturer'),
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" color={row.manufacturer ? 'text.primary' : 'text.secondary'}>
          {row.manufacturer || '-'}
        </Typography>
      ),
    },
    {
      id: 'modelNumber',
      label: t('equipment.model'),
      minWidth: 120,
      render: (row) => (
        <Typography variant="body2" color={row.modelNumber ? 'text.primary' : 'text.secondary'}>
          {row.modelNumber || '-'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: 130,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      label: '',
      minWidth: 140,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }}
            title={t('common.view')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => handleOpenEdit(row, e)}
            title={t('equipment.editEquipment')}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => handleDeleteClick(row, e)}
            title={t('common.delete')}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t('equipment.title')}
        subtitle={t('equipment.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('equipment.title') }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            {t('equipment.addEquipment')}
          </Button>
        }
      />

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <SearchField
                placeholder={t('equipment.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="secondary" size="small" icon={<FilterListIcon />}>
                {t('common.filter')}
              </Button>
            </Box>
            <Chip label={`${filteredEquipment.length} items`} size="small" />
          </Box>

          <Tabs
            items={[
              { label: t('common.status'), value: 'all', badge: equipment.length },
              { label: t('equipment.draft'), value: 'draft', badge: equipment.filter(e => e.status === 'draft').length },
              { label: t('equipment.underReview'), value: 'under_review', badge: equipment.filter(e => e.status === 'submitted' || e.status === 'under_review').length },
              { label: t('equipment.approved'), value: 'approved', badge: equipment.filter(e => e.status === 'approved').length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="small"
          />

          <Box sx={{ mt: 2 }}>
            <DataTable
              columns={columns}
              rows={filteredEquipment}
              getRowId={(row) => row.id}
              onRowClick={handleViewDetails}
              emptyMessage={t('equipment.noEquipmentFound')}
            />
          </Box>
        </Box>
      </Card>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, borderRadius: '16px 0 0 16px' } }}
      >
        {selectedEquipment && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>{t('equipment.details')}</Typography>
              <IconButton onClick={handleCloseDrawer} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BuildIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{selectedEquipment.name}</Typography>
                  <StatusBadge status={selectedEquipment.status} />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('common.details')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
                mb: 3,
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.type')}</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedEquipment.equipmentType || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.manufacturer')}</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedEquipment.manufacturer || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.model')}</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedEquipment.modelNumber || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.serialNumber')}</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedEquipment.serialNumber || '-'}</Typography>
              </Box>
              {selectedEquipment.notes && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" color="text.secondary">{t('common.notes')}</Typography>
                  <Typography variant="body2">{selectedEquipment.notes}</Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('equipment.documents')}
            </Typography>
            {filesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filesError ? (
              <Typography color="error" variant="body2">{filesError}</Typography>
            ) : files.length === 0 ? (
              <Box sx={{ py: 2, px: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">{t('equipment.noDocumentsAttached')}</Typography>
              </Box>
            ) : (
              <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
                {files.map((file) => (
                  <ListItem key={file.id}>
                    <ListItemIcon><DescriptionIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>{file.filename}</Typography>}
                      secondary={`${file.fileType.toUpperCase()} - ${formatFileSize(file.fileSize)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            <Button variant="tertiary" size="small" icon={<AddIcon />} sx={{ mt: 1 }}>
              {t('equipment.addDocument')}
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('equipment.approvalTimeline')}
            </Typography>
            <ApprovalStepper status={selectedEquipment.status as 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'} />

            <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              {selectedEquipment.status === 'draft' && (
                <Button
                  variant="primary"
                  icon={submitting ? undefined : <SendIcon />}
                  loading={submitting}
                  fullWidth
                  onClick={handleSubmitForApproval}
                >
                  {t('equipment.submitForApproval')}
                </Button>
              )}
              <Button variant="secondary" fullWidth onClick={() => handleOpenEdit(selectedEquipment)}>
                {t('equipment.editEquipment')}
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveEquipment}
        title={editingEquipment ? t('equipment.editEquipmentTitle') : t('equipment.addNewEquipment')}
        submitLabel={editingEquipment ? t('common.saveChanges') : t('equipment.addEquipment')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('equipment.equipmentName')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name || formData.name.length >= VALIDATION.MAX_NAME_LENGTH}
            helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <MuiTextField
            fullWidth
            select
            label={t('equipment.type')}
            value={formData.equipmentType}
            onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
          >
            <MenuItem value="">Select type...</MenuItem>
            {equipmentTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
          </MuiTextField>
          <TextField
            fullWidth
            label={t('equipment.manufacturer')}
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label={t('equipment.model')}
              value={formData.modelNumber}
              onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
            />
            <TextField
              fullWidth
              label={t('equipment.serialNumber')}
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              error={!!errors.serialNumber}
              helperText={errors.serialNumber}
            />
          </Box>
          <TextField
            fullWidth
            label={t('common.notes')}
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            error={!!errors.notes || formData.notes.length >= VALIDATION.MAX_NOTES_LENGTH}
            helperText={errors.notes || (formData.notes.length > 0 ? `${formData.notes.length}/${VALIDATION.MAX_NOTES_LENGTH}` : undefined)}
          />
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('equipment.deleteConfirmation')}
        message={t('equipment.deleteConfirmationMessage', { name: equipmentToDelete?.name })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </Box>
  )
}
