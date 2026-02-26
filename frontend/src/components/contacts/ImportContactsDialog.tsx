import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { CloseIcon, CloudUploadIcon, ContactPhoneIcon, FileUploadIcon, CheckCircleIcon, PersonIcon, DeleteIcon } from '@/icons'
import { contactsApi, type ContactImportRow, type ContactImportResult } from '../../api/contacts'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography,
  styled, Tab, Tabs, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, Alert, LinearProgress, TextField as MuiTextField, MenuItem,
} from '@/mui'

interface ImportContactsDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onImportComplete: () => void
}

interface PhoneContact {
  name: string
  email: string
  phone: string
  selected: boolean
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: theme.shadows[8],
    overflow: 'hidden',
    maxHeight: 'calc(100% - 32px)',
    display: 'flex',
    flexDirection: 'column',
  },
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
  },
}))

const DropZone = styled(Box, { shouldForwardProp: (p) => p !== 'isDragOver' })<{ isDragOver?: boolean }>(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 12,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: isDragOver ? `${theme.palette.primary.main}08` : 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: `${theme.palette.primary.main}05`,
  },
}))

const CONTACT_TYPES = ['contractor', 'consultant', 'supplier', 'supervisor', 'inspector', 'engineer', 'manager', 'other']

function parseVCard(text: string): PhoneContact[] {
  const contacts: PhoneContact[] = []
  const cards = text.split('BEGIN:VCARD').filter(c => c.trim())
  for (const card of cards) {
    const lines = card.split(/\r?\n/)
    let name = ''
    let email = ''
    let phone = ''
    for (const line of lines) {
      const upper = line.toUpperCase()
      if (upper.startsWith('FN:') || upper.startsWith('FN;')) {
        name = line.substring(line.indexOf(':') + 1).trim()
      } else if (!name && (upper.startsWith('N:') || upper.startsWith('N;'))) {
        const parts = line.substring(line.indexOf(':') + 1).split(';')
        const lastName = (parts[0] || '').trim()
        const firstName = (parts[1] || '').trim()
        name = [firstName, lastName].filter(Boolean).join(' ')
      } else if (!email && (upper.startsWith('EMAIL:') || upper.startsWith('EMAIL;'))) {
        email = line.substring(line.indexOf(':') + 1).trim()
      } else if (!phone && (upper.startsWith('TEL:') || upper.startsWith('TEL;'))) {
        phone = line.substring(line.indexOf(':') + 1).trim()
      }
    }
    if (name) {
      contacts.push({ name, email, phone, selected: true })
    }
  }
  return contacts
}

