import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { DataTable, Column } from './ui/DataTable'
import { FormModal, ConfirmModal } from './ui/Modal'
import { TextField } from './ui/TextField'
import { EmptyState } from './ui/EmptyState'
import { rolesApi, OrganizationRole, OrganizationRoleCreate, OrganizationRoleUpdate } from '../api/roles'
import { useToast } from './common/ToastProvider'
import { Box, Typography, Checkbox, FormControlLabel, Chip, CircularProgress, IconButton, Tooltip } from '@/mui'
import { EditIcon, DeleteIcon, AddIcon } from '@/icons'

interface RoleManagementProps {
  organizationId: string
}

const ALL_PERMISSIONS = ['create', 'edit', 'delete', 'approve', 'view_all', 'manage_members', 'manage_settings']

export default function RoleManagement({ organizationId }: RoleManagementProps) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<OrganizationRole[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedRole, setSelectedRole] = useState<OrganizationRole | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  })

  useEffect(() => {
    loadRoles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const data = await rolesApi.listOrganizationRoles(organizationId)
      setRoles(data)
    } catch {
      showError(t('roleManagement.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditMode(false)
    setSelectedRole(null)
    setFormData({ name: '', description: '', permissions: [] })
    setDialogOpen(true)
  }

  const handleEdit = (role: OrganizationRole) => {
    setEditMode(true)
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    })
    setDialogOpen(true)
  }

  const handleDelete = (role: OrganizationRole) => {
    setSelectedRole(role)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError(t('roleManagement.nameRequired'))
      return
    }

    setSubmitting(true)
    try {
      if (editMode && selectedRole) {
        const updateData: OrganizationRoleUpdate = {
          name: formData.name,
          description: formData.description || undefined,
          permissions: formData.permissions.length > 0 ? formData.permissions : undefined,
        }
        const updated = await rolesApi.updateOrganizationRole(organizationId, selectedRole.id, updateData)
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        showSuccess(t('roleManagement.updateSuccess'))
      } else {
        const createData: OrganizationRoleCreate = {
          organization_id: organizationId,
          name: formData.name,
          description: formData.description || undefined,
          permissions: formData.permissions.length > 0 ? formData.permissions : undefined,
        }
        const created = await rolesApi.createOrganizationRole(organizationId, createData)
        setRoles((prev) => [...prev, created])
        showSuccess(t('roleManagement.createSuccess'))
      }
      setDialogOpen(false)
    } catch {
      showError(editMode ? t('roleManagement.updateFailed') : t('roleManagement.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedRole) return

    setSubmitting(true)
    try {
      await rolesApi.deleteOrganizationRole(organizationId, selectedRole.id)
      setRoles((prev) => prev.filter((r) => r.id !== selectedRole.id))
      showSuccess(t('roleManagement.deleteSuccess'))
      setDeleteDialogOpen(false)
    } catch {
      showError(t('roleManagement.deleteFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }))
  }

  const customRoles = roles.filter((r) => !r.isSystemRole)

  const columns: Column<OrganizationRole>[] = [
    {
      id: 'name',
      label: t('roleManagement.columnName'),
      minWidth: 150,
      sortable: true,
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>{row.name}</Box>
          {row.isSystemRole && (
            <Chip label={t('roleManagement.systemRole')} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
        </Box>
      ),
    },
    {
      id: 'description',
      label: t('roleManagement.columnDescription'),
      minWidth: 200,
      render: (row) => (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {row.description || t('roleManagement.noDescription')}
        </Typography>
      ),
    },
    {
      id: 'permissions',
      label: t('roleManagement.columnPermissions'),
      minWidth: 250,
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {(row.permissions || []).slice(0, 3).map((p) => (
            <Chip key={p} label={t(`permissions.${p}`, p)} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
          ))}
          {(row.permissions || []).length > 3 && (
            <Chip label={`+${(row.permissions || []).length - 3}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
          {(!row.permissions || row.permissions.length === 0) && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              {t('roleManagement.noPermissions')}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'actions',
      label: t('roleManagement.columnActions'),
      minWidth: 100,
      align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          {!row.isSystemRole && (
            <>
              <Tooltip title={t('common.edit')}>
                <IconButton size="small" onClick={() => handleEdit(row)} aria-label={t('common.edit')}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <IconButton size="small" color="error" onClick={() => handleDelete(row)} aria-label={t('common.delete')}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ]

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{t('roleManagement.title')}</Typography>
        <Button variant="primary" onClick={handleCreate} startIcon={<AddIcon />}>
          {t('roleManagement.createRole')}
        </Button>
      </Box>

      {customRoles.length === 0 ? (
        <EmptyState
          title={t('roleManagement.noCustomRoles')}
          description={t('roleManagement.createFirstRole')}
          action={{ label: t('roleManagement.createRole'), onClick: handleCreate }}
        />
      ) : (
        <DataTable columns={columns} rows={customRoles} loading={loading} getRowId={(row) => row.id} pagination pageSize={25} />
      )}

      <FormModal
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        onSubmit={handleSubmit}
        title={editMode ? t('roleManagement.editRole') : t('roleManagement.createRole')}
        submitLabel={editMode ? t('common.save') : t('common.create')}
        loading={submitting}
      >
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label={t('roleManagement.roleName')}
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
            placeholder={t('roleManagement.roleNamePlaceholder')}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('roleManagement.roleDescription')}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t('roleManagement.roleDescriptionPlaceholder')}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('roleManagement.permissions')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {ALL_PERMISSIONS.map((p) => (
                <FormControlLabel
                  key={p}
                  control={<Checkbox checked={formData.permissions.includes(p)} onChange={() => togglePermission(p)} size="small" />}
                  label={
                    <Typography variant="body2">
                      {t(`permissions.${p}`, p.replace('_', ' '))}
                    </Typography>
                  }
                />
              ))}
            </Box>
          </Box>
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('roleManagement.deleteRole')}
        message={t('roleManagement.deleteWarning')}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={submitting}
      />
    </Box>
  )
}
