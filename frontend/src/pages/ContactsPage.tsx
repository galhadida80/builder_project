import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import BusinessIcon from '@mui/icons-material/Business'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
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
import type { Contact } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { validateContactForm, hasErrors,  type ValidationError } from '../utils/validation'
import { parseValidationErrors } from '../utils/apiErrors'

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
  const [formData, setFormData] = useState({
    contactName: '',
    contactType: '',
    companyName: '',
    email: '',
    phone: '',
    roleDescription: ''
  })

  const contactTypes = [
    { value: 'contractor', label: t('contacts.types.contractor'), color: '#1976d2' },
    { value: 'consultant', label: t('contacts.types.consultant'), color: '#9c27b0' },
    { value: 'supervisor', label: t('contacts.types.supervisor'), color: '#2e7d32' },
    { value: 'inspector', label: t('contacts.types.inspector'), color: '#ed6c02' },
    { value: 'engineer', label: t('contacts.types.engineer'), color: '#0288d1' },
    { value: 'manager', label: t('contacts.types.manager'), color: '#d32f2f' },
  ]

  useEffect(() => {
    loadContacts()
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

  const resetForm = () => {
    setFormData({ contactName: '', contactType: '', companyName: '', email: '', phone: '', roleDescription: '' })
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
    setFormData({
      contactName: contact.contactName,
      contactType: contact.contactType,
      companyName: contact.companyName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      roleDescription: contact.roleDescription || ''
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleSaveContact = async () => {
    if (!projectId) return
    const validationErrors = validateContactForm({
      contact_name: formData.contactName,
      email: formData.email,
      phone: formData.phone
    })
    if (!formData.contactType) validationErrors.contactType = t('contacts.typeRequired')
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    setSaving(true)
    try {
      const payload = {
        contact_name: formData.contactName,
        contact_type: formData.contactType,
        company_name: formData.companyName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        role_description: formData.roleDescription || undefined
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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 4 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t('contacts.title')}
        subtitle={t('contacts.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.contacts') }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            {t('contacts.addContact')}
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
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

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <SearchField
              placeholder={t('contacts.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Chip label={`${filteredContacts.length} ${t('nav.contacts').toLowerCase()}`} size="small" />
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
            <Box
              sx={{
                mt: 3,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              {filteredContacts.map((contact) => {
                const typeConfig = getTypeConfig(contact.contactType)
                return (
                  <Card key={contact.id} hoverable>
                    <Box sx={{ p: 2.5, position: 'relative' }}>
                      {contact.isPrimary && (
                        <StarIcon sx={{ position: 'absolute', top: 16, right: 16, color: 'warning.main', fontSize: 20 }} />
                      )}

                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Avatar name={contact.contactName} size="large" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {contact.contactName}
                          </Typography>
                          <Chip
                            label={typeConfig.label}
                            size="small"
                            sx={{
                              mt: 0.5,
                              bgcolor: `${typeConfig.color}15`,
                              color: typeConfig.color,
                              fontWeight: 500,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        {contact.companyName && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {contact.companyName}
                            </Typography>
                          </Box>
                        )}
                        {contact.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                              {contact.email}
                            </Typography>
                          </Box>
                        )}
                        {contact.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {contact.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {contact.roleDescription && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {contact.roleDescription}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleOpenEdit(contact)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteClick(contact)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Card>
                )
              })}
            </Box>
          )}
        </Box>
      </Card>

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
            onChange={(e) => setFormData({ ...formData, contactType: e.target.value })}
            error={!!errors.contactType}
            helperText={errors.contactType}
          >
            {contactTypes.map(type => (
              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
            ))}
          </MuiTextField>
          <TextField
            fullWidth
            label={t('contacts.companyName')}
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label={t('contacts.email')}
              type="email"
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
    </Box>
  )
}
