import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormModal } from '../ui/Modal'
import { ProfileForm } from './ProfileForm'
import { useToast } from '../common/ToastProvider'
import { subcontractorsApi, SubcontractorProfile, SubcontractorProfileCreate } from '@/api/subcontractors'
import { Fab, useMediaQuery, useTheme } from '@/mui'
import { EditIcon } from '@/icons'

interface ProfileSectionProps {
  profile: SubcontractorProfile | null
  onProfileUpdate: () => void
}

export function ProfileSection({ profile, onProfileUpdate }: ProfileSectionProps) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SubcontractorProfileCreate>({
    companyName: '',
    trade: '',
    licenseNumber: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    notes: '',
    certifications: [],
  })

  const openEditDialog = () => {
    if (profile) {
      setForm({
        companyName: profile.companyName,
        trade: profile.trade,
        licenseNumber: profile.licenseNumber || '',
        contactPhone: profile.contactPhone || '',
        contactEmail: profile.contactEmail || '',
        address: profile.address || '',
        notes: profile.notes || '',
        certifications: profile.certifications || [],
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.companyName || !form.trade) {
      showError(t('subcontractors.requiredFields'))
      return
    }
    setSaving(true)
    try {
      if (profile) {
        await subcontractorsApi.updateMyProfile(form)
        showSuccess(t('subcontractors.updateSuccess'))
      } else {
        await subcontractorsApi.createMyProfile(form)
        showSuccess(t('subcontractors.createSuccess'))
      }
      setDialogOpen(false)
      onProfileUpdate()
    } catch {
      showError(t('subcontractors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <FormModal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
        title={profile ? t('subcontractors.editProfile') : t('subcontractors.createProfile')}
        submitLabel={saving ? t('subcontractors.saving') : t('subcontractors.save')}
        loading={saving}
      >
        <ProfileForm form={form} onChange={setForm} />
      </FormModal>

      {isMobile && (
        <Fab
          color="primary"
          onClick={openEditDialog}
          sx={{ position: 'fixed', bottom: 80, insetInlineEnd: 16, zIndex: 10 }}
        >
          <EditIcon />
        </Fab>
      )}
    </>
  )
}

export function useProfileEditor(profile: SubcontractorProfile | null, onProfileUpdate: () => void) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SubcontractorProfileCreate>({
    companyName: '',
    trade: '',
    licenseNumber: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    notes: '',
    certifications: [],
  })

  const openEditDialog = () => {
    if (profile) {
      setForm({
        companyName: profile.companyName,
        trade: profile.trade,
        licenseNumber: profile.licenseNumber || '',
        contactPhone: profile.contactPhone || '',
        contactEmail: profile.contactEmail || '',
        address: profile.address || '',
        notes: profile.notes || '',
        certifications: profile.certifications || [],
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.companyName || !form.trade) {
      showError(t('subcontractors.requiredFields'))
      return
    }
    setSaving(true)
    try {
      if (profile) {
        await subcontractorsApi.updateMyProfile(form)
        showSuccess(t('subcontractors.updateSuccess'))
      } else {
        await subcontractorsApi.createMyProfile(form)
        showSuccess(t('subcontractors.createSuccess'))
      }
      setDialogOpen(false)
      onProfileUpdate()
    } catch {
      showError(t('subcontractors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return {
    dialogOpen,
    setDialogOpen,
    saving,
    form,
    setForm,
    openEditDialog,
    handleSave,
  }
}
