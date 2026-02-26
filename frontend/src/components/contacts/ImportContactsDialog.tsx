import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { CloseIcon, CloudUploadIcon, ContactPhoneIcon, FileUploadIcon, CheckCircleIcon, PersonIcon, DeleteIcon } from '@/icons'
import { contactsApi, type ContactImportRow, type ContactImportResult } from '../../api/contacts'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography,
  styled, Tab, Tabs, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, Alert, LinearProgress, TextField as MuiTextField, MenuItem,
  CircularProgress,
} from '@/mui'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const CONTACTS_SCOPE = 'https://www.googleapis.com/auth/contacts.readonly'
const PEOPLE_API = 'https://people.googleapis.com/v1/people/me/connections'

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

interface TokenResponse {
  access_token: string
  error?: string
  error_description?: string
}

interface TokenClient {
  requestAccessToken: (config?: { prompt?: string }) => void
  callback: (response: TokenResponse) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type: string; message: string }) => void
          }) => TokenClient
        }
      }
    }
  }
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

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return }
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)
    if (existing) { existing.addEventListener('load', () => resolve()); return }
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google'))
    document.head.appendChild(script)
  })
}

async function fetchGoogleContacts(accessToken: string): Promise<PhoneContact[]> {
  const allContacts: PhoneContact[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers',
      pageSize: '1000',
      sortOrder: 'FIRST_NAME_ASCENDING',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`${PEOPLE_API}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Google API error: ${res.status}`)

    const data = await res.json()
    if (data.connections) {
      for (const c of data.connections) {
        const nameObj = c.names?.find((n: any) => n.metadata?.primary) ?? c.names?.[0]
        const emailObj = c.emailAddresses?.find((e: any) => e.metadata?.primary) ?? c.emailAddresses?.[0]
        const phoneObj = c.phoneNumbers?.find((p: any) => p.metadata?.primary) ?? c.phoneNumbers?.[0]
        const name = nameObj?.displayName || ''
        if (name) {
          allContacts.push({ name, email: emailObj?.value || '', phone: phoneObj?.value || '', selected: true })
        }
      }
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return allContacts
}

export default function ImportContactsDialog({ open, onClose, projectId, onImportComplete }: ImportContactsDialogProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const vcfInputRef = useRef<HTMLInputElement>(null)
  const tokenClientRef = useRef<TokenClient | null>(null)
  const [tab, setTab] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ContactImportResult | null>(null)
  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([])
  const [phoneContactType, setPhoneContactType] = useState('contractor')
  const [vcfError, setVcfError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const phoneSupported = 'contacts' in navigator && 'ContactsManager' in window
  const googleConfigured = !!GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!googleConfigured) return
    loadGisScript().then(() => {
      if (!window.google?.accounts?.oauth2) return
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: CONTACTS_SCOPE,
        callback: () => {},
        error_callback: () => {
          setGoogleLoading(false)
          setGoogleError(t('contacts.import.googleError'))
        },
      })
    }).catch(() => {})
  }, [googleConfigured, t])

  const reset = () => {
    setFile(null)
    setResult(null)
    setPhoneContacts([])
    setImporting(false)
    setDragOver(false)
    setVcfError('')
    setGoogleError('')
    setGoogleLoading(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.csv')) { setFile(droppedFile); setResult(null) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) { setFile(selected); setResult(null) }
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
    } finally { setImporting(false) }
  }

  const handleGoogleImport = useCallback(() => {
    if (!tokenClientRef.current) return
    setGoogleLoading(true)
    setGoogleError('')

    tokenClientRef.current.callback = async (response: TokenResponse) => {
      if (response.error) {
        setGoogleError(response.error_description || t('contacts.import.googleError'))
        setGoogleLoading(false)
        return
      }
      try {
        const contacts = await fetchGoogleContacts(response.access_token)
        if (contacts.length === 0) {
          setGoogleError(t('contacts.import.googleEmpty'))
          setGoogleLoading(false)
          return
        }
        setPhoneContacts(prev => {
          const existingNames = new Set(prev.map(p => p.name))
          const newOnes = contacts.filter(c => !existingNames.has(c.name))
          return [...prev, ...newOnes]
        })
      } catch {
        setGoogleError(t('contacts.import.googleError'))
      } finally { setGoogleLoading(false) }
    }

    tokenClientRef.current.requestAccessToken({ prompt: 'consent' })
  }, [t])

  const handlePickPhoneContacts = async () => {
    try {
      const props = ['name', 'email', 'tel']
      const contacts = await (navigator as any).contacts.select(props, { multiple: true })
      const mapped: PhoneContact[] = contacts.map((c: any) => ({
        name: c.name?.[0] || '', email: c.email?.[0] || '', phone: c.tel?.[0] || '', selected: true,
      })).filter((c: PhoneContact) => c.name)
      setPhoneContacts(prev => {
        const existingNames = new Set(prev.map(p => p.name))
        const newOnes = mapped.filter((c: PhoneContact) => !existingNames.has(c.name))
        return [...prev, ...newOnes]
      })
    } catch { /* User cancelled */ }
  }

  const handleVcfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    e.target.value = ''
    setVcfError('')
    try {
      const text = await selected.text()
      const parsed = parseVCard(text)
      if (parsed.length === 0) { setVcfError(t('contacts.import.vcfEmpty')); return }
      setPhoneContacts(prev => {
        const existingNames = new Set(prev.map(p => p.name))
        const newOnes = parsed.filter(c => !existingNames.has(c.name))
        return [...prev, ...newOnes]
      })
    } catch { setVcfError(t('contacts.import.vcfError')) }
  }

  const handlePhoneImport = async () => {
    const selected = phoneContacts.filter(c => c.selected)
    if (selected.length === 0) return
    setImporting(true)
    try {
      const rows: ContactImportRow[] = selected.map(c => ({
        contact_name: c.name, contact_type: phoneContactType,
        email: c.email || undefined, phone: c.phone || undefined,
      }))
      const res = await contactsApi.importBulk(projectId, rows)
      setResult(res)
      if (res.importedCount > 0) onImportComplete()
    } catch {
      setResult({ importedCount: 0, skippedCount: 0, errors: [t('contacts.import.failed')] })
    } finally { setImporting(false) }
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
    } catch { /* silent */ }
  }

  const selectedPhoneCount = phoneContacts.filter(c => c.selected).length

  return (
    <StyledDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={700}>{t('contacts.import.title')}</Typography>
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: 350 }}>
        {(importing || googleLoading) && <LinearProgress />}

        {result ? (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: result.importedCount > 0 ? 'success.main' : 'warning.main' }} />
            <Typography variant="h6" fontWeight={600}>{t('contacts.import.resultTitle')}</Typography>
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
                <DropZone isDragOver={dragOver} onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleFileDrop}>
                  <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" fontWeight={600}>{t('contacts.import.dropFile')}</Typography>
                  <Typography variant="body2" color="text.secondary">{t('contacts.import.csvOnly')}</Typography>
                </DropZone>
                {file && <Alert severity="info" icon={<FileUploadIcon />}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</Alert>}
                <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>{t('contacts.import.csvFormat')}</Typography>
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                    contact_name, contact_type, company_name, email, phone, role_description
                  </Typography>
                </Alert>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="secondary" size="small" onClick={handleExport}>{t('contacts.import.downloadTemplate')}</Button>
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
                      {t('contacts.import.pickDescriptionSmart')}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
                      {googleConfigured && (
                        <Button variant="primary" onClick={handleGoogleImport} disabled={googleLoading}
                          icon={googleLoading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}>
                          {t('contacts.import.googleImport')}
                        </Button>
                      )}

                      {phoneSupported && (
                        <Button variant={googleConfigured ? 'secondary' : 'primary'} icon={<ContactPhoneIcon />} onClick={handlePickPhoneContacts}>
                          {t('contacts.import.openContacts')}
                        </Button>
                      )}

                      <Button variant="secondary" icon={<FileUploadIcon />} onClick={() => vcfInputRef.current?.click()}>
                        {t('contacts.import.uploadVcf')}
                      </Button>

                      {!googleConfigured && !phoneSupported && (
                        <Alert severity="info" sx={{ mt: 1, textAlign: 'start', '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>{t('contacts.import.vcfHowTitle')}</Typography>
                          <Typography variant="body2" color="text.secondary">{t('contacts.import.vcfHowDescription')}</Typography>
                        </Alert>
                      )}
                    </Box>

                    {googleError && <Alert severity="error" sx={{ mt: 2 }}>{googleError}</Alert>}
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {t('contacts.import.selectedCount', { count: selectedPhoneCount })}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {googleConfigured && (
                          <Button variant="secondary" size="small" onClick={handleGoogleImport} disabled={googleLoading}
                            icon={googleLoading ? <CircularProgress size={14} color="inherit" /> : <GoogleIcon />}>
                            {t('contacts.import.googleAdd')}
                          </Button>
                        )}
                        {phoneSupported && (
                          <Button variant="secondary" size="small" icon={<ContactPhoneIcon />} onClick={handlePickPhoneContacts}>
                            {t('contacts.import.selectContacts')}
                          </Button>
                        )}
                        <Button variant="secondary" size="small" icon={<FileUploadIcon />} onClick={() => vcfInputRef.current?.click()}>
                          {t('contacts.import.addMore')}
                        </Button>
                      </Box>
                    </Box>

                    {googleError && <Alert severity="error">{googleError}</Alert>}

                    <MuiTextField select fullWidth size="small" label={t('contacts.import.defaultType')}
                      value={phoneContactType} onChange={(e) => setPhoneContactType(e.target.value)}>
                      {CONTACT_TYPES.map(ct => <MenuItem key={ct} value={ct}>{t(`contacts.types.${ct}`)}</MenuItem>)}
                    </MuiTextField>

                    <TableContainer sx={{ maxHeight: 250, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox checked={phoneContacts.every(c => c.selected)}
                                indeterminate={phoneContacts.some(c => c.selected) && !phoneContacts.every(c => c.selected)}
                                onChange={toggleAllPhoneContacts} size="small" />
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
