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
import Alert from '@mui/material/Alert'
import Collapse from '@mui/material/Collapse'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import SendIcon from '@mui/icons-material/Send'
import BuildIcon from '@mui/icons-material/Build'
import FilterListIcon from '@mui/icons-material/FilterList'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonIcon from '@mui/icons-material/Person'
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
import { equipmentTemplatesApi, type EquipmentTemplate } from '../api/equipmentTemplates'
import { filesApi } from '../api/files'
import { formatFileSize } from '../utils/fileUtils'
import type { Equipment } from '../types'
import type { FileRecord } from '../api/files'
import { validateEquipmentForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { useToast } from '../components/common/ToastProvider'
import { useTranslation } from 'react-i18next'

export default function EquipmentPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [equipmentTemplates, setEquipmentTemplates] = useState<EquipmentTemplate[]>([])
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
    templateId: '',
    manufacturer: '',
    modelNumber: '',
    serialNumber: '',
    notes: ''
  })
  const [specificationValues, setSpecificationValues] = useState<Record<string, string | number | boolean>>({})
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({})
  const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({})
  const [files, setFiles] = useState<FileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  const selectedTemplate = useMemo(() => {
    return equipmentTemplates.find(t => t.id === formData.templateId) || null
  }, [equipmentTemplates, formData.templateId])

  useEffect(() => {
    loadEquipment()
    loadTemplates()
  }, [projectId])

  const loadTemplates = async () => {
    try {
      const templates = await equipmentTemplatesApi.list()
      setEquipmentTemplates(templates)
    } catch {
      console.error('Failed to load equipment templates')
    }
  }

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
      showError('Failed to load equipment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', templateId: '', manufacturer: '', modelNumber: '', serialNumber: '', notes: '' })
    setSpecificationValues({})
    setDocumentFiles({})
    setChecklistResponses({})
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
    const matchingTemplate = equipmentTemplates.find(t => t.name_he === eq.equipmentType)
    setFormData({
      name: eq.name,
      templateId: matchingTemplate?.id || '',
      manufacturer: eq.manufacturer || '',
      modelNumber: eq.modelNumber || '',
      serialNumber: eq.serialNumber || '',
      notes: eq.notes || ''
    })
    setSpecificationValues({})
    setDocumentFiles({})
    setChecklistResponses({})
    setErrors({})
    setDialogOpen(true)
    setDrawerOpen(false)
  }

  const handleSaveEquipment = async () => {
    if (!projectId) return
    const validationData = {
      ...formData,
      equipmentType: selectedTemplate?.name_he || ''
    }
    const validationErrors = validateEquipmentForm(validationData)
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        equipment_type: selectedTemplate?.name_he || undefined,
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
      showSuccess('Equipment deleted successfully!')
      setDeleteDialogOpen(false)
      setEquipmentToDelete(null)
      setDrawerOpen(false)
      loadEquipment()
    } catch {
      showError('Failed to delete equipment. Please try again.')
    }
  }

  const handleSubmitForApproval = async () => {
    if (!projectId || !selectedEquipment) return
    setSubmitting(true)
    try {
      await equipmentApi.submit(projectId, selectedEquipment.id)
      showSuccess('Equipment submitted for approval!')
      loadEquipment()
      setDrawerOpen(false)
    } catch {
      showError('Failed to submit equipment for approval. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEquipment = equipment.filter(e => {
    if (activeTab !== 'all') {
      if (activeTab === 'under_review') {
        if (e.status !== 'submitted' && e.status !== 'under_review') return false
      } else if (e.status !== activeTab) {
        return false
      }
    }
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
      label: 'Equipment',
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
              {row.equipmentType || 'No type specified'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'manufacturer',
      label: 'Manufacturer',
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" color={row.manufacturer ? 'text.primary' : 'text.secondary'}>
          {row.manufacturer || '-'}
        </Typography>
      ),
    },
    {
      id: 'modelNumber',
      label: 'Model',
      minWidth: 120,
      render: (row) => (
        <Typography variant="body2" color={row.modelNumber ? 'text.primary' : 'text.secondary'}>
          {row.modelNumber || '-'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
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
            title="View details"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => handleOpenEdit(row, e)}
            title="Edit equipment"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => handleDeleteClick(row, e)}
            title="Delete equipment"
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
        title="Equipment"
        subtitle="Manage and track all equipment items"
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Equipment' }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            Add Equipment
          </Button>
        }
      />

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <SearchField
              placeholder="Search equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Chip label={t('equipment.itemCount', { count: filteredEquipment.length })} size="small" />
          </Box>

          <Tabs
            items={[
              { label: t('common.all'), value: 'all', badge: equipment.length },
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
              emptyMessage="No equipment found"
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
              <Typography variant="h6" fontWeight={600}>Equipment Details</Typography>
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
              Details
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
                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedEquipment.equipmentType || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Manufacturer</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedEquipment.manufacturer || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Model</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedEquipment.modelNumber || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedEquipment.serialNumber || '-'}</Typography>
              </Box>
              {selectedEquipment.notes && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" color="text.secondary">Notes</Typography>
                  <Typography variant="body2">{selectedEquipment.notes}</Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              Documents
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
                  <ListItem
                    key={file.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        title="Download file"
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
                            showError('Failed to download file')
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
                        showError('Failed to open file')
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
            <Button variant="tertiary" size="small" icon={<AddIcon />} sx={{ mt: 1 }}>
              Add Document
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              Approval Timeline
            </Typography>
            <ApprovalStepper status={selectedEquipment.status as 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'} />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              {selectedEquipment.status === 'draft' && (
                <Button
                  variant="primary"
                  icon={submitting ? undefined : <SendIcon />}
                  loading={submitting}
                  fullWidth
                  onClick={handleSubmitForApproval}
                >
                  Submit for Approval
                </Button>
              )}
              <Button variant="secondary" fullWidth onClick={() => handleOpenEdit(selectedEquipment)}>
                Edit Equipment
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveEquipment}
        title={editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
        submitLabel={editingEquipment ? 'Save Changes' : 'Add Equipment'}
        loading={saving}
        maxWidth="md"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Equipment Name"
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
            value={formData.templateId}
            onChange={(e) => {
              setFormData({ ...formData, templateId: e.target.value })
              setSpecificationValues({})
              setDocumentFiles({})
              setChecklistResponses({})
            }}
          >
            <MenuItem value="">{t('equipment.selectTemplate')}</MenuItem>
            {equipmentTemplates.map(template => (
              <MenuItem key={template.id} value={template.id}>
                {template.name_he} ({template.category})
              </MenuItem>
            ))}
          </MuiTextField>

          <Collapse in={!!selectedTemplate}>
            {selectedTemplate && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedTemplate.description && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    {selectedTemplate.description}
                  </Alert>
                )}

                {selectedTemplate.required_specifications?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon fontSize="small" color="primary" />
                      {t('equipment.specifications')}
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
                      {t('equipment.requiredDocuments')}
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
                              {t(`equipment.source.${doc.source}`)}
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
                      {t('equipment.checklist')}
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
                                  ({t('equipment.requiresFile')})
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
            label="Manufacturer"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label="Model Number"
              value={formData.modelNumber}
              onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
            />
            <TextField
              fullWidth
              label="Serial Number"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              error={!!errors.serialNumber}
              helperText={errors.serialNumber}
            />
          </Box>
          <TextField
            fullWidth
            label="Notes"
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
