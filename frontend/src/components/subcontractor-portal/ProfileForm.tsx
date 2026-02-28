import { useTranslation } from 'react-i18next'
import { Box } from '@/mui'
import { TextField } from '../ui/TextField'
import type { SubcontractorProfileCreate } from '../../api/subcontractors'

interface ProfileFormProps {
  form: SubcontractorProfileCreate
  onChange: (form: SubcontractorProfileCreate) => void
}

export function ProfileForm({ form, onChange }: ProfileFormProps) {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label={t('subcontractors.companyName')}
        value={form.companyName}
        onChange={(e) => onChange({ ...form, companyName: e.target.value })}
        required
        fullWidth
      />
      <TextField
        label={t('subcontractors.trade')}
        value={form.trade}
        onChange={(e) => onChange({ ...form, trade: e.target.value })}
        required
        fullWidth
      />
      <TextField
        label={t('subcontractors.licenseNumber')}
        value={form.licenseNumber}
        onChange={(e) => onChange({ ...form, licenseNumber: e.target.value })}
        fullWidth
      />
      <TextField
        label={t('subcontractors.contactEmail')}
        value={form.contactEmail}
        onChange={(e) => onChange({ ...form, contactEmail: e.target.value })}
        fullWidth
      />
      <TextField
        label={t('subcontractors.contactPhone')}
        value={form.contactPhone}
        onChange={(e) => onChange({ ...form, contactPhone: e.target.value })}
        fullWidth
      />
      <TextField
        label={t('subcontractors.address')}
        value={form.address}
        onChange={(e) => onChange({ ...form, address: e.target.value })}
        multiline
        rows={2}
        fullWidth
      />
      <TextField
        label={t('subcontractors.notes')}
        value={form.notes}
        onChange={(e) => onChange({ ...form, notes: e.target.value })}
        multiline
        rows={2}
        fullWidth
      />
    </Box>
  )
}