export default function ImportContactsDialog({ open, onClose, projectId, onImportComplete }: ImportContactsDialogProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const vcfInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ContactImportResult | null>(null)
  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([])
  const [phoneContactType, setPhoneContactType] = useState('contractor')
  const [vcfError, setVcfError] = useState('')
  const phoneSupported = 'contacts' in navigator && 'ContactsManager' in window

  const reset = () => {
    setFile(null)
    setResult(null)
    setPhoneContacts([])
    setImporting(false)
    setDragOver(false)
    setVcfError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile)
      setResult(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
    }
  }

  const handleCsvImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const res = await contactsApi.importCsv(projectId, file)
      setResult(res)
      if (res.importedCount > 0) onImportComplete()
    } catch {
      setResult({ importedCount: 0, skippedCount: 0, errors: [t('contacts.import.failed')] })
    } finally {
      setImporting(false)
    }
  }

  const handlePickPhoneContacts = async () => {
    try {
      const props = ['name', 'email', 'tel']
      const contacts = await (navigator as any).contacts.select(props, { multiple: true })
      const mapped: PhoneContact[] = contacts.map((c: any) => ({
        name: c.name?.[0] || '',
        email: c.email?.[0] || '',
        phone: c.tel?.[0] || '',
        selected: true,
      })).filter((c: PhoneContact) => c.name)
      setPhoneContacts(prev => {
        const existingNames = new Set(prev.map(p => p.name))
        const newOnes = mapped.filter((c: PhoneContact) => !existingNames.has(c.name))
        return [...prev, ...newOnes]
      })
    } catch {
      // User cancelled picker
    }
  }

  const handleVcfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    e.target.value = ''
    setVcfError('')
    try {
      const text = await selected.text()
      const parsed = parseVCard(text)
      if (parsed.length === 0) {
        setVcfError(t('contacts.import.vcfEmpty'))
        return
      }
      setPhoneContacts(prev => {
        const existingNames = new Set(prev.map(p => p.name))
        const newOnes = parsed.filter(c => !existingNames.has(c.name))
        return [...prev, ...newOnes]
      })
    } catch {
      setVcfError(t('contacts.import.vcfError'))
    }
  }

  const handlePhoneImport = async () => {
    const selected = phoneContacts.filter(c => c.selected)
    if (selected.length === 0) return
    setImporting(true)
    try {
      const rows: ContactImportRow[] = selected.map(c => ({
        contact_name: c.name,
        contact_type: phoneContactType,
        email: c.email || undefined,
        phone: c.phone || undefined,
      }))
      const res = await contactsApi.importBulk(projectId, rows)
      setResult(res)
      if (res.importedCount > 0) onImportComplete()
    } catch {
      setResult({ importedCount: 0, skippedCount: 0, errors: [t('contacts.import.failed')] })
    } finally {
      setImporting(false)
    }
  }

  const togglePhoneContact = (index: number) => {
    setPhoneContacts(prev => prev.map((c, i) => i === index ? { ...c, selected: !c.selected } : c))
  }

  const toggleAllPhoneContacts = () => {
    const allSelected = phoneContacts.every(c => c.selected)
    setPhoneContacts(prev => prev.map(c => ({ ...c, selected: !allSelected })))
  }

  const removePhoneContact = (index: number) => {
    setPhoneContacts(prev => prev.filter((_, i) => i !== index))
  }

  const handleExport = async () => {
    try {
      const blob = await contactsApi.exportCsv(projectId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts_${projectId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    }
  }

  const selectedPhoneCount = phoneContacts.filter(c => c.selected).length

  return (
    <StyledDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={700}>{t('contacts.import.title')}</Typography>
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: 350 }}>
        {importing && <LinearProgress />}

        {result ? (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: result.importedCount > 0 ? 'success.main' : 'warning.main' }} />
            <Typography variant="h6" fontWeight={600}>
              {t('contacts.import.resultTitle')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip label={`${result.importedCount} ${t('contacts.import.imported')}`} color="success" variant="outlined" />
              {result.skippedCount > 0 && <Chip label={`${result.skippedCount} ${t('contacts.import.skipped')}`} color="warning" variant="outlined" />}
            </Box>
            {result.errors.length > 0 && (
              <Alert severity="warning" sx={{ width: '100%', mt: 1 }}>
                {result.errors.map((err, i) => <Typography key={i} variant="body2">{err}</Typography>)}
              </Alert>
            )}
          </Box>
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => { setTab(v); reset() }} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab icon={<FileUploadIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('contacts.import.fromFile')} sx={{ textTransform: 'none', minHeight: 48 }} />
              <Tab icon={<ContactPhoneIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('contacts.import.fromPhone')} sx={{ textTransform: 'none', minHeight: 48 }} />
            </Tabs>

            {tab === 0 && (
              <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleFileSelect} />
                <DropZone
                  isDragOver={dragOver}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                >
                  <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" fontWeight={600}>{t('contacts.import.dropFile')}</Typography>
                  <Typography variant="body2" color="text.secondary">{t('contacts.import.csvOnly')}</Typography>
                </DropZone>

                {file && (
                  <Alert severity="info" icon={<FileUploadIcon />}>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </Alert>
                )}

                <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>{t('contacts.import.csvFormat')}</Typography>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                    contact_name, contact_type, company_name, email, phone, role_description
                  </Typography>
                </Alert>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="secondary" size="small" onClick={handleExport}>
                    {t('contacts.import.downloadTemplate')}
                  </Button>
                </Box>
              </Box>
            )}

            {tab === 1 && (
              <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <input ref={vcfInputRef} type="file" accept=".vcf,.vcard" hidden onChange={handleVcfFileSelect} />

                {phoneContacts.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <ContactPhoneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                      {t('contacts.import.pickFromPhone')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {phoneSupported ? t('contacts.import.pickDescriptionNative') : t('contacts.import.pickDescription')}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
                      {phoneSupported ? (
                        <>
                          <Button variant="primary" icon={<ContactPhoneIcon />} onClick={handlePickPhoneContacts}>
                            {t('contacts.import.openContacts')}
                          </Button>
                          <Button variant="secondary" icon={<FileUploadIcon />} onClick={() => vcfInputRef.current?.click()}>
                            {t('contacts.import.uploadVcf')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="primary" icon={<FileUploadIcon />} onClick={() => vcfInputRef.current?.click()}>
                            {t('contacts.import.uploadVcf')}
                          </Button>
                          <Alert severity="info" sx={{ mt: 1, textAlign: 'start', '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                              {t('contacts.import.vcfHowTitle')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('contacts.import.vcfHowDescription')}
                            </Typography>
                          </Alert>
                        </>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {t('contacts.import.selectedCount', { count: selectedPhoneCount })}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {phoneSupported ? (
                          <>
                            <Button variant="secondary" size="small" icon={<ContactPhoneIcon />} onClick={handlePickPhoneContacts}>
                              {t('contacts.import.selectContacts')}
                            </Button>
                            <Button variant="secondary" size="small" icon={<FileUploadIcon />} onClick={() => vcfInputRef.current?.click()}>
                              {t('contacts.import.addMore')}
                            </Button>
                          </>
                        ) : (
                          <Button variant="secondary" size="small" icon={<FileUploadIcon />} onClick={() => vcfInputRef.current?.click()}>
                            {t('contacts.import.addMore')}
                          </Button>
                        )}
                      </Box>
                    </Box>

                    <MuiTextField
                      select fullWidth size="small"
                      label={t('contacts.import.defaultType')}
                      value={phoneContactType}
                      onChange={(e) => setPhoneContactType(e.target.value)}
                    >
                      {CONTACT_TYPES.map(ct => (
                        <MenuItem key={ct} value={ct}>{t(`contacts.types.${ct}`)}</MenuItem>
                      ))}
                    </MuiTextField>

                    <TableContainer sx={{ maxHeight: 250, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={phoneContacts.every(c => c.selected)}
                                indeterminate={phoneContacts.some(c => c.selected) && !phoneContacts.every(c => c.selected)}
                                onChange={toggleAllPhoneContacts}
                                size="small"
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('contacts.contactName')}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('contacts.phone')}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('contacts.email')}</TableCell>
                            <TableCell padding="checkbox" />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {phoneContacts.map((contact, i) => (
                            <TableRow key={i} hover>
                              <TableCell padding="checkbox">
                                <Checkbox checked={contact.selected} onChange={() => togglePhoneContact(i)} size="small" />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" noWrap>{contact.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell><Typography variant="body2" color="text.secondary" noWrap>{contact.phone || '—'}</Typography></TableCell>
                              <TableCell><Typography variant="body2" color="text.secondary" noWrap>{contact.email || '—'}</Typography></TableCell>
                              <TableCell padding="checkbox">
                                <IconButton size="small" onClick={() => removePhoneContact(i)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

                {vcfError && <Alert severity="error">{vcfError}</Alert>}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', gap: 1 }}>
        {result ? (
          <Button variant="primary" onClick={handleClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose}>{t('common.cancel')}</Button>
            {tab === 0 && (
              <Button variant="primary" onClick={handleCsvImport} disabled={!file || importing} loading={importing}>
                {t('contacts.import.importFile')}
              </Button>
            )}
            {tab === 1 && phoneContacts.length > 0 && (
              <Button variant="primary" onClick={handlePhoneImport} disabled={selectedPhoneCount === 0 || importing} loading={importing}>
                {t('contacts.import.importSelected', { count: selectedPhoneCount })}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </StyledDialog>
  )
}
