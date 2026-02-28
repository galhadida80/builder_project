import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LockIcon, FingerprintIcon, CheckCircleIcon, InfoIcon, SecurityIcon, ChevronLeftIcon, ChevronRightIcon } from '@/icons'
import { Box, Typography, Divider, Chip, useTheme } from '@/mui'
import { Card } from '../ui/Card'
import { SettingsRow } from './SettingsRow'

export default function SettingsSecurity() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useTheme()
  const ChevronIcon = theme.direction === 'rtl' ? ChevronLeftIcon : ChevronRightIcon

  return (
    <>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
          {t('settings.security')}
        </Typography>
        <Card>
          <SettingsRow
            icon={<LockIcon sx={{ color: 'primary.main' }} />}
            label={t('settings.changePassword')}
            action={<ChevronIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
            onClick={() => navigate('/forgot-password')}
          />
          <Divider />
          <SettingsRow
            icon={<FingerprintIcon sx={{ color: 'primary.main' }} />}
            label={t('settings.passkey')}
            action={<ChevronIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
            onClick={() => navigate('/profile')}
          />
          <Divider />
          <SettingsRow
            icon={<CheckCircleIcon sx={{ color: 'text.disabled' }} />}
            label={t('settings.twoFactorAuth')}
            action={
              <Chip label={t('settings.comingSoon')} size="small" sx={{ bgcolor: 'action.disabledBackground', color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem', height: 24 }} />
            }
          />
        </Card>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', px: 1, mb: 1, display: 'block' }}>
          {t('settings.info')}
        </Typography>
        <Card>
          <SettingsRow
            icon={<InfoIcon sx={{ color: 'primary.main' }} />}
            label={t('settings.version')}
            action={<Typography variant="body2" color="text.secondary">v2.4.1</Typography>}
          />
          <Divider />
          <SettingsRow
            icon={<SecurityIcon sx={{ color: 'primary.main' }} />}
            label={t('settings.privacyPolicy')}
            action={<ChevronIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
            onClick={() => window.open('https://builderops.dev/privacy', '_blank')}
          />
        </Card>
      </Box>
    </>
  )
}
