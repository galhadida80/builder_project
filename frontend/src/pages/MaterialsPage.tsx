import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import InventoryIcon from '@mui/icons-material/Inventory'
import FilterListIcon from '@mui/icons-material/FilterList'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs, SegmentedTabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { MaterialInventoryGrid } from '../components/materials/MaterialInventoryGrid'
import { materialsApi } from '../api/materials'
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
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
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
    } catch {
      showError(t('materials.failedToLoadMaterials'))
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
      loadMaterials()
    } catch {
      showError(t('materials.failedToDeleteMaterial'))
    }
  }

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.materialType?.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'all' || m.status === activeTab
    return matchesSearch && matchesTab
  })

  const pendingMaterials = materials.filter(m => m.status === 'submitted' || m.status === 'under_review').length
  const approvedMaterials = materials.filter(m => m.status === 'approved').length
  const totalQuantity = materials.reduce((sum, m) => sum + (m.quantity || 0), 0)

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
      label: t('equipment.manufacturer'),
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
            {row.quantity ? `${row.quantity.toLocaleString()} ${row.unit || ''}` : '-'}
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
      id: 'expectedDelivery',
      label: t('materials.deliveryDate'),
      minWidth: 120,
      render: (row) => (
        <Typography variant="body2" color={row.expectedDelivery ? 'text.primary' : 'text.secondary'}>
          {row.expectedDelivery
            ? new Date(row.expectedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '-'}
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
      minWidth: 100,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => handleOpenEdit(row)} title={t('materials.editMaterial')}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => handleDeleteClick(row, e)} title={t('common.delete')} color="error">
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
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
          icon={<InventoryIcon />}
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
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <SearchField
                placeholder={t('materials.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="secondary" size="small" icon={<FilterListIcon />}>
                {t('common.filter')}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip label={`${filteredMaterials.length} items`} size="small" />
              <SegmentedTabs
                items={[
                  { label: 'Table', value: 'table', icon: <ViewListIcon sx={{ fontSize: 18 }} /> },
                  { label: 'Grid', value: 'grid', icon: <GridViewIcon sx={{ fontSize: 18 }} /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as 'table' | 'grid')}
              />
            </Box>
          </Box>

          <Tabs
            items={[
              { label: t('common.status'), value: 'all', badge: materials.length },
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
                description={t('materials.searchPlaceholder')}
                action={{ label: t('materials.addMaterial'), onClick: handleOpenCreate }}
              />
            ) : viewMode === 'table' ? (
              <DataTable
                columns={columns}
                rows={filteredMaterials}
                getRowId={(row) => row.id}
                emptyMessage={t('materials.noMaterialsFound')}
              />
            ) : (
              <MaterialInventoryGrid
                materials={filteredMaterials}
                loading={false}
                onMaterialClick={handleOpenEdit}
              />
            )}
          </Box>
        </Box>
      </Card>

      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveMaterial}
        title={editingMaterial ? t('materials.editMaterialTitle') : t('materials.addNewMaterial')}
        submitLabel={editingMaterial ? t('common.saveChanges') : t('materials.addMaterial')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('materials.materialName')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name || `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}`}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <MuiTextField
              fullWidth
              select
              label={t('materials.type')}
              value={formData.materialType}
              onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
            >
              <MenuItem value="">Select type...</MenuItem>
              {materialTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </MuiTextField>
            <TextField
              fullWidth
              label={t('equipment.manufacturer')}
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            />
          </Box>
          <TextField
            fullWidth
            label={t('equipment.model')}
            value={formData.modelNumber}
            onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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
              <MenuItem value="">Select unit...</MenuItem>
              {unitOptions.map(unit => <MenuItem key={unit} value={unit}>{unit}</MenuItem>)}
            </MuiTextField>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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
              label={t('materials.stockLevel')}
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
            error={!!errors.notes}
            helperText={errors.notes}
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
