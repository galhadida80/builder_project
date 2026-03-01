import { useTranslation } from 'react-i18next'
import { Box, Typography, Paper, Chip } from '@/mui'
import { CheckCircleIcon } from '@/icons'
import { getDateLocale } from '../../utils/dateLocale'
import type { SubcontractorProfile } from '../../api/subcontractors'

interface ProfileViewProps {
  profile: SubcontractorProfile
}

export function ProfileView({ profile }: ProfileViewProps) {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {t('subcontractorPortal.profileInformation')}
          </Typography>
          <Chip
            icon={profile.isVerified ? <CheckCircleIcon /> : undefined}
            label={profile.isVerified ? t('subcontractors.verified') : t('subcontractors.unverified')}
            color={profile.isVerified ? 'success' : 'default'}
            size="small"
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          <InfoRow label={t('subcontractors.companyName')} value={profile.companyName} />
          <InfoRow
            label={t('subcontractors.trade')}
            value={t(`subcontractors.trades.${profile.trade}`, profile.trade)}
          />
          <InfoRow label={t('subcontractors.licenseNumber')} value={profile.licenseNumber} />
          <InfoRow label={t('subcontractors.contactEmail')} value={profile.contactEmail} />
          <InfoRow label={t('subcontractors.contactPhone')} value={profile.contactPhone} />
          <InfoRow
            label={t('subcontractors.insuranceExpiry')}
            value={
              profile.insuranceExpiry
                ? new Date(profile.insuranceExpiry).toLocaleDateString(getDateLocale())
                : undefined
            }
          />
        </Box>
        {profile.address && (
          <Box sx={{ mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
            <InfoRow label={t('subcontractors.address')} value={profile.address} />
          </Box>
        )}
        {profile.certifications.length > 0 && (
          <Box sx={{ mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.9rem' }}>
              {t('subcontractors.certifications')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {profile.certifications.map((cert, i) => (
                <Chip key={i} label={cert} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}
        {profile.notes && (
          <Box sx={{ mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
              {t('subcontractors.notes')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {profile.notes}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.9rem', color: value ? 'text.primary' : 'text.secondary' }}>
        {value || '-'}
      </Typography>
    </Box>
  )
}
