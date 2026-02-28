import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../common/ToastProvider'
import { notificationsApi } from '../../api/notifications'
import { NotificationPreference, NotificationPreferenceUpdate, UrgencyLevel, DigestFrequency, NotificationCategory } from '../../types/notification'
import { CloseIcon, SettingsIcon, AccessTimeIcon } from '@/icons'
import { Drawer, Box, Typography, IconButton, Select, MenuItem, FormControl, styled, CircularProgress } from '@/mui'
import { SettingsRow } from '../settings/SettingsRow'
import { Card } from '../ui/Card'
import { CategoryPreferenceCard } from './CategoryPreferenceCard'

interface NotificationPreferencesProps {
  open: boolean
  onClose: () => void
}

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  zIndex: 1400,
  '& .MuiDrawer-paper': {
    width: 450,
    maxWidth: '100vw',
    backgroundColor: theme.palette.background.default,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },
}))

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: 'sticky',
  top: 0,
  backgroundColor: theme.palette.background.default,
  zIndex: 1,
}))

const Content = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowY: 'auto',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}))

const Section = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}))

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontSize: '0.75rem',
  paddingLeft: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
}))

const LoadingBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
}))

const categoryOrder: NotificationCategory[] = ['approval', 'inspection', 'defect', 'update', 'general']

export function NotificationPreferences({ open, onClose }: NotificationPreferencesProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferences] = useState<Map<string, NotificationPreference>>(new Map())

  useEffect(() => {
    if (open) {
      loadPreferences()
    }
  }, [open])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await notificationsApi.getPreferences()
      const prefsMap = new Map<string, NotificationPreference>()
      response.items.forEach((pref) => {
        prefsMap.set(pref.category, pref)
      })
      setPreferences(prefsMap)
    } catch (error) {
      showError(t('notificationPreferences.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const getOrCreatePreference = (category: string): NotificationPreference => {
    return preferences.get(category) || {
      id: '',
      userId: '',
      category,
      enabled: true,
      minUrgencyLevel: 'low' as UrgencyLevel,
      quietHoursStart: null,
      quietHoursEnd: null,
      emailEnabled: true,
      pushEnabled: true,
      digestFrequency: 'immediate' as DigestFrequency,
      createdAt: '',
      updatedAt: '',
    }
  }

  const updatePreference = async (category: string, updates: NotificationPreferenceUpdate) => {
    try {
      const existing = preferences.get(category)
      let updated: NotificationPreference

      if (existing && existing.id) {
        updated = await notificationsApi.updatePreference(existing.id, updates)
      } else {
        updated = await notificationsApi.createPreference({ category, ...updates })
      }

      const newPrefs = new Map(preferences)
      newPrefs.set(category, updated)
      setPreferences(newPrefs)
      showSuccess(t('notificationPreferences.saved'))
    } catch (error) {
      showError(t('notificationPreferences.saveError'))
    }
  }

  const renderTimeSelector = (value: string | null, onChange: (value: string) => void, label: string) => (
    <FormControl size="small" sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Select
        value={value || '22:00'}
        onChange={(e) => onChange(e.target.value)}
        variant="outlined"
        size="small"
      >
        {Array.from({ length: 24 }, (_, i) => {
          const hour = i.toString().padStart(2, '0')
          return (
            <MenuItem key={hour} value={`${hour}:00`}>
              {`${hour}:00`}
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  )

  return (
    <StyledDrawer anchor="right" open={open} onClose={onClose}>
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" component="div" fontWeight={600}>
            {t('notificationPreferences.title')}
          </Typography>
        </Box>
        <IconButton aria-label={t('notifications.closePanel')} onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Header>

      {loading ? (
        <LoadingBox>
          <CircularProgress />
        </LoadingBox>
      ) : (
        <Content>
          <Section>
            <SectionTitle>{t('notificationPreferences.categories')}</SectionTitle>
            {categoryOrder.map((category) => (
              <Box key={category} sx={{ mb: 2 }}>
                <CategoryPreferenceCard
                  category={category}
                  preference={getOrCreatePreference(category)}
                  onUpdate={(updates) => updatePreference(category, updates)}
                />
              </Box>
            ))}
          </Section>

          <Section>
            <SectionTitle>{t('notificationPreferences.digestSettings')}</SectionTitle>
            <Card>
              <SettingsRow
                icon={<AccessTimeIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
                label={t('notificationPreferences.digestFrequency')}
                subtitle={t('notificationPreferences.digestFrequencyDescription')}
                action={
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={getOrCreatePreference('general').digestFrequency}
                      onChange={(e) => updatePreference('general', { digestFrequency: e.target.value as DigestFrequency })}
                      variant="standard"
                      disableUnderline
                      sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                    >
                      <MenuItem value="immediate">{t('notificationPreferences.digestImmediate')}</MenuItem>
                      <MenuItem value="daily">{t('notificationPreferences.digestDaily')}</MenuItem>
                      <MenuItem value="weekly">{t('notificationPreferences.digestWeekly')}</MenuItem>
                    </Select>
                  </FormControl>
                }
              />
            </Card>
          </Section>

          <Section>
            <SectionTitle>{t('notificationPreferences.quietHours')}</SectionTitle>
            <Card>
              <Box sx={{ px: 2, py: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('notificationPreferences.quietHoursDescription')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {renderTimeSelector(
                    getOrCreatePreference('general').quietHoursStart,
                    (value) => updatePreference('general', { quietHoursStart: value }),
                    t('notificationPreferences.quietHoursStart')
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {t('notificationPreferences.to')}
                  </Typography>
                  {renderTimeSelector(
                    getOrCreatePreference('general').quietHoursEnd,
                    (value) => updatePreference('general', { quietHoursEnd: value }),
                    t('notificationPreferences.quietHoursEnd')
                  )}
                </Box>
              </Box>
            </Card>
          </Section>
        </Content>
      )}
    </StyledDrawer>
  )
}
