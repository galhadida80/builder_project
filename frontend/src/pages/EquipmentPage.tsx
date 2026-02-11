import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
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
import type { EquipmentTemplate } from '../api/equipmentTemplates'
import { filesApi } from '../api/files'
import { formatFileSize } from '../utils/fileUtils'
import type { Equipment } from '../types'
import type { FileRecord } from '../api/files'
import { validateEquipmentForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'
import { parseValidationErrors } from '../utils/apiErrors'
import { useToast } from '../components/common/ToastProvider'
import { useTranslation } from 'react-i18next'
import TemplatePicker from '../components/ui/TemplatePicker'
import KeyValueEditor, { type KeyValuePair } from '../components/ui/KeyValueEditor'
import ContactSelectorDialog from '../components/ui/ContactSelectorDialog'
import { useReferenceData } from '../contexts/ReferenceDataContext'
import { AddIcon, VisibilityIcon, EditIcon, DeleteIcon, CloseIcon, DescriptionIcon, SendIcon, BuildIcon, FilterListIcon, CloudUploadIcon, DownloadIcon, CheckCircleIcon, PersonIcon } from '@/icons'
import { Box, Typography, Drawer, Divider, List, ListItem, ListItemText, ListItemIcon, MenuItem, TextField as MuiTextField, Skeleton, Chip, Checkbox, FormControlLabel, Alert, CircularProgress, IconButton } from '@/mui'

export default function EquipmentPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const { equipmentTemplates } = useReferenceData()
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
    templateId: '',
    manufacturer: '',
    modelNumber: '',
    serialNumber: '',
    notes: ''
  })
  const [specificationValues, setSpecificationValues] = useState<Record<string, string | number | boolean>>({})
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({})
  const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({})
  const [customFields, setCustomFields] = useState<KeyValuePair[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)

  const selectedTemplate = useMemo(() => {
    return equipmentTemplates.find(t => t.id === formData.templateId) || null
  }, [equipmentTemplates, formData.templateId])

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
        setFilesError(t('equipment.failedToLoadFiles'))
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
    setFormData({ name: '', templateId: '', manufacturer: '', modelNumber: '', serialNumber: '', notes: '' })
    setSpecificationValues({})
    setDocumentFiles({})
    setChecklistResponses({})
    setCustomFields([])
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
    setDocumentFiles({})
    setChecklistResponses({})
    const existingSpecs = eq.specifications || {}
    const templateSpecKeys = new Set(
      matchingTemplate?.required_specifications?.map(s => s.name) || []
    )
    const templateValues: Record<string, string | number | boolean> = {}
    const customEntries: KeyValuePair[] = []
    Object.entries(existingSpecs).forEach(([key, value]) => {
      if (templateSpecKeys.has(key)) {
        templateValues[key] = value as string | number | boolean
      } else {
        customEntries.push({
          key,
          value: value as string | number | boolean,
          type: typeof value === 'number' ? 'number' as const : typeof value === 'boolean' ? 'boolean' as const : 'text' as const,
        })
      }
    })
    setSpecificationValues(templateValues)
    setCustomFields(customEntries)
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
      const specs: Record<string, unknown> = { ...specificationValues }
      customFields.forEach(f => { specs[f.key] = f.value })
      const payload = {
        name: formData.name,
        equipment_type: selectedTemplate?.name_he || undefined,
        manufacturer: formData.manufacturer || undefined,
        model_number: formData.modelNumber || undefined,
        serial_number: formData.serialNumber || undefined,
        specifications: Object.keys(specs).length > 0 ? specs : undefined,
        notes: formData.notes || undefined
      }

      let entityId: string
      if (editingEquipment) {
        const updated = await equipmentApi.update(projectId, editingEquipment.id, payload)
        entityId = updated.id
        showSuccess(t('equipment.equipmentUpdatedSuccessfully'))
      } else {
        const created = await equipmentApi.create(projectId, payload)
        entityId = created.id
        showSuccess(t('equipment.equipmentCreatedSuccessfully'))
      }

      const filesToUpload = Object.values(documentFiles).filter((f): f is File => f !== null)
      if (filesToUpload.length > 0) {
        await Promise.all(filesToUpload.map(file => filesApi.upload(projectId, 'equipment', entityId, file)))
      }

      handleCloseDialog()
      loadEquipment()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...serverErrors }))
        showError(t('validation.checkFields'))
        return
      }
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

  const handleSubmitForApproval = () => {
    if (!projectId || !selectedEquipment) return
    setContactDialogOpen(true)
  }

  const handleConfirmSubmit = async (consultantContactId?: string, inspectorContactId?: string) => {
    if (!projectId || !selectedEquipment) return
    setSubmitting(true)
    try {
      const body: { consultant_contact_id?: string; inspector_contact_id?: string } = {}
      if (consultantContactId) body.consultant_contact_id = consultantContactId
      if (inspectorContactId) body.inspector_contact_id = inspectorContactId
      await equipmentApi.submit(projectId, selectedEquipment.id, body)
      showSuccess(t('equipment.equipmentSubmittedSuccessfully'))
      setContactDialogOpen(false)
      loadEquipment()
      setDrawerOpen(false)
    } catch {
      showError(t('equipment.failedToSubmitEquipment'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async () => {
    if (!projectId || !selectedEquipment) return
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        await filesApi.upload(projectId, 'equipment', selectedEquipment.id, file)
        const data = await filesApi.list(projectId, 'equipment', selectedEquipment.id)
        setFiles(data)
        showSuccess(t('equipment.fileUploadedSuccessfully'))
      } catch {
        showError(t('equipment.failedToUploadFile'))
      } finally {
        setUploading(false)
      }
    }
    input.click()
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
            title={t('common.details')}
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
            <SearchField
              placeholder={t('equipment.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Chip label={`${filteredEquipment.length} ${t('common.items')}`} size="small" />
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
              {t('equipment.details')}
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

            {selectedEquipment.specifications && Object.keys(selectedEquipment.specifications).length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                  {t('keyValueEditor.title')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(selectedEquipment.specifications).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  ))}
                </Box>
              </>
            )}

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
                            showError(t('equipment.failedToDownloadFile'))
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
                        showError(t('equipment.failedToOpenFile'))
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
              {t('equipment.addDocument')}
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('equipment.approvalTimeline')}
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
        submitLabel={editingEquipment ? t('common.save') : t('equipment.addEquipment')}
        loading={saving}
        maxWidth="md"
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
          <TemplatePicker
            templates={equipmentTemplates}
            value={selectedTemplate}
            onChange={(template) => {
              setFormData({ ...formData, templateId: template?.id || '' })
              setSpecificationValues({})
              setDocumentFiles({})
              setChecklistResponses({})
            }}
            label={t('equipment.type')}
            placeholder={t('equipment.selectTemplate')}
          />

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

          <Divider sx={{ my: 1 }} />

          <TextField
            fullWidth
            label={t('equipment.manufacturer')}
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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

          <Divider sx={{ my: 1 }} />

          <KeyValueEditor
            entries={customFields}
            onChange={setCustomFields}
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

      <ContactSelectorDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        onConfirm={handleConfirmSubmit}
        projectId={projectId!}
        loading={submitting}
      />
    </Box>
  )
}
