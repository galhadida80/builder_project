import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { contactsApi } from '../../api/contacts'
import type { Contact } from '../../types'
import { PersonIcon, GroupIcon, CloseIcon } from '@/icons'
import { Box, Typography, Autocomplete, TextField as MuiTextField, Chip, CircularProgress, Avatar } from '@/mui'

interface Recipient {
  contactId: string
  contactName: string
  email?: string
  companyName?: string
  contactType?: string
}

interface RecipientSelectorProps {
  projectId: string
  label: string
  value: Recipient[]
  onChange: (recipients: Recipient[]) => void
  filterTypes?: string[]
  placeholder?: string
  multiple?: boolean
  required?: boolean
  error?: string
  helperText?: string
}

export default function RecipientSelector({
  projectId,
  label,
  value,
  onChange,
  filterTypes,
  placeholder,
  multiple = true,
  required = false,
  error,
  helperText,
}: RecipientSelectorProps) {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) return
    const loadContacts = async () => {
      setLoading(true)
      try {
        const data = await contactsApi.list(projectId)
        setContacts(data)
      } catch {
        setContacts([])
      } finally {
        setLoading(false)
      }
    }
    loadContacts()
  }, [projectId])

  const filteredContacts = filterTypes?.length
    ? contacts.filter(c => filterTypes.includes(c.contactType))
    : contacts

  const selectedIds = new Set(value.map(r => r.contactId))

  const availableOptions = filteredContacts.filter(c => !selectedIds.has(c.id))

  const contactToRecipient = (contact: Contact): Recipient => ({
    contactId: contact.id,
    contactName: contact.contactName,
    email: contact.email,
    companyName: contact.companyName,
    contactType: contact.contactType,
  })

  const getTypeColor = (type?: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' | 'default' => {
    switch (type) {
      case 'consultant': return 'primary'
      case 'engineer': return 'info'
      case 'supervisor': return 'warning'
      case 'inspector': return 'success'
      case 'contractor': return 'secondary'
      default: return 'default'
    }
  }

  const renderOption = (props: React.HTMLAttributes<HTMLLIElement> & { key?: string }, option: Contact) => {
    const { key, ...rest } = props
    return (
      <li key={key} {...rest}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, width: '100%' }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: `${getTypeColor(option.contactType)}.light` }}>
            <PersonIcon sx={{ fontSize: 16, color: `${getTypeColor(option.contactType)}.main` }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={500} noWrap>
              {option.contactName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {[option.companyName, option.email].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Chip
            label={t(`contacts.types.${option.contactType}`)}
            size="small"
            color={getTypeColor(option.contactType)}
            sx={{ height: 20, fontSize: 10 }}
          />
        </Box>
      </li>
    )
  }

  if (multiple) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <GroupIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={600}>
            {label}
            {required && <span style={{ color: 'red' }}> *</span>}
          </Typography>
        </Box>

        <Autocomplete
          multiple
          options={availableOptions}
          value={contacts.filter(c => selectedIds.has(c.id))}
          loading={loading}
          onChange={(_, selected) => {
            onChange(selected.map(contactToRecipient))
          }}
          getOptionLabel={(option) => option.contactName}
          isOptionEqualToValue={(option, val) => option.id === val.id}
          renderOption={renderOption}
          slotProps={{ popper: { sx: { zIndex: 1400 } } }}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index })
              return (
                <Chip
                  key={key}
                  {...tagProps}
                  label={option.contactName}
                  size="small"
                  color={getTypeColor(option.contactType)}
                  deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontWeight: 500 }}
                />
              )
            })
          }
          renderInput={(params) => (
            <MuiTextField
              {...params}
              size="small"
              placeholder={value.length === 0 ? (placeholder || t('recipientSelector.placeholder')) : ''}
              error={!!error}
              helperText={error || helperText}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress size={18} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          noOptionsText={t('recipientSelector.noContacts')}
        />

        {value.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {t('recipientSelector.selected', { count: value.length })}
          </Typography>
        )}
      </Box>
    )
  }

  const selectedContact = contacts.find(c => value[0]?.contactId === c.id) || null

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <PersonIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
          {required && <span style={{ color: 'red' }}> *</span>}
        </Typography>
      </Box>

      <Autocomplete
        options={filteredContacts}
        value={selectedContact}
        loading={loading}
        onChange={(_, selected) => {
          onChange(selected ? [contactToRecipient(selected)] : [])
        }}
        getOptionLabel={(option) => option.contactName}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        renderOption={renderOption}
        slotProps={{ popper: { sx: { zIndex: 1400 } } }}
        renderInput={(params) => (
          <MuiTextField
            {...params}
            size="small"
            placeholder={placeholder || t('recipientSelector.placeholder')}
            error={!!error}
            helperText={error || helperText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        noOptionsText={t('recipientSelector.noContacts')}
      />
    </Box>
  )
}

export type { Recipient, RecipientSelectorProps }
