import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import { ConfirmModal } from '../components/ui/Modal'
import SummaryBar from '../components/ui/SummaryBar'
import FilterChips from '../components/ui/FilterChips'
import EquipmentCardList from '../components/equipment/EquipmentCardList'
import EquipmentDrawer from '../components/equipment/EquipmentDrawer'
import EquipmentFormModal from '../components/equipment/EquipmentFormModal'
import ContactSelectorDialog from '../components/ui/ContactSelectorDialog'
import HelpTooltip from '../components/help/HelpTooltip'
import { equipmentApi } from '../api/equipment'
import { filesApi } from '../api/files'
import type { Equipment } from '../types'
import { validateEquipmentForm, hasErrors, type ValidationError } from '../utils/validation'
import { parseValidationErrors } from '../utils/apiErrors'
import { useToast } from '../components/common/ToastProvider'
import { useReferenceData } from '../contexts/ReferenceDataContext'
import type { KeyValuePair } from '../components/ui/KeyValueEditor'
import { AddIcon, BuildIcon, EditIcon, DeleteIcon, VisibilityIcon } from '@/icons'
import { Box, Typography, IconButton, TablePagination, useMediaQuery, useTheme } from '@/mui'

export default function EquipmentPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const { equipmentTemplates } = useReferenceData()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [totalEquipment, setTotalEquipment] = useState(0)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [activeTab, setActiveTab] = useState('all')
  const [formData, setFormData] = useState({ name: '', templateId: '', manufacturer: '', modelNumber: '', serialNumber: '', notes: '' })
  const [specificationValues, setSpecificationValues] = useState<Record<string, string | number | boolean>>({})
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({})
  const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({})
  const [customFields, setCustomFields] = useState<KeyValuePair[]>([])
  const [contactDialogOpen, setContactDialogOpen] = useState(false)

  const selectedTemplate = useMemo(() => {
    return equipmentTemplates.find(t => t.id === formData.templateId) || null
  }, [equipmentTemplates, formData.templateId])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { loadEquipment() }, [projectId, page, rowsPerPage, activeTab, debouncedSearch])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const params: { status?: string; search?: string; page: number; pageSize: number } = { page, pageSize: rowsPerPage }
      if (activeTab !== 'all') params.status = activeTab
      if (debouncedSearch) params.search = debouncedSearch
      const result = await equipmentApi.list(projectId!, params)
      setEquipment(result.items)
      setTotalEquipment(result.total)
    } catch {
      showError(t('equipment.failedToLoadEquipment'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', templateId: '', manufacturer: '', modelNumber: '', serialNumber: '', notes: '' })
    setSpecificationValues({}); setDocumentFiles({}); setChecklistResponses({}); setCustomFields([]); setErrors({}); setEditingEquipment(null)
  }

  const handleOpenCreate = () => { resetForm(); setDialogOpen(true) }

  const handleOpenEdit = (eq: Equipment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingEquipment(eq)
    const matchingTemplate = equipmentTemplates.find(t => t.name_he === eq.equipmentType) || equipmentTemplates.find(t => t.name === eq.equipmentType)
    setFormData({ name: eq.name, templateId: matchingTemplate?.id || '', manufacturer: eq.manufacturer || '', modelNumber: eq.modelNumber || '', serialNumber: eq.serialNumber || '', notes: eq.notes || '' })
    setDocumentFiles({}); setChecklistResponses({})
    const existingSpecs = eq.specifications || {}
    const templateSpecKeys = new Set(matchingTemplate?.required_specifications?.map(s => s.name) || [])
    const templateValues: Record<string, string | number | boolean> = {}
    const customEntries: KeyValuePair[] = []
    Object.entries(existingSpecs).forEach(([key, value]) => {
      if (templateSpecKeys.has(key)) { templateValues[key] = value as string | number | boolean }
      else { customEntries.push({ key, value: value as string | number | boolean, type: typeof value === 'number' ? 'number' as const : typeof value === 'boolean' ? 'boolean' as const : 'text' as const }) }
    })
    setSpecificationValues(templateValues); setCustomFields(customEntries); setErrors({}); setDialogOpen(true); setDrawerOpen(false)
  }

  const handleSaveEquipment = async () => {
    if (!projectId) return
    const validationErrors = validateEquipmentForm({ name: formData.name, notes: formData.notes, serialNumber: formData.serialNumber, equipmentType: selectedTemplate?.name_he || '', manufacturer: formData.manufacturer, modelNumber: formData.modelNumber })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return
    setSaving(true)
    try {
      const specs: Record<string, unknown> = { ...specificationValues }
      customFields.forEach(f => { specs[f.key] = f.value })
      const payload = { name: formData.name, equipment_type: selectedTemplate?.name_he || undefined, manufacturer: formData.manufacturer || undefined, model_number: formData.modelNumber || undefined, serial_number: formData.serialNumber || undefined, specifications: Object.keys(specs).length > 0 ? specs : undefined, notes: formData.notes || undefined }
      let entityId: string
      if (editingEquipment) {
        const updated = await withMinDuration(equipmentApi.update(projectId, editingEquipment.id, payload))
        entityId = updated.id; showSuccess(t('equipment.equipmentUpdatedSuccessfully'))
      } else {
        const created = await withMinDuration(equipmentApi.create(projectId, payload))
        entityId = created.id; showSuccess(t('equipment.equipmentCreatedSuccessfully'))
      }
      const filesToUpload = Object.values(documentFiles).filter((f): f is File => f !== null)
      if (filesToUpload.length > 0) await Promise.all(filesToUpload.map(file => filesApi.upload(projectId, 'equipment', entityId, file)))
      setDialogOpen(false); resetForm(); loadEquipment()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) { setErrors(prev => ({ ...prev, ...serverErrors })); showError(t('validation.checkFields')); return }
      showError(editingEquipment ? t('equipment.failedToUpdateEquipment') : t('equipment.failedToCreateEquipment'))
    } finally { setSaving(false) }
  }

  const handleDeleteClick = (eq: Equipment, e: React.MouseEvent) => { e.stopPropagation(); setEquipmentToDelete(eq); setDeleteDialogOpen(true) }

  const handleConfirmDelete = async () => {
    if (!projectId || !equipmentToDelete) return
    setDeleting(true)
    try {
      await withMinDuration(equipmentApi.delete(projectId, equipmentToDelete.id))
      showSuccess(t('equipment.equipmentDeletedSuccessfully'))
      setDeleteDialogOpen(false); setEquipmentToDelete(null); setDrawerOpen(false); loadEquipment()
    } catch { showError(t('equipment.failedToDeleteEquipment')) } finally { setDeleting(false) }
  }

  const handleSubmitForApproval = () => { if (projectId && selectedEquipment) setContactDialogOpen(true) }

  const handleConfirmSubmit = async (consultantContactId?: string, inspectorContactId?: string) => {
    if (!projectId || !selectedEquipment) return
    setSubmitting(true); setContactDialogOpen(false); setDrawerOpen(false)
    try {
      const body: { consultant_contact_id?: string; inspector_contact_id?: string } = {}
      if (consultantContactId) body.consultant_contact_id = consultantContactId
      if (inspectorContactId) body.inspector_contact_id = inspectorContactId
      await equipmentApi.submit(projectId, selectedEquipment.id, body)
      showSuccess(t('equipment.equipmentSubmittedSuccessfully')); loadEquipment()
    } catch { showError(t('equipment.failedToSubmitEquipment')) } finally { setSubmitting(false) }
  }

  const handleViewDetails = (eq: Equipment) => { setSelectedEquipment(eq); setDrawerOpen(true) }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    equipment.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1 })
    return counts
  }, [equipment])

  const columns: Column<Equipment>[] = [
    { id: 'name', label: t('equipment.title'), minWidth: 250, render: (row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BuildIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={500}>{row.name}</Typography>
          <Typography variant="caption" color="text.secondary">{row.equipmentType || t('equipment.noTypeSpecified')}</Typography>
        </Box>
      </Box>
    )},
    { id: 'manufacturer', label: t('equipment.manufacturer'), minWidth: 140, hideOnMobile: true, render: (row) => <Typography variant="body2" color={row.manufacturer ? 'text.primary' : 'text.secondary'}>{row.manufacturer || '-'}</Typography> },
    { id: 'modelNumber', label: t('equipment.model'), minWidth: 120, hideOnMobile: true, render: (row) => <Typography variant="body2" color={row.modelNumber ? 'text.primary' : 'text.secondary'}>{row.modelNumber || '-'}</Typography> },
    { id: 'status', label: t('common.status'), minWidth: 130, render: (row) => <StatusBadge status={row.status} /> },
    { id: 'actions', label: '', minWidth: 140, align: 'right', hideOnMobile: true, render: (row) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewDetails(row) }}><VisibilityIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={(e) => handleOpenEdit(row, e)}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={(e) => handleDeleteClick(row, e)} color="error"><DeleteIcon fontSize="small" /></IconButton>
      </Box>
    )},
  ]

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <PageHeader
          title={t('equipment.title')}
          subtitle={t('equipment.subtitle')}
          breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('equipment.title') }]}
          actions={<Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>{t('equipment.addEquipment')}</Button>}
        />
        <HelpTooltip helpKey="help.tooltips.equipmentForm" />
      </Box>

      <Box sx={{ mb: 2 }}>
        <SummaryBar items={[
          { label: t('common.items'), value: totalEquipment },
          { label: t('equipment.draft'), value: statusCounts['draft'] || 0 },
          { label: t('equipment.approved'), value: statusCounts['approved'] || 0, color: theme.palette.success.main },
        ]} />
      </Box>

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <SearchField
              placeholder={t('equipment.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <FilterChips
              items={[
                { label: t('common.all'), value: 'all' },
                { label: t('equipment.draft'), value: 'draft' },
                { label: t('equipment.submitted'), value: 'submitted' },
                { label: t('equipment.underReview'), value: 'under_review' },
                { label: t('equipment.approved'), value: 'approved' },
                { label: t('equipment.rejected'), value: 'rejected' },
                { label: t('equipment.revisionRequested'), value: 'revision_requested' },
              ]}
              value={activeTab}
              onChange={(val) => { setActiveTab(val); setPage(1) }}
            />
          </Box>

          {isMobile ? (
            <EquipmentCardList equipment={equipment} loading={loading} onView={handleViewDetails} onEdit={handleOpenEdit} onDelete={handleDeleteClick} onAdd={handleOpenCreate} />
          ) : (
            <DataTable columns={columns} rows={equipment} getRowId={(row) => row.id} onRowClick={handleViewDetails} emptyMessage={t('equipment.noEquipmentFound')} pagination={false} />
          )}

          {totalEquipment > 0 && (
            <TablePagination
              component="div"
              count={totalEquipment}
              page={page - 1}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(1) }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage={t('table.rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('table.of')} ${count !== -1 ? count : `>${to}`}`}
              getItemAriaLabel={(type) => type === 'next' ? t('table.goToNextPage') : t('table.goToPreviousPage')}
            />
          )}
        </Box>
      </Card>

      <EquipmentDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedEquipment(null) }}
        equipment={selectedEquipment}
        projectId={projectId!}
        onEdit={(eq) => handleOpenEdit(eq)}
        onSubmitForApproval={handleSubmitForApproval}
        submitting={submitting}
      />

      <EquipmentFormModal
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); resetForm() }}
        onSubmit={handleSaveEquipment}
        saving={saving}
        editing={!!editingEquipment}
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        templates={equipmentTemplates}
        selectedTemplate={selectedTemplate}
        specificationValues={specificationValues}
        setSpecificationValues={setSpecificationValues}
        documentFiles={documentFiles}
        setDocumentFiles={setDocumentFiles}
        checklistResponses={checklistResponses}
        setChecklistResponses={setChecklistResponses}
        customFields={customFields}
        setCustomFields={setCustomFields}
      />

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('equipment.deleteConfirmation')}
        message={t('equipment.deleteConfirmationMessage', { name: equipmentToDelete?.name })}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deleting}
      />

      <ContactSelectorDialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} onConfirm={handleConfirmSubmit} projectId={projectId!} loading={submitting} />
    </Box>
  )
}
