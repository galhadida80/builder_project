import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { useToast } from '../components/common/ToastProvider'
import { subcontractorsApi, SubcontractorProfile, SubcontractorProfileCreate } from '../api/subcontractors'
import {
  Box,
  Typography,
  Chip,
  Skeleton,
  TextField as MuiTextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@/mui'
import { EditIcon, PersonIcon, CheckCircleIcon } from '@/icons'

export default function SubcontractorPortalPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()

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
        <Skeleton height={200} />
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
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6">{t('subcontractors.noProfile')}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('subcontractors.noProfileDescription')}
          </Typography>
          <Button onClick={openEditDialog}>{t('subcontractors.createProfile')}</Button>
        </Card>
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
              <InfoRow label={t('subcontractors.insuranceExpiry')} value={profile.insuranceExpiry ? new Date(profile.insuranceExpiry).toLocaleDateString() : undefined} />
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {profile ? t('subcontractors.editProfile') : t('subcontractors.createProfile')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <MuiTextField
            label={t('subcontractors.companyName')}
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            required
            fullWidth
          />
          <MuiTextField
            label={t('subcontractors.trade')}
            value={form.trade}
            onChange={(e) => setForm({ ...form, trade: e.target.value })}
            required
            fullWidth
          />
          <MuiTextField
            label={t('subcontractors.licenseNumber')}
            value={form.licenseNumber}
            onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
            fullWidth
          />
          <MuiTextField
            label={t('subcontractors.contactEmail')}
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            fullWidth
          />
          <MuiTextField
            label={t('subcontractors.contactPhone')}
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            fullWidth
          />
          <MuiTextField
            label={t('subcontractors.address')}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />
          <MuiTextField
            label={t('subcontractors.notes')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t('close')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('subcontractors.saving') : t('subcontractors.save')}
          </Button>
        </DialogActions>
      </Dialog>
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
