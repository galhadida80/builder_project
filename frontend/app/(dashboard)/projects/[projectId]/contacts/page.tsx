'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import InputAdornment from '@mui/material/InputAdornment'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { apiClient } from '@/lib/api/client'

interface Contact {
  id: string
  contactName: string
  contactType?: string
  companyName?: string
  email?: string
  phone?: string
  roleDescription?: string
  isPrimary?: boolean
}

const CONTACT_TYPES = ['contractor', 'subcontractor', 'supplier', 'consultant', 'architect', 'engineer', 'inspector', 'client', 'other']

const INITIAL_FORM = { contact_name: '', contact_type: '', company_name: '', email: '', phone: '', role_description: '' }

const AVATAR_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00838f']

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function ContactsPage() {
  const t = useTranslations()
  const params = useParams()!
  const projectId = params.projectId as string
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get(`/projects/${projectId}/contacts`)
      setContacts(res.data || [])
    } catch {
      setError(t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadContacts() }, [loadContacts])

  const handleCreate = async () => {
    if (!form.contact_name || !form.contact_type) return
    if (!form.email && !form.phone) {
      setSubmitError(t('errors.requiredField'))
      return
    }
    try {
      setSubmitting(true)
      setSubmitError('')
      await apiClient.post(`/projects/${projectId}/contacts`, form)
      setDialogOpen(false)
      setForm(INITIAL_FORM)
      await loadContacts()
    } catch {
      setSubmitError(t('errors.serverError'))
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = form.contact_name && form.contact_type && (form.email || form.phone)

  const filtered = useMemo(() => {
    if (!search) return contacts
    const q = search.toLowerCase()
    return contacts.filter(c =>
      c.contactName.toLowerCase().includes(q) ||
      c.contactType?.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [contacts, search])

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={56} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('contacts.title')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('contacts.subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          {t('contacts.addContact')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <TextField
        placeholder={t('contacts.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
        }}
      />

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('contacts.name')}</TableCell>
              <TableCell>{t('contacts.type')}</TableCell>
              <TableCell>{t('contacts.company')}</TableCell>
              <TableCell>{t('contacts.email')}</TableCell>
              <TableCell>{t('contacts.phone')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {search ? t('contacts.noSearchResults') : t('contacts.noContactsYet')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((contact) => (
                <TableRow key={contact.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: getAvatarColor(contact.contactName), width: 36, height: 36, fontSize: '0.85rem' }}>
                        {getInitials(contact.contactName)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>{contact.contactName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{contact.contactType || '-'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{contact.companyName || '-'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{contact.email || '-'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{contact.phone || '-'}</Typography></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('contacts.addContact')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
          <TextField label={t('contacts.contactName')} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required fullWidth />
          <TextField label={t('contacts.contactType')} value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })} select required fullWidth>
            {CONTACT_TYPES.map((type) => (
              <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>{type}</MenuItem>
            ))}
          </TextField>
          <TextField label={t('contacts.company')} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} fullWidth />
          <TextField
            label={t('contacts.email')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            type="email"
            fullWidth
            required={!form.phone}
            helperText={!form.email && !form.phone ? t('contacts.emailOrPhoneRequired') : ""}
            error={!form.email && !form.phone && (form.contact_name.length > 0)}
          />
          <TextField
            label={t('contacts.phone')}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            fullWidth
            required={!form.email}
          />
          <TextField label={t('contacts.roleDescription')} value={form.role_description} onChange={(e) => setForm({ ...form, role_description: e.target.value })} multiline rows={2} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !isFormValid}>
            {submitting ? t('common.creating') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
