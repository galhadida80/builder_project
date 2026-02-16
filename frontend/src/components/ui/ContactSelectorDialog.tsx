import { useState, useEffect } from 'react'
import { Button } from './Button'
import { contactsApi } from '../../api/contacts'
import type { Contact } from '../../types'
import { useTranslation } from 'react-i18next'
import { PersonIcon } from '@/icons'
import { Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField as MuiTextField, Box, Typography, CircularProgress, Alert } from '@/mui'

interface ContactSelectorDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (consultantContactId?: string, inspectorContactId?: string) => void
  projectId: string
  loading?: boolean
}

export default function ContactSelectorDialog({
  open,
  onClose,
  onConfirm,
  projectId,
  loading = false,
}: ContactSelectorDialogProps) {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [consultantContact, setConsultantContact] = useState<Contact | null>(null)
  const [inspectorContact, setInspectorContact] = useState<Contact | null>(null)
  const [showValidation, setShowValidation] = useState(false)

  const hasSelection = !!(consultantContact || inspectorContact)

  useEffect(() => {
    if (!open) return
    setConsultantContact(null)
    setInspectorContact(null)
    setShowValidation(false)
    const loadContacts = async () => {
      setContactsLoading(true)
      try {
        const data = await contactsApi.list(projectId)
        setContacts(data)
      } catch {
        setContacts([])
      } finally {
        setContactsLoading(false)
      }
    }
    loadContacts()
  }, [open, projectId])

  const consultantOptions = contacts.filter(c => c.contactType === 'consultant' || c.contactType === 'engineer')
  const inspectorOptions = contacts.filter(c => c.contactType === 'inspector' || c.contactType === 'supervisor')

  const handleConfirm = () => {
    if (!hasSelection) {
      setShowValidation(true)
      return
    }
    onConfirm(consultantContact?.id, inspectorContact?.id)
  }

  const renderOption = (props: React.HTMLAttributes<HTMLLIElement> & { key?: string }, option: Contact) => {
    const { key, ...rest } = props
    return (
      <li key={key} {...rest}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
          <PersonIcon fontSize="small" color="action" />
          <Box>
            <Typography variant="body2" fontWeight={500}>{option.contactName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {[option.companyName, option.roleDescription].filter(Boolean).join(' - ')}
            </Typography>
          </Box>
        </Box>
      </li>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={{ zIndex: 1500 }}>
      <DialogTitle>{t('contactSelector.selectApprovers')}</DialogTitle>
      <DialogContent>
        {contactsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {showValidation && !hasSelection && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                {t('contactSelector.requiredHint')}
              </Alert>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                {t('contactSelector.step1Consultant')}
              </Typography>
              <Autocomplete
                options={consultantOptions}
                value={consultantContact}
                onChange={(_, value) => { setConsultantContact(value); setShowValidation(false) }}
                getOptionLabel={(o) => `${o.contactName}${o.companyName ? ` (${o.companyName})` : ''}`}
                renderOption={renderOption}
                renderInput={(params) => (
                  <MuiTextField
                    {...params}
                    size="small"
                    placeholder={t('contactSelector.selectConsultant')}
                  />
                )}
                noOptionsText={t('contactSelector.noContacts')}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                {t('contactSelector.step2Inspector')}
              </Typography>
              <Autocomplete
                options={inspectorOptions}
                value={inspectorContact}
                onChange={(_, value) => { setInspectorContact(value); setShowValidation(false) }}
                getOptionLabel={(o) => `${o.contactName}${o.companyName ? ` (${o.companyName})` : ''}`}
                renderOption={renderOption}
                renderInput={(params) => (
                  <MuiTextField
                    {...params}
                    size="small"
                    placeholder={t('contactSelector.selectInspector')}
                  />
                )}
                noOptionsText={t('contactSelector.noContacts')}
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={handleConfirm} loading={loading} disabled={!hasSelection && showValidation}>
          {t('contactSelector.confirmSubmit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
