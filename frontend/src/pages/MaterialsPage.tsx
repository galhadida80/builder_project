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
import MaterialCardList from '../components/materials/MaterialCardList'
import MaterialDrawer from '../components/materials/MaterialDrawer'
import MaterialFormModal from '../components/materials/MaterialFormModal'
import ContactSelectorDialog from '../components/ui/ContactSelectorDialog'
import HelpTooltip from '../components/help/HelpTooltip'
import { materialsApi } from '../api/materials'
import { filesApi } from '../api/files'
import type { Material } from '../types'
import { validateMaterialForm, hasErrors, type ValidationError } from '../utils/validation'
import { parseValidationErrors } from '../utils/apiErrors'
import { useToast } from '../components/common/ToastProvider'
import { useReferenceData } from '../contexts/ReferenceDataContext'
import type { KeyValuePair } from '../components/ui/KeyValueEditor'
import { getCategoryConfig, getCategoryFromType } from '../utils/materialCategory'
import { AddIcon, VisibilityIcon, EditIcon, DeleteIcon } from '@/icons'
import { Box, Typography, IconButton, TablePagination, useMediaQuery, useTheme } from '@/mui'

export default function MaterialsPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const { materialTemplates } = useReferenceData()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<Material[]>([])
  const [totalMaterials, setTotalMaterials] = useState(0)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [activeTab, setActiveTab] = useState('all')
  const [activeCategory, setActiveCategory] = useState('all')
  const [formData, setFormData] = useState({ name: '', templateId: '', manufacturer: '', modelNumber: '', quantity: '', unit: '', expectedDelivery: '', storageLocation: '', notes: '' })
  const [specificationValues, setSpecificationValues] = useState<Record<string, string | number | boolean>>({})
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({})
  const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({})
  const [customFields, setCustomFields] = useState<KeyValuePair[]>([])
  const [contactDialogOpen, setContactDialogOpen] = useState(false)

  const selectedTemplate = useMemo(() => materialTemplates.find(t => t.id === formData.templateId) || null, [materialTemplates, formData.templateId])

  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(timer) }, [search])
  useEffect(() => { loadMaterials() }, [projectId, page, rowsPerPage, activeTab, debouncedSearch])

  const loadMaterials = async () => {
    try {
      setLoading(true)
      const params: { status?: string; search?: string; page: number; pageSize: number } = { page, pageSize: rowsPerPage }
      if (activeTab !== 'all') params.status = activeTab === 'pending' ? 'submitted' : activeTab
      if (debouncedSearch) params.search = debouncedSearch
      const result = await materialsApi.list(projectId!, params)
      setMaterials(result.items); setTotalMaterials(result.total)
    } catch { showError(t('materials.failedToLoadMaterials')) } finally { setLoading(false) }
  }

  const resetForm = () => {
    setFormData({ name: '', templateId: '', manufacturer: '', modelNumber: '', quantity: '', unit: '', expectedDelivery: '', storageLocation: '', notes: '' })
    setSpecificationValues({}); setDocumentFiles({}); setChecklistResponses({}); setCustomFields([]); setErrors({}); setEditingMaterial(null)
  }

  const handleOpenCreate = () => { resetForm(); setDialogOpen(true) }

  const handleOpenEdit = (material: Material, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingMaterial(material)
    const matchingTemplate = materialTemplates.find(t => t.name_he === material.materialType) || materialTemplates.find(t => t.name === material.materialType)
    setFormData({ name: material.name, templateId: matchingTemplate?.id || '', manufacturer: material.manufacturer || '', modelNumber: material.modelNumber || '', quantity: material.quantity?.toString() || '', unit: material.unit || '', expectedDelivery: material.expectedDelivery || '', storageLocation: material.storageLocation || '', notes: material.notes || '' })
    setDocumentFiles({}); setChecklistResponses({})
    const existingSpecs = material.specifications || {}
    const templateSpecKeys = new Set(matchingTemplate?.required_specifications?.map(s => s.name) || [])
    const templateValues: Record<string, string | number | boolean> = {}
    const customEntries: KeyValuePair[] = []
    Object.entries(existingSpecs).forEach(([key, value]) => {
      if (templateSpecKeys.has(key)) templateValues[key] = value as string | number | boolean
      else customEntries.push({ key, value: value as string | number | boolean, type: typeof value === 'number' ? 'number' as const : typeof value === 'boolean' ? 'boolean' as const : 'text' as const })
    })
    setSpecificationValues(templateValues); setCustomFields(customEntries); setErrors({}); setDialogOpen(true); setDrawerOpen(false)
  }

  const handleSaveMaterial = async () => {
    if (!projectId) return
    const validationErrors = validateMaterialForm({ name: formData.name, notes: formData.notes, quantity: formData.quantity ? parseFloat(formData.quantity) : undefined, materialType: selectedTemplate?.name_he, manufacturer: formData.manufacturer, modelNumber: formData.modelNumber, unit: formData.unit, storageLocation: formData.storageLocation })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return
    setSaving(true)
    try {
      const specs: Record<string, unknown> = { ...specificationValues }
      customFields.forEach(f => { specs[f.key] = f.value })
      const payload = { name: formData.name, material_type: selectedTemplate?.name_he || undefined, manufacturer: formData.manufacturer || undefined, model_number: formData.modelNumber || undefined, quantity: formData.quantity ? parseFloat(formData.quantity) : undefined, unit: formData.unit || undefined, specifications: Object.keys(specs).length > 0 ? specs : undefined, expected_delivery: formData.expectedDelivery || undefined, storage_location: formData.storageLocation || undefined, notes: formData.notes || undefined }
      let entityId: string
      if (editingMaterial) { const updated = await withMinDuration(materialsApi.update(projectId, editingMaterial.id, payload)); entityId = updated.id; showSuccess(t('materials.materialUpdatedSuccessfully')) }
      else { const created = await withMinDuration(materialsApi.create(projectId, payload)); entityId = created.id; showSuccess(t('materials.materialCreatedSuccessfully')) }
      const filesToUpload = Object.values(documentFiles).filter((f): f is File => f !== null)
      if (filesToUpload.length > 0) await Promise.all(filesToUpload.map(file => filesApi.upload(projectId, 'material', entityId, file)))
      setDialogOpen(false); resetForm(); loadMaterials()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) { setErrors(prev => ({ ...prev, ...serverErrors })); showError(t('validation.checkFields')); return }
      showError(editingMaterial ? t('materials.failedToUpdateMaterial') : t('materials.failedToCreateMaterial'))
    } finally { setSaving(false) }
  }

  const handleDeleteClick = (material: Material, e?: React.MouseEvent) => { if (e) e.stopPropagation(); setMaterialToDelete(material); setDeleteDialogOpen(true) }

  const handleConfirmDelete = async () => {
    if (!projectId || !materialToDelete) return
    setDeleting(true)
    try { await withMinDuration(materialsApi.delete(projectId, materialToDelete.id)); showSuccess(t('materials.materialDeletedSuccessfully')); setDeleteDialogOpen(false); setMaterialToDelete(null); setDrawerOpen(false); loadMaterials() }
    catch { showError(t('materials.failedToDeleteMaterial')) } finally { setDeleting(false) }
  }

  const handleSubmitForApproval = () => { if (projectId && selectedMaterial) setContactDialogOpen(true) }

  const handleConfirmSubmit = async (consultantContactId?: string, inspectorContactId?: string) => {
    if (!projectId || !selectedMaterial) return
    setSubmitting(true); setContactDialogOpen(false); setDrawerOpen(false)
    try {
      const body: { consultant_contact_id?: string; inspector_contact_id?: string } = {}
      if (consultantContactId) body.consultant_contact_id = consultantContactId
      if (inspectorContactId) body.inspector_contact_id = inspectorContactId
      await materialsApi.submit(projectId, selectedMaterial.id, body)
      showSuccess(t('materials.materialSubmittedSuccessfully')); loadMaterials()
    } catch { showError(t('materials.failedToSubmitMaterial')) } finally { setSubmitting(false) }
  }

  const handleViewDetails = (m: Material) => { setSelectedMaterial(m); setDrawerOpen(true) }

  const filteredMaterials = useMemo(() => {
    if (activeCategory === 'all') return materials
    return materials.filter(m => getCategoryFromType(m.materialType) === activeCategory)
  }, [materials, activeCategory])

  const totalQuantity = filteredMaterials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0)

  const columns: Column<Material>[] = [
    { id: 'name', label: t('materials.title'), minWidth: 250, render: (row) => {
      const catConfig = getCategoryConfig(row.materialType)
      const CatIcon = catConfig.icon
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: catConfig.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CatIcon sx={{ fontSize: 24, color: catConfig.color }} /></Box>
          <Box><Typography variant="body2" fontWeight={600}>{row.name}</Typography><Typography variant="caption" color="text.secondary">{row.materialType || t('materials.noTypeSpecified')}</Typography></Box>
        </Box>
      )
    }},
    { id: 'manufacturer', label: t('materials.manufacturer'), minWidth: 140, hideOnMobile: true, render: (row) => <Typography variant="body2" color={row.manufacturer ? 'text.primary' : 'text.secondary'}>{row.manufacturer || '-'}</Typography> },
    { id: 'quantity', label: t('materials.quantity'), minWidth: 120, hideOnMobile: true, render: (row) => (
      <Box><Typography variant="body2" fontWeight={500}>{row.quantity ? `${Number(row.quantity).toLocaleString()} ${row.unit || ''}` : '-'}</Typography>{row.storageLocation && <Typography variant="caption" color="text.secondary">{row.storageLocation}</Typography>}</Box>
    )},
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
        <PageHeader title={t('materials.title')} subtitle={t('materials.subtitle')} breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('materials.title') }]} actions={<Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>{t('materials.addMaterial')}</Button>} />
        <HelpTooltip helpKey="help.tooltips.materialForm" />
      </Box>

      <Box sx={{ mb: 2 }}>
        <SummaryBar items={[
          { label: t('materials.items'), value: totalMaterials },
          { label: t('materials.pendingCount'), value: materials.filter(m => m.status === 'submitted').length, color: theme.palette.warning.main },
          { label: t('materials.totalQuantity'), value: `${totalQuantity.toLocaleString()} ${t('materials.items')}` },
        ]} />
      </Box>

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <SearchField placeholder={t('materials.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </Box>
          <Box sx={{ mb: 1 }}>
            <FilterChips
              items={[
                { label: t('common.all'), value: 'all' },
                { label: t('materials.draft'), value: 'draft' },
                { label: t('materials.pending'), value: 'pending' },
                { label: t('materials.approved'), value: 'approved' },
                { label: t('materials.rejected'), value: 'rejected' },
              ]}
              value={activeTab}
              onChange={(val) => { setActiveTab(val); setPage(1) }}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <FilterChips
              items={[
                { label: t('materials.allCategories'), value: 'all' },
                { label: t('materials.concrete'), value: 'concrete' },
                { label: t('materials.steel'), value: 'steel' },
                { label: t('materials.electrical'), value: 'electrical' },
                { label: t('materials.plumbing'), value: 'plumbing' },
                { label: t('materials.general'), value: 'general' },
              ]}
              value={activeCategory}
              onChange={(val) => { setActiveCategory(val); setPage(1) }}
            />
          </Box>

          {isMobile ? (
            <MaterialCardList materials={filteredMaterials} loading={loading} onView={handleViewDetails} onEdit={handleOpenEdit} onDelete={handleDeleteClick} onAdd={handleOpenCreate} />
          ) : (
            <DataTable columns={columns} rows={filteredMaterials} getRowId={(row) => row.id} onRowClick={handleViewDetails} emptyVariant="no-results" emptyTitle={t('materials.noMaterialsFound')} emptyDescription={t('materials.noResultsDescription')} emptyAction={{ label: t('materials.addMaterial'), onClick: handleOpenCreate }} pagination={false} />
          )}

          {totalMaterials > 0 && (
            <TablePagination component="div" count={totalMaterials} page={page - 1} rowsPerPage={rowsPerPage} onPageChange={(_, newPage) => setPage(newPage + 1)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(1) }} rowsPerPageOptions={[10, 20, 50, 100]} labelRowsPerPage={t('table.rowsPerPage')} labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('table.of')} ${count !== -1 ? count : `>${to}`}`} getItemAriaLabel={(type) => type === 'next' ? t('table.goToNextPage') : t('table.goToPreviousPage')} />
          )}
        </Box>
      </Card>

      <MaterialDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedMaterial(null) }} material={selectedMaterial} projectId={projectId!} onEdit={(m) => handleOpenEdit(m)} onSubmitForApproval={handleSubmitForApproval} submitting={submitting} />

      <MaterialFormModal open={dialogOpen} onClose={() => { setDialogOpen(false); resetForm() }} onSubmit={handleSaveMaterial} saving={saving} editing={!!editingMaterial} formData={formData} setFormData={setFormData} errors={errors} templates={materialTemplates} selectedTemplate={selectedTemplate} specificationValues={specificationValues} setSpecificationValues={setSpecificationValues} documentFiles={documentFiles} setDocumentFiles={setDocumentFiles} checklistResponses={checklistResponses} setChecklistResponses={setChecklistResponses} customFields={customFields} setCustomFields={setCustomFields} />

      <ConfirmModal open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleConfirmDelete} title={t('materials.deleteConfirmation')} message={t('materials.deleteConfirmationMessage', { name: materialToDelete?.name })} confirmLabel={t('common.delete')} variant="danger" loading={deleting} />

      <ContactSelectorDialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} onConfirm={handleConfirmSubmit} projectId={projectId!} loading={submitting} />

    </Box>
  )
}
