import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField, TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { contactsApi } from '../api/contacts'
import { contactGroupsApi } from '../api/contactGroups'
import { apiClient } from '../api/client'
import type { Contact, ContactGroupListItem, ContactGroup } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { validateContactForm, hasErrors,  type ValidationError } from '../utils/validation'
import { parseValidationErrors } from '../utils/apiErrors'
import { AddIcon, EditIcon, DeleteIcon, PersonIcon, GroupIcon, AssignmentIcon } from '@/icons'
import { Box, Typography, MenuItem, TextField as MuiTextField, Skeleton, Chip, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Autocomplete, Tab as MuiTab, Tabs as MuiTabs } from '@/mui'

export default function ContactsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationError>({})
  const [projectUsers, setProjectUsers] = useState<{ id: string; email: string; fullName?: string }[]>([])
  const [formData, setFormData] = useState({
    contactName: '',
    contactType: '',
    customType: '',
    companyName: '',
    email: '',
    phone: '',
    roleDescription: '',
    userId: '' as string | ''
  })

  const [mainTab, setMainTab] = useState(0)
  const [groups, setGroups] = useState<ContactGroupListItem[]>([])
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null)
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<ContactGroupListItem | null>(null)
  const [groupFormData, setGroupFormData] = useState({ name: '', description: '', contactIds: [] as string[] })
  const [groupSaving, setGroupSaving] = useState(false)

  const contactTypes = [
    { value: 'contractor', label: t('contacts.types.contractor'), color: '#1976d2' },
    { value: 'consultant', label: t('contacts.types.consultant'), color: '#9c27b0' },
    { value: 'supervisor', label: t('contacts.types.supervisor'), color: '#2e7d32' },
    { value: 'inspector', label: t('contacts.types.inspector'), color: '#ed6c02' },
    { value: 'engineer', label: t('contacts.types.engineer'), color: '#0288d1' },
    { value: 'manager', label: t('contacts.types.manager'), color: '#d32f2f' },
    { value: 'other', label: t('contacts.types.other'), color: '#757575' },
  ]

  useEffect(() => {
    loadContacts()
    loadProjectUsers()
    loadGroups()
  }, [projectId])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await contactsApi.list(projectId!)
      setContacts(data)
    } catch {
      showError(t('contacts.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const loadProjectUsers = async () => {
    try {
      const res = await apiClient.get(`/projects/${projectId}/members`)
      const members = res.data as { user: { id: string; email: string; fullName?: string } }[]
      setProjectUsers(members.map(m => m.user))
    } catch { /* non-critical */ }
  }

  const loadGroups = async () => {
    try {
      const data = await contactGroupsApi.list(projectId!)
      setGroups(data)
    } catch { /* non-critical */ }
  }

  const resetForm = () => {
    setFormData({ contactName: '', contactType: '', customType: '', companyName: '', email: '', phone: '', roleDescription: '', userId: '' })
    setErrors({})
    setEditingContact(null)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    resetForm()
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact)
    const knownTypes = contactTypes.map(t => t.value)
    const isKnownType = knownTypes.includes(contact.contactType)
    setFormData({
      contactName: contact.contactName,
      contactType: isKnownType ? contact.contactType : 'other',
      customType: isKnownType ? '' : contact.contactType,
      companyName: contact.companyName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      roleDescription: contact.roleDescription || '',
      userId: contact.userId || ''
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleSaveContact = async () => {
    if (!projectId) return
    const resolvedType = formData.contactType === 'other' ? formData.customType : formData.contactType
    const validationErrors = validateContactForm({
      contact_name: formData.contactName,
      contact_type: resolvedType,
      email: formData.email,
      phone: formData.phone,
      company_name: formData.companyName,
      role_description: formData.roleDescription
    })
    if (formData.contactType === 'other' && !formData.customType.trim()) {
      validationErrors.customType = t('contacts.customTypeRequired')
    }
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const payload = {
        contact_name: formData.contactName,
        contact_type: resolvedType,
        company_name: formData.companyName || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        role_description: formData.roleDescription || undefined,
        user_id: formData.userId || undefined
      }
      if (editingContact) {
        await contactsApi.update(projectId, editingContact.id, payload)
        showSuccess(t('contacts.updateSuccess'))
      } else {
        await contactsApi.create(projectId, payload)
        showSuccess(t('contacts.createSuccess'))
      }
      handleCloseDialog()
      loadContacts()
    } catch (err) {
      const serverErrors = parseValidationErrors(err)
      if (Object.keys(serverErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...serverErrors }))
        showError(t('validation.checkFields'))
        return
      }
      showError(editingContact ? t('contacts.failedToUpdate') : t('contacts.failedToCreate'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectId || !contactToDelete) return
    try {
      await contactsApi.delete(projectId, contactToDelete.id)
      showSuccess(t('contacts.deleteSuccess'))
      setDeleteDialogOpen(false)
      setContactToDelete(null)
      loadContacts()
    } catch {
      showError(t('contacts.failedToDelete'))
    }
  }

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    const matchesType = filterType === 'all' || c.contactType === filterType
    return matchesSearch && matchesType
  })

  const getTypeConfig = (type: string) => {
    return contactTypes.find(t => t.value === type) || { label: type, color: '#757575' }
  }

  const typeCount = (type: string) => contacts.filter(c => c.contactType === type).length

  const handleOpenGroupCreate = () => {
    setEditingGroup(null)
    setGroupFormData({ name: '', description: '', contactIds: [] })
    setGroupDialogOpen(true)
  }

  const handleOpenGroupEdit = async (group: ContactGroupListItem) => {
    try {
      const full = await contactGroupsApi.get(projectId!, group.id)
      setEditingGroup(full)
      setGroupFormData({
        name: full.name,
        description: full.description || '',
        contactIds: full.contacts.map(c => c.id),
      })
      setGroupDialogOpen(true)
    } catch {
      showError(t('contactGroups.failedToLoad'))
    }
  }

  const handleSaveGroup = async () => {
    if (!projectId) return
    if (!groupFormData.name.trim()) return
    setGroupSaving(true)
    try {
      if (editingGroup) {
        await contactGroupsApi.update(projectId, editingGroup.id, {
          name: groupFormData.name,
          description: groupFormData.description || undefined,
          contact_ids: groupFormData.contactIds,
        })
        showSuccess(t('contactGroups.updateSuccess'))
      } else {
        await contactGroupsApi.create(projectId, {
          name: groupFormData.name,
          description: groupFormData.description || undefined,
          contact_ids: groupFormData.contactIds,
        })
        showSuccess(t('contactGroups.createSuccess'))
      }
      setGroupDialogOpen(false)
      loadGroups()
    } catch {
      showError(editingGroup ? t('contactGroups.failedToUpdate') : t('contactGroups.failedToCreate'))
    } finally {
      setGroupSaving(false)
    }
  }

  const handleDeleteGroupClick = (group: ContactGroupListItem) => {
    setGroupToDelete(group)
    setDeleteGroupDialogOpen(true)
  }

  const handleConfirmDeleteGroup = async () => {
    if (!projectId || !groupToDelete) return
    try {
      await contactGroupsApi.delete(projectId, groupToDelete.id)
      showSuccess(t('contactGroups.deleteSuccess'))
      setDeleteGroupDialogOpen(false)
      setGroupToDelete(null)
      loadGroups()
    } catch {
      showError(t('contactGroups.failedToDelete'))
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('contacts.title')}
        subtitle={t('contacts.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.contacts') }]}
        actions={
          mainTab === 0 ? (
            <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
              {t('contacts.addContact')}
            </Button>
          ) : (
            <Button variant="primary" icon={<AddIcon />} onClick={handleOpenGroupCreate}>
              {t('contactGroups.createGroup')}
            </Button>
          )
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <KPICard
          title={t('contacts.totalContacts')}
          value={contacts.length}
          icon={<GroupIcon />}
          color="primary"
        />
        <KPICard
          title={t('contacts.types.contractor')}
          value={typeCount('contractor')}
          icon={<PersonIcon />}
          color="info"
        />
        <KPICard
          title={t('contacts.types.consultant')}
          value={typeCount('consultant')}
          icon={<PersonIcon />}
          color="warning"
        />
      </Box>

      <MuiTabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 2 }}>
        <MuiTab label={t('nav.contacts')} />
        <MuiTab label={t('contactGroups.title')} />
      </MuiTabs>

      {mainTab === 0 && (
        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
              <SearchField
                placeholder={t('contacts.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Chip label={`${filteredContacts.length} ${t('nav.contacts').toLowerCase()}`} size="small" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
            </Box>

            <Tabs
              items={[
                { label: t('common.all'), value: 'all', badge: contacts.length },
                ...contactTypes.map(type => ({
                  label: type.label,
                  value: type.value,
                  badge: typeCount(type.value)
                }))
              ]}
              value={filterType}
              onChange={setFilterType}
              size="small"
              variant="scrollable"
            />

            {filteredContacts.length === 0 ? (
              <Box sx={{ mt: 4 }}>
                <EmptyState
                  variant="no-results"
                  title={t('contacts.noContacts')}
                  description={t('contacts.noContactsDescription')}
                  action={{ label: t('contacts.addContact'), onClick: handleOpenCreate }}
                />
              </Box>
            ) : (
              <TableContainer sx={{ mt: 2, overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('contacts.contactName')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('contacts.contactType')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', display: { xs: 'none', md: 'table-cell' } }}>{t('contacts.companyName')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', display: { xs: 'none', md: 'table-cell' } }}>{t('contacts.roleDescription')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', display: { xs: 'none', md: 'table-cell' } }}>{t('contacts.email')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', display: { xs: 'none', md: 'table-cell' } }}>{t('contacts.phone')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', display: { xs: 'none', md: 'table-cell' } }}>{t('contacts.linkedUser')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', display: { xs: 'none', md: 'table-cell' } }} align="center">{t('contacts.pendingApprovals')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }} align="center">{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredContacts.map((contact) => {
                      const typeConfig = getTypeConfig(contact.contactType)
                      return (
                        <TableRow key={contact.id} hover onClick={() => handleOpenEdit(contact)} sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar name={contact.contactName} size="small" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {contact.contactName}
                                </Typography>
                                {contact.isPrimary && (
                                  <Chip label={t('contacts.primary')} size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem', mt: 0.25 }} />
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={typeConfig.label}
                              size="small"
                              sx={{
                                bgcolor: `${typeConfig.color}15`,
                                color: typeConfig.color,
                                fontWeight: 500,
                                fontSize: '0.75rem',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary">
                              {contact.companyName || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {contact.roleDescription || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            {contact.email ? (
                              <Typography variant="body2" color="text.secondary">{contact.email}</Typography>
                            ) : '—'}
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary">
                              {contact.phone || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            {contact.user ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar name={contact.user.fullName || contact.user.email} size="small" />
                                <Typography variant="body2" color="text.secondary">
                                  {contact.user.fullName || contact.user.email}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            {(contact.pendingApprovalsCount ?? 0) > 0 ? (
                              <Chip
                                label={contact.pendingApprovalsCount}
                                size="small"
                                color="warning"
                                icon={<AssignmentIcon sx={{ fontSize: 14 }} />}
                              />
                            ) : (
                              <Typography variant="body2" color="text.disabled">0</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <IconButton size="small" onClick={() => handleOpenEdit(contact)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteClick(contact)} color="error">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Card>
      )}

      {mainTab === 1 && (
        <Card>
          <Box sx={{ p: 2 }}>
            {groups.length === 0 ? (
              <EmptyState
                variant="no-results"
                title={t('contactGroups.noGroups')}
                description={t('contactGroups.noGroupsDescription')}
                action={{ label: t('contactGroups.createGroup'), onClick: handleOpenGroupCreate }}
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('common.name')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('common.description')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }} align="center">{t('contactGroups.members')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }} align="center">{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow key={group.id} hover onClick={() => handleOpenGroupEdit(group)} sx={{ cursor: 'pointer' }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GroupIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="body2" fontWeight={600}>{group.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {group.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={group.memberCount} size="small" />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton size="small" onClick={() => handleOpenGroupEdit(group)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteGroupClick(group)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Card>
      )}

      <FormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveContact}
        title={editingContact ? t('contacts.editContact') : t('contacts.addContact')}
        submitLabel={editingContact ? t('common.saveChanges') : t('contacts.addContact')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('contacts.contactName')}
            required
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            error={!!errors.contact_name}
            helperText={errors.contact_name}
          />
          <MuiTextField
            fullWidth
            select
            label={t('contacts.contactType')}
            required
            value={formData.contactType}
            onChange={(e) => setFormData({ ...formData, contactType: e.target.value, customType: e.target.value === 'other' ? formData.customType : '' })}
            error={!!errors.contact_type}
            helperText={errors.contact_type}
          >
            {contactTypes.map(type => (
              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
            ))}
          </MuiTextField>
          {formData.contactType === 'other' && (
            <TextField
              fullWidth
              label={t('contacts.customTypeName')}
              required
              value={formData.customType}
              onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
              error={!!errors.customType}
              helperText={errors.customType}
            />
          )}
          <TextField
            fullWidth
            label={t('contacts.companyName')}
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label={t('contacts.email')}
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email}
            />
            <TextField
              fullWidth
              label={t('contacts.phone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={!!errors.phone}
              helperText={errors.phone}
            />
          </Box>
          <TextField
            fullWidth
            label={t('contacts.roleDescription')}
            multiline
            rows={2}
            value={formData.roleDescription}
            onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
          />
          <Autocomplete
            options={projectUsers}
            getOptionLabel={(opt) => opt.fullName ? `${opt.fullName} (${opt.email})` : opt.email}
            value={projectUsers.find(u => u.id === formData.userId) || null}
            onChange={(_, val) => setFormData({ ...formData, userId: val?.id || '' })}
            renderInput={(params) => (
              <MuiTextField
                {...params}
                label={t('contacts.linkedUser')}
                helperText={t('contacts.linkedUserHint')}
                size="small"
              />
            )}
            size="small"
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
          />
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('contacts.deleteContact')}
        message={t('contacts.deleteConfirmationMessage', { name: contactToDelete?.contactName })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      <FormModal
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        onSubmit={handleSaveGroup}
        title={editingGroup ? t('contactGroups.editGroup') : t('contactGroups.createGroup')}
        submitLabel={editingGroup ? t('common.saveChanges') : t('contactGroups.createGroup')}
        loading={groupSaving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('common.name')}
            required
            value={groupFormData.name}
            onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
          />
          <TextField
            fullWidth
            label={t('common.description')}
            multiline
            rows={2}
            value={groupFormData.description}
            onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
          />
          <Autocomplete
            multiple
            options={contacts}
            getOptionLabel={(opt) => `${opt.contactName}${opt.email ? ` (${opt.email})` : ''}`}
            value={contacts.filter(c => groupFormData.contactIds.includes(c.id))}
            onChange={(_, val) => setGroupFormData({ ...groupFormData, contactIds: val.map(v => v.id) })}
            renderInput={(params) => (
              <MuiTextField
                {...params}
                label={t('contactGroups.members')}
                size="small"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((opt, index) => (
                <Chip
                  label={opt.contactName}
                  {...getTagProps({ index })}
                  key={opt.id}
                  size="small"
                />
              ))
            }
            size="small"
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
          />
        </Box>
      </FormModal>

      <ConfirmModal
        open={deleteGroupDialogOpen}
        onClose={() => setDeleteGroupDialogOpen(false)}
        onConfirm={handleConfirmDeleteGroup}
        title={t('contactGroups.deleteGroup')}
        message={t('contactGroups.deleteConfirmation', { name: groupToDelete?.name })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </Box>
  )
}
