import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
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
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Collapse from '@mui/material/Collapse'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonIcon from '@mui/icons-material/Person'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { ApprovalStepper } from '../components/ui/Stepper'
import { materialsApi } from '../api/materials'
import { materialTemplatesApi, type MaterialTemplate } from '../api/materialTemplates'
import { filesApi } from '../api/files'
import { formatFileSize } from '../utils/fileUtils'
import type { Material } from '../types'
import type { FileRecord } from '../api/files'
import { validateMaterialForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../components/ui/EmptyState'

const unitOptions = ['ton', 'm3', 'm2', 'm', 'kg', 'unit', 'box', 'pallet', 'roll']

export default function MaterialsPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialTemplates, setMaterialTemplates] = useState<MaterialTemplate[]>([])
  const [search, setSearch] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [activeTab, setActiveTab] = useState('all')
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    manufacturer: '',
    modelNumber: '',
    quantity: '',
    unit: '',
    expectedDelivery: '',
    storageLocation: '',
    notes: ''
  })
  const [specificationValues, setSpecificationValues] = useState<Record<string, string | number | boolean>>({})
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({})
  const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({})
  const [files, setFiles] = useState<FileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const selectedTemplate = useMemo(() => {
    return materialTemplates.find(t => t.id === formData.templateId) || null
  }, [materialTemplates, formData.templateId])

  useEffect(() => {
    loadMaterials()
    loadTemplates()
  }, [projectId])

  const loadTemplates = async () => {
    try {
      const templates = await materialTemplatesApi.list()
      setMaterialTemplates(templates)
    } catch {
      console.error('Failed to load material templates')
    }
  }

  useEffect(() => {
    const loadFiles = async () => {
      if (!drawerOpen || !selectedMaterial || !projectId) {
        setFiles([])
        setFilesError(null)
        return
      }
      try {
        setFilesLoading(true)
        setFilesError(null)
        const data = await filesApi.list(projectId, 'material', selectedMaterial.id)
        setFiles(data)
      } catch {
        setFilesError(t('materials.failedToLoadFiles'))
      } finally {
        setFilesLoading(false)
      }
    }
    loadFiles()
  }, [drawerOpen, selectedMaterial, projectId])

  const loadMaterials = async () => {
    try {
      setLoading(true)
      const data = await materialsApi.list(projectId!)
      setMaterials(data)
    } catch {
      showError(t('materials.failedToLoadMaterials'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', templateId: '', manufacturer: '', modelNumber: '', quantity: '', unit: '', expectedDelivery: '', storageLocation: '', notes: '' })
    setSpecificationValues({})
    setDocumentFiles({})
    setChecklistResponses({})
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

  const handleOpenEdit = (material: Material, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingMaterial(material)
    const matchingTemplate = materialTemplates.find(t => t.name_he === material.materialType)
    setFormData({
      name: material.name,
      templateId: matchingTemplate?.id || '',
      manufacturer: material.manufacturer || '',
      modelNumber: material.modelNumber || '',
      quantity: material.quantity?.toString() || '',
      unit: material.unit || '',
      expectedDelivery: material.expectedDelivery || '',
      storageLocation: material.storageLocation || '',
      notes: material.notes || ''
    })
    setSpecificationValues({})
    setDocumentFiles({})
    setChecklistResponses({})
    setErrors({})
    setDialogOpen(true)
    setDrawerOpen(false)
  }

  const handleSaveMaterial = async () => {
    if (!projectId) return
    const validationErrors = validateMaterialForm({
      name: formData.name,
      notes: formData.notes,
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        material_type: selectedTemplate?.name_he || undefined,
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
        showSuccess(t('materials.materialUpdatedSuccessfully'))
      } else {
        await materialsApi.create(projectId, payload)
        showSuccess(t('materials.materialCreatedSuccessfully'))
      }
      handleCloseDialog()
      loadMaterials()
    } catch {
      showError(editingMaterial ? t('materials.failedToUpdateMaterial') : t('materials.failedToCreateMaterial'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (material: Material, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setMaterialToDelete(material)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectId || !materialToDelete) return
    try {
      await materialsApi.delete(projectId, materialToDelete.id)
      showSuccess(t('materials.materialDeletedSuccessfully'))
      setDeleteDialogOpen(false)
      setMaterialToDelete(null)
      setDrawerOpen(false)
      loadMaterials()
    } catch {
      showError(t('materials.failedToDeleteMaterial'))
    }
  }

  const handleSubmitForApproval = async () => {
    if (!projectId || !selectedMaterial) return
    setSubmitting(true)
    try {
      await materialsApi.submit(projectId, selectedMaterial.id)
      showSuccess(t('materials.materialSubmittedSuccessfully'))
      loadMaterials()
      setDrawerOpen(false)
    } catch {
      showError(t('materials.failedToSubmitMaterial'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async () => {
    if (!projectId || !selectedMaterial) return
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        await filesApi.upload(projectId, 'material', selectedMaterial.id, file)
        const data = await filesApi.list(projectId, 'material', selectedMaterial.id)
        setFiles(data)
        showSuccess(t('materials.fileUploadedSuccessfully'))
      } catch {
        showError(t('materials.failedToUploadFile'))
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleViewDetails = (material: Material) => {
    setSelectedMaterial(material)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedMaterial(null)
  }

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.materialType?.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'pending' ? (m.status === 'submitted' || m.status === 'under_review') : m.status === activeTab)
    return matchesSearch && matchesTab
  })

  const pendingMaterials = materials.filter(m => m.status === 'submitted' || m.status === 'under_review').length
  const approvedMaterials = materials.filter(m => m.status === 'approved').length
  const totalQuantity = materials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0)

  const columns: Column<Material>[] = [
    {
      id: 'name',
      label: t('materials.title'),
      minWidth: 250,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'warning.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <InventoryIcon sx={{ fontSize: 20, color: 'warning.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.materialType || t('materials.noTypeSpecified')}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'manufacturer',
      label: t('materials.manufacturer'),
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" color={row.manufacturer ? 'text.primary' : 'text.secondary'}>
          {row.manufacturer || '-'}
        </Typography>
      ),
    },
    {
      id: 'quantity',
      label: t('materials.quantity'),
      minWidth: 120,
      render: (row) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {row.quantity ? `${Number(row.quantity).toLocaleString()} ${row.unit || ''}` : '-'}
          </Typography>
          {row.storageLocation && (
            <Typography variant="caption" color="text.secondary">
              {row.storageLocation}
            </Typography>
          )}
        </Box>
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
            title={t('common.details')}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => handleOpenEdit(row, e)}
            title={t('materials.editMaterial')}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
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
        title={t('materials.title')}
        subtitle={t('materials.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('materials.title') }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            {t('materials.addMaterial')}
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
          title={t('materials.totalMaterials')}
          value={materials.length}
          icon={<InventoryIcon />}
          color="warning"
        />
        <KPICard
          title={t('materials.pendingApproval')}
          value={pendingMaterials}
          icon={<LocalShippingIcon />}
          color="info"
        />
        <KPICard
          title={t('materials.approved')}
          value={approvedMaterials}
          icon={<CheckCircleIcon />}
          color="success"
        />
        <KPICard
          title={t('materials.totalQuantity')}
          value={totalQuantity.toLocaleString()}
          icon={<WarehouseIcon />}
          color="primary"
        />
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <SearchField
              placeholder={t('materials.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Chip label={`${filteredMaterials.length} ${t('common.items')}`} size="small" />
          </Box>

          <Tabs
            items={[
              { label: t('common.all'), value: 'all', badge: materials.length },
              { label: t('materials.draft'), value: 'draft', badge: materials.filter(m => m.status === 'draft').length },
              { label: t('materials.pending'), value: 'pending', badge: pendingMaterials },
              { label: t('materials.approved'), value: 'approved', badge: approvedMaterials },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="small"
          />

          <Box sx={{ mt: 2 }}>
            {filteredMaterials.length === 0 ? (
              <EmptyState
                variant="no-results"
                title={t('materials.noMaterialsFound')}
                description={t('materials.noResultsDescription')}
                action={{ label: t('materials.addMaterial'), onClick: handleOpenCreate }}
              />
            ) : (
              <DataTable
                columns={columns}
                rows={filteredMaterials}
                getRowId={(row) => row.id}
                onRowClick={handleViewDetails}
                emptyMessage={t('materials.noMaterialsFound')}
              />
            )}
          </Box>
        </Box>
      </Card>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, borderRadius: '16px 0 0 16px' } }}
      >
        {selectedMaterial && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>{t('materials.details')}</Typography>
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
                    bgcolor: 'warning.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <InventoryIcon sx={{ fontSize: 28, color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{selectedMaterial.name}</Typography>
                  <StatusBadge status={selectedMaterial.status} />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('materials.details')}
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
                <Typography variant="caption" color="text.secondary">{t('materials.type')}</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedMaterial.materialType || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('materials.manufacturer')}</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedMaterial.manufacturer || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('materials.model')}</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedMaterial.modelNumber || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('materials.quantity')}</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {selectedMaterial.quantity ? `${Number(selectedMaterial.quantity).toLocaleString()} ${selectedMaterial.unit || ''}` : '-'}
                </Typography>
              </Box>
              {selectedMaterial.expectedDelivery && (
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('materials.deliveryDate')}</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {new Date(selectedMaterial.expectedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                </Box>
              )}
              {selectedMaterial.storageLocation && (
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('materials.storageLocation')}</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedMaterial.storageLocation}</Typography>
                </Box>
              )}
              {selectedMaterial.notes && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" color="text.secondary">{t('common.notes')}</Typography>
                  <Typography variant="body2">{selectedMaterial.notes}</Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('materials.documents')}
            </Typography>
            {filesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filesError ? (
              <Typography color="error" variant="body2">{filesError}</Typography>
            ) : files.length === 0 ? (
              <Box sx={{ py: 2, px: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">{t('materials.noDocumentsAttached')}</Typography>
              </Box>
            ) : (
              <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
                {files.map((file) => (
                  <ListItem
                    key={file.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        title={t('buttons.download')}
                        onClick={async () => {
                          try {
                            const blobUrl = await filesApi.getFileBlob(projectId!, file.id)
                            const link = document.createElement('a')
                            link.href = blobUrl
                            link.download = file.filename
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            URL.revokeObjectURL(blobUrl)
                          } catch {
                            showError(t('materials.failedToDownloadFile'))
                          }
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' }, borderRadius: 1 }}
                    onClick={async () => {
                      try {
                        const blobUrl = await filesApi.getFileBlob(projectId!, file.id)
                        window.open(blobUrl, '_blank')
                      } catch {
                        showError(t('materials.failedToOpenFile'))
                      }
                    }}
                  >
                    <ListItemIcon><DescriptionIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>{file.filename}</Typography>}
                      secondary={`${file.fileType.toUpperCase()} - ${formatFileSize(file.fileSize)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            <Button
              variant="tertiary"
              size="small"
              icon={uploading ? undefined : <CloudUploadIcon />}
              loading={uploading}
              sx={{ mt: 1 }}
              onClick={handleFileUpload}
            >
              {t('materials.uploadDocument')}
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('materials.approvalTimeline')}
            </Typography>
            <ApprovalStepper status={selectedMaterial.status as 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'} />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              {selectedMaterial.status === 'draft' && (
                <Button
                  variant="primary"
                  icon={submitting ? undefined : <SendIcon />}
                  loading={submitting}
                  fullWidth
                  onClick={handleSubmitForApproval}
                >
                  {t('materials.submitForApproval')}
                </Button>
              )}
              <Button variant="secondary" fullWidth onClick={() => handleOpenEdit(selectedMaterial)}>
                {t('materials.editMaterial')}
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Create/Edit Form Modal */}
      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveMaterial}
        title={editingMaterial ? t('materials.editMaterialTitle') : t('materials.addNewMaterial')}
        submitLabel={editingMaterial ? t('common.saveChanges') : t('materials.addMaterial')}
        loading={saving}
        maxWidth="md"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('materials.materialName')}
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
            label={t('materials.type')}
            value={formData.templateId}
            onChange={(e) => {
              setFormData({ ...formData, templateId: e.target.value })
              setSpecificationValues({})
              setDocumentFiles({})
              setChecklistResponses({})
            }}
          >
            <MenuItem value="">{t('materials.selectTemplate')}</MenuItem>
            {materialTemplates.map(template => (
              <MenuItem key={template.id} value={template.id}>
                {template.name_he} ({template.category})
              </MenuItem>
            ))}
          </MuiTextField>

          <Collapse in={!!selectedTemplate}>
            {selectedTemplate && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedTemplate.required_specifications?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon fontSize="small" color="primary" />
                      {t('materials.specifications')}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                      {selectedTemplate.required_specifications.map((spec) => (
                        <Box key={spec.name}>
                          {spec.field_type === 'boolean' ? (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={!!specificationValues[spec.name]}
                                  onChange={(e) => setSpecificationValues({ ...specificationValues, [spec.name]: e.target.checked })}
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  {spec.name_he}
                                  {spec.required && <span style={{ color: 'red' }}> *</span>}
                                </Typography>
                              }
                            />
                          ) : spec.field_type === 'select' ? (
                            <MuiTextField
                              fullWidth
                              select
                              size="small"
                              label={spec.name_he}
                              required={spec.required}
                              value={specificationValues[spec.name] || ''}
                              onChange={(e) => setSpecificationValues({ ...specificationValues, [spec.name]: e.target.value })}
                            >
                              <MenuItem value="">{t('common.select')}</MenuItem>
                              {spec.options?.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                              ))}
                            </MuiTextField>
                          ) : (
                            <TextField
                              fullWidth
                              size="small"
                              type={spec.field_type === 'number' ? 'number' : 'text'}
                              label={`${spec.name_he}${spec.unit ? ` (${spec.unit})` : ''}`}
                              required={spec.required}
                              value={specificationValues[spec.name] || ''}
                              onChange={(e) => setSpecificationValues({ ...specificationValues, [spec.name]: e.target.value })}
                            />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {selectedTemplate.required_documents?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon fontSize="small" color="primary" />
                      {t('materials.requiredDocuments')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                      {selectedTemplate.required_documents.map((doc) => (
                        <Box key={doc.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {doc.name_he}
                              {doc.required && <Chip label={t('common.required')} size="small" color="error" sx={{ ml: 1, height: 20 }} />}
                            </Typography>
                            {doc.description && (
                              <Typography variant="caption" color="text.secondary">{doc.description}</Typography>
                            )}
                            <Typography variant="caption" display="block" color="text.secondary">
                              <PersonIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                              {t(`materials.source.${doc.source}`)}
                            </Typography>
                          </Box>
                          <Box>
                            {documentFiles[doc.name] ? (
                              <Chip
                                icon={<CheckCircleIcon />}
                                label={documentFiles[doc.name]?.name}
                                color="success"
                                size="small"
                                onDelete={() => setDocumentFiles({ ...documentFiles, [doc.name]: null })}
                              />
                            ) : (
                              <Button
                                variant="secondary"
                                size="small"
                                icon={<CloudUploadIcon />}
                                onClick={() => {
                                  const input = document.createElement('input')
                                  input.type = 'file'
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0]
                                    if (file) setDocumentFiles({ ...documentFiles, [doc.name]: file })
                                  }
                                  input.click()
                                }}
                              >
                                {t('common.upload')}
                              </Button>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {selectedTemplate.submission_checklist?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon fontSize="small" color="primary" />
                      {t('materials.checklist')}
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                      {selectedTemplate.submission_checklist.map((item) => (
                        <FormControlLabel
                          key={item.name}
                          sx={{ display: 'flex', mb: 1 }}
                          control={
                            <Checkbox
                              checked={!!checklistResponses[item.name]}
                              onChange={(e) => setChecklistResponses({ ...checklistResponses, [item.name]: e.target.checked })}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">{item.name_he}</Typography>
                              {item.requires_file && (
                                <Typography variant="caption" color="text.secondary">
                                  ({t('materials.requiresFile')})
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Collapse>

          <Divider sx={{ my: 1 }} />

          <TextField
            fullWidth
            label={t('materials.manufacturer')}
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
          />
          <TextField
            fullWidth
            label={t('materials.model')}
            value={formData.modelNumber}
            onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label={t('materials.quantity')}
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              error={!!errors.quantity}
              helperText={errors.quantity}
              inputProps={{ min: 0 }}
            />
            <MuiTextField
              fullWidth
              select
              label={t('materials.unit')}
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            >
              <MenuItem value="">{t('materials.selectUnit')}</MenuItem>
              {unitOptions.map(unit => <MenuItem key={unit} value={unit}>{unit}</MenuItem>)}
            </MuiTextField>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label={t('materials.deliveryDate')}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.expectedDelivery}
              onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
            />
            <TextField
              fullWidth
              label={t('materials.storageLocation')}
              value={formData.storageLocation}
              onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
            />
          </Box>
          <TextField
            fullWidth
            label={t('common.notes')}
            multiline
            rows={2}
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
        title={t('materials.deleteConfirmation')}
        message={t('materials.deleteConfirmationMessage', { name: materialToDelete?.name })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </Box>
  )
}
