'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
import Checkbox from '@mui/material/Checkbox'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import UploadFileIcon from '@mui/icons-material/UploadFile'
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

interface CsvRow {
  contact_name: string
  contact_type: string
  company_name: string
  email: string
  phone: string
  role_description: string
  notes: string
}

interface Project {
  id: string
  name: string
  code: string
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

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
      current += char
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row as unknown as CsvRow
  }).filter(r => r.contact_name && r.contact_type)
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

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false)
  const [importTab, setImportTab] = useState(0)
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loadingProjectContacts, setLoadingProjectContacts] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Export CSV
  const handleExport = async () => {
    try {
      const res = await apiClient.get(`/projects/${projectId}/contacts/export`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts_${projectId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* noop */ }
  }

  // Open import dialog
  const openImport = async () => {
    setImportOpen(true)
    setImportTab(0)
    setCsvRows([])
    setSelectedRows(new Set())
    setImportError('')
    setImportSuccess('')
    setSelectedProjectId('')
    try {
      const res = await apiClient.get('/projects')
      const allProjects = (res.data || []) as Project[]
      setProjects(allProjects.filter((p: Project) => p.id !== projectId))
    } catch { /* noop */ }
  }

  // Handle CSV file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCsv(text)
      setCsvRows(rows)
      setSelectedRows(new Set(rows.map((_, i) => i)))
      setImportError(rows.length === 0 ? t('contacts.noContactsToImport') : '')
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Load contacts from another project
  const handleLoadFromProject = async () => {
    if (!selectedProjectId) return
    try {
      setLoadingProjectContacts(true)
      setImportError('')
      const res = await apiClient.get(`/projects/${selectedProjectId}/contacts/export`, { responseType: 'text' })
      const text = typeof res.data === 'string' ? res.data : await (res.data as Blob).text()
      const rows = parseCsv(text)
      setCsvRows(rows)
      setSelectedRows(new Set(rows.map((_, i) => i)))
      if (rows.length === 0) setImportError(t('contacts.noContactsToImport'))
    } catch {
      setImportError(t('errors.serverError'))
    } finally {
      setLoadingProjectContacts(false)
    }
  }

  // Toggle row selection
  const toggleRow = (idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedRows.size === csvRows.length) setSelectedRows(new Set())
    else setSelectedRows(new Set(csvRows.map((_, i) => i)))
  }

  // Import selected contacts
  const handleImportSelected = async () => {
    const selected = csvRows.filter((_, i) => selectedRows.has(i))
    if (selected.length === 0) return
    try {
      setImporting(true)
      setImportError('')
      const csvHeader = 'contact_name,contact_type,company_name,role_description,email,phone,notes'
      const csvBody = selected.map(r =>
        `"${r.contact_name}","${r.contact_type}","${r.company_name || ''}","${r.role_description || ''}","${r.email || ''}","${r.phone || ''}","${r.notes || ''}"`
      ).join('\n')
      const csvContent = csvHeader + '\n' + csvBody
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const formData = new FormData()
      formData.append('file', blob, 'import.csv')
      await apiClient.post(`/projects/${projectId}/contacts/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportSuccess(t('contacts.importSuccess', { count: selected.length }))
      setCsvRows([])
      setSelectedRows(new Set())
      await loadContacts()
    } catch {
      setImportError(t('errors.serverError'))
    } finally {
      setImporting(false)
    }
  }

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('contacts.title')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('contacts.subtitle')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport} disabled={contacts.length === 0} sx={{ textTransform: 'none' }}>
            {t('contacts.exportCsv')}
          </Button>
          <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={openImport} sx={{ textTransform: 'none' }}>
            {t('contacts.importCsv')}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            {t('contacts.addContact')}
          </Button>
        </Box>
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

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
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

      {/* Add Contact Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('contacts.addContact')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label={t('contacts.contactName')} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required fullWidth />
            <TextField label={t('contacts.contactType')} value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })} select required fullWidth>
              {CONTACT_TYPES.map((type) => (
                <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>{type}</MenuItem>
              ))}
            </TextField>
          </Box>
          <TextField label={t('contacts.company')} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} fullWidth />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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
          </Box>
          <TextField label={t('contacts.roleDescription')} value={form.role_description} onChange={(e) => setForm({ ...form, role_description: e.target.value })} multiline rows={2} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !isFormValid}>
            {submitting ? t('common.creating') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('contacts.importContacts')}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {importSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{importSuccess}</Alert>}
          {importError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{importError}</Alert>}

          <Tabs value={importTab} onChange={(_, v) => { setImportTab(v); setCsvRows([]); setSelectedRows(new Set()); setImportError(''); setImportSuccess('') }} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label={t('contacts.importFromFile')} sx={{ textTransform: 'none' }} />
            <Tab label={t('contacts.importFromProject')} sx={{ textTransform: 'none' }} />
          </Tabs>

          {importTab === 0 && (
            <Box>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: 'none' }} />
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 3,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'primary.main' },
                  mb: 2,
                }}
              >
                <UploadFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" fontWeight={500}>{t('contacts.dragOrClick')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('contacts.csvFormat')}</Typography>
              </Box>
            </Box>
          )}

          {importTab === 1 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                select
                label={t('contacts.selectProject')}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                sx={{ minWidth: 250, flex: 1 }}
                size="small"
              >
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name} ({p.code})</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                onClick={handleLoadFromProject}
                disabled={!selectedProjectId || loadingProjectContacts}
                startIcon={loadingProjectContacts ? <CircularProgress size={16} /> : undefined}
                sx={{ textTransform: 'none' }}
              >
                {t('contacts.loadContacts')}
              </Button>
            </Box>
          )}

          {csvRows.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={t('contacts.selectedCount', { count: selectedRows.size })} size="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">/ {csvRows.length}</Typography>
                </Box>
                <Button size="small" onClick={toggleAll} sx={{ textTransform: 'none' }}>
                  {selectedRows.size === csvRows.length ? t('contacts.deselectAll') : t('contacts.selectAll')}
                </Button>
              </Box>
              <TableContainer component={Paper} sx={{ maxHeight: 350, borderRadius: 2, overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRows.size === csvRows.length}
                          indeterminate={selectedRows.size > 0 && selectedRows.size < csvRows.length}
                          onChange={toggleAll}
                        />
                      </TableCell>
                      <TableCell>{t('contacts.name')}</TableCell>
                      <TableCell>{t('contacts.type')}</TableCell>
                      <TableCell>{t('contacts.company')}</TableCell>
                      <TableCell>{t('contacts.email')}</TableCell>
                      <TableCell>{t('contacts.phone')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvRows.map((row, idx) => (
                      <TableRow key={idx} hover onClick={() => toggleRow(idx)} sx={{ cursor: 'pointer' }}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedRows.has(idx)} />
                        </TableCell>
                        <TableCell>{row.contact_name}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{row.contact_type}</TableCell>
                        <TableCell>{row.company_name || '-'}</TableCell>
                        <TableCell>{row.email || '-'}</TableCell>
                        <TableCell>{row.phone || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImportOpen(false)}>{t('common.cancel')}</Button>
          {csvRows.length > 0 && (
            <Button
              variant="contained"
              onClick={handleImportSelected}
              disabled={importing || selectedRows.size === 0}
              startIcon={importing ? <CircularProgress size={16} /> : <FileUploadIcon />}
              sx={{ textTransform: 'none' }}
            >
              {importing ? t('contacts.importing') : t('contacts.importSelected')} ({selectedRows.size})
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
