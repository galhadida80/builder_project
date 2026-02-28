import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { FormModal } from '../components/ui/Modal'
import { TextField } from '../components/ui/TextField'
import { useToast } from '../components/common/ToastProvider'
import { subcontractorsApi, SubcontractorProfile, SubcontractorProfileCreate } from '../api/subcontractors'
import { getDateLocale } from '../utils/dateLocale'
import { Box, Typography, Chip, Skeleton, Fab, useTheme, useMediaQuery } from '@/mui'
import { EditIcon, PersonIcon, CheckCircleIcon } from '@/icons'

export default function SubcontractorPortalPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [profile, setProfile] = useState<SubcontractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const data = await subcontractorsApi.getMyProfile()
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

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
      loadProfile()
    } catch {
      showError(t('subcontractors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box>
        <PageHeader title={t('subcontractors.portalTitle')} subtitle={t('subcontractors.portalSubtitle')} />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 2 }} />
          <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={t('subcontractors.portalTitle')}
        subtitle={t('subcontractors.portalSubtitle')}
        actions={
          <Button startIcon={profile ? <EditIcon /> : <PersonIcon />} onClick={openEditDialog}>
            {profile ? t('subcontractors.editProfile') : t('subcontractors.createProfile')}
          </Button>
        }
      />

      {!profile ? (
        <EmptyState
          icon={<PersonIcon sx={{ fontSize: 48 }} />}
          title={t('subcontractors.noProfile')}
          description={t('subcontractors.noProfileDescription')}
          action={{ label: t('subcontractors.createProfile'), onClick: openEditDialog }}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{profile.companyName}</Typography>
              <Chip
                icon={profile.isVerified ? <CheckCircleIcon /> : undefined}
                label={profile.isVerified ? t('subcontractors.verified') : t('subcontractors.unverified')}
                color={profile.isVerified ? 'success' : 'default'}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <InfoRow label={t('subcontractors.trade')} value={t(`subcontractors.trades.${profile.trade}`, profile.trade)} />
              <InfoRow label={t('subcontractors.licenseNumber')} value={profile.licenseNumber} />
              <InfoRow label={t('subcontractors.contactEmail')} value={profile.contactEmail} />
              <InfoRow label={t('subcontractors.contactPhone')} value={profile.contactPhone} />
              <InfoRow label={t('subcontractors.address')} value={profile.address} />
              <InfoRow label={t('subcontractors.insuranceExpiry')} value={profile.insuranceExpiry ? new Date(profile.insuranceExpiry).toLocaleDateString(getDateLocale()) : undefined} />
            </Box>
            {profile.certifications.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('subcontractors.certifications')}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {profile.certifications.map((cert, i) => (
                    <Chip key={i} label={cert} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}
            {profile.notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">{t('subcontractors.notes')}</Typography>
                <Typography variant="body2" color="text.secondary">{profile.notes}</Typography>
              </Box>
            )}
          </Card>
        </Box>
      )}

      <FormModal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
        title={profile ? t('subcontractors.editProfile') : t('subcontractors.createProfile')}
        submitLabel={saving ? t('subcontractors.saving') : t('subcontractors.save')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('subcontractors.companyName')}
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label={t('subcontractors.trade')}
            value={form.trade}
            onChange={(e) => setForm({ ...form, trade: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label={t('subcontractors.licenseNumber')}
            value={form.licenseNumber}
            onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
            fullWidth
          />
          <TextField
            label={t('subcontractors.contactEmail')}
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            fullWidth
          />
          <TextField
            label={t('subcontractors.contactPhone')}
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            fullWidth
          />
          <TextField
            label={t('subcontractors.address')}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />
          <TextField
            label={t('subcontractors.notes')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </FormModal>

      {isMobile && (
        <Fab
          color="primary"
          onClick={openEditDialog}
          sx={{ position: 'fixed', bottom: 80, insetInlineEnd: 16, zIndex: 10 }}
        >
          {profile ? <EditIcon /> : <PersonIcon />}
        </Fab>
      )}
    </Box>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value || '-'}</Typography>
    </Box>
  )
}
