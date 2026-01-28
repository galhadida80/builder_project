import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import BusinessIcon from '@mui/icons-material/Business'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import { contactsApi } from '../api/contacts'
import type { Contact } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { validateContactForm, hasErrors, VALIDATION, type ValidationError } from '../utils/validation'

const contactTypes = [
  { value: 'contractor', label: 'Contractor', color: '#1976d2' },
  { value: 'consultant', label: 'Consultant', color: '#9c27b0' },
  { value: 'supervisor', label: 'Supervisor', color: '#2e7d32' },
  { value: 'inspector', label: 'Inspector', color: '#ed6c02' },
  { value: 'engineer', label: 'Engineer', color: '#0288d1' },
  { value: 'manager', label: 'Manager', color: '#d32f2f' },
]

export default function ContactsPage() {
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')
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

  useEffect(() => {
    loadContacts()
  }, [projectId])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await contactsApi.list(projectId!)
      setContacts(data)
    } catch (error) {
      console.error('Failed to load contacts:', error)
      showError('Failed to load contacts. Please try again.')
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

    if (!formData.contactType) {
      validationErrors.contactType = 'Contact type is required'
    }

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
        showSuccess('Contact updated successfully!')
      } else {
        await contactsApi.create(projectId, payload)
        showSuccess('Contact created successfully!')
      }
      handleCloseDialog()
      loadContacts()
    } catch (error) {
      console.error('Failed to save contact:', error)
      showError(`Failed to ${editingContact ? 'update' : 'create'} contact. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation()
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectId || !contactToDelete) return

    try {
      await contactsApi.delete(projectId, contactToDelete.id)
      showSuccess('Contact deleted successfully!')
      setDeleteDialogOpen(false)
      setContactToDelete(null)
      loadContacts()
    } catch (error) {
      console.error('Failed to delete contact:', error)
      showError('Failed to delete contact. Please try again.')
    }
  }

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    const matchesType = !filterType || c.contactType === filterType
    return matchesSearch && matchesType
  })

  const getTypeConfig = (type: string) => {
    return contactTypes.find(t => t.value === type) || { label: type, color: '#757575' }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Contacts</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Add Contact
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 300 }}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
        <TextField
          select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          sx={{ width: 180 }}
          size="small"
        >
          <MenuItem value="">All Types</MenuItem>
          {contactTypes.map(type => (
            <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Grid container spacing={2}>
        {filteredContacts.map((contact) => {
          const typeConfig = getTypeConfig(contact.contactType)
          return (
            <Grid item xs={12} sm={6} md={4} key={contact.id}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                {contact.isPrimary && (
                  <StarIcon sx={{ position: 'absolute', top: 12, right: 12, color: 'warning.main' }} />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: typeConfig.color, width: 56, height: 56 }}>
                      {getInitials(contact.contactName)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{contact.contactName}</Typography>
                      <Chip
                        label={typeConfig.label}
                        size="small"
                        sx={{ bgcolor: `${typeConfig.color}20`, color: typeConfig.color, fontWeight: 500 }}
                      />
                    </Box>
                  </Box>

                  {contact.companyName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BusinessIcon fontSize="small" color="action" />
                      <Typography variant="body2">{contact.companyName}</Typography>
                    </Box>
                  )}

                  {contact.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{contact.email}</Typography>
                    </Box>
                  )}

                  {contact.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">{contact.phone}</Typography>
                    </Box>
                  )}

                  {contact.roleDescription && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {contact.roleDescription}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                    <IconButton size="small" onClick={() => handleOpenEdit(contact)} title="Edit contact">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => handleDeleteClick(contact, e)} title="Delete contact" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {filteredContacts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No contacts found</Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Contact Name"
            margin="normal"
            required
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            error={!!errors.contact_name}
            helperText={errors.contact_name || `${formData.contactName.length}/${VALIDATION.MAX_NAME_LENGTH}`}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            select
            label="Contact Type"
            margin="normal"
            required
            value={formData.contactType}
            onChange={(e) => setFormData({ ...formData, contactType: e.target.value })}
            error={!!errors.contactType}
            helperText={errors.contactType}
          >
            {contactTypes.map(type => (
              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Company Name"
            margin="normal"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={!!errors.email}
            helperText={errors.email}
          />
          <TextField
            fullWidth
            label="Phone"
            margin="normal"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={!!errors.phone}
            helperText={errors.phone}
            inputProps={{ maxLength: VALIDATION.MAX_PHONE_LENGTH }}
          />
          <TextField
            fullWidth
            label="Role Description"
            margin="normal"
            multiline
            rows={2}
            value={formData.roleDescription}
            onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
            inputProps={{ maxLength: VALIDATION.MAX_DESCRIPTION_LENGTH }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveContact} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : (editingContact ? 'Save Changes' : 'Add Contact')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Contact</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{contactToDelete?.contactName}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
