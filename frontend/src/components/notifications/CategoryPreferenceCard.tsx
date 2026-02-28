import { useTranslation } from 'react-i18next'
import { NotificationPreference, NotificationPreferenceUpdate, UrgencyLevel } from '../../types/notification'
import { SettingsIcon, AccessTimeIcon, EmailIcon, NotificationsIcon } from '@/icons'
import { Box, Switch, Divider, Select, MenuItem, FormControl } from '@/mui'
import { SettingsRow } from '../settings/SettingsRow'
import { Card } from '../ui/Card'

interface CategoryPreferenceCardProps {
  category: string
  preference: NotificationPreference
  onUpdate: (updates: NotificationPreferenceUpdate) => void
}

export function CategoryPreferenceCard({ category, preference, onUpdate }: CategoryPreferenceCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <SettingsRow
        icon={<SettingsIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
        label={t(`notifications.categories.${category}`)}
        subtitle={t('notificationPreferences.enableCategory')}
        action={
          <Switch
            checked={preference.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            color="primary"
          />
        }
      />
      {preference.enabled && (
        <>
          <Divider />
          <SettingsRow
            icon={<AccessTimeIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
            label={t('notificationPreferences.minUrgency')}
            subtitle={t('notificationPreferences.minUrgencyDescription')}
            action={
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={preference.minUrgencyLevel}
                  onChange={(e) => onUpdate({ minUrgencyLevel: e.target.value as UrgencyLevel })}
                  variant="standard"
                  disableUnderline
                  sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                >
                  <MenuItem value="low">{t('notifications.urgency.low')}</MenuItem>
                  <MenuItem value="medium">{t('notifications.urgency.medium')}</MenuItem>
                  <MenuItem value="high">{t('notifications.urgency.high')}</MenuItem>
                  <MenuItem value="critical">{t('notifications.urgency.critical')}</MenuItem>
                </Select>
              </FormControl>
            }
          />
          <Divider />
          <SettingsRow
            icon={<EmailIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
            label={t('notificationPreferences.emailEnabled')}
            subtitle={t('notificationPreferences.emailEnabledDescription')}
            action={
              <Switch
                checked={preference.emailEnabled}
                onChange={(e) => onUpdate({ emailEnabled: e.target.checked })}
                color="primary"
              />
            }
          />
          <Divider />
          <SettingsRow
            icon={<NotificationsIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
            label={t('notificationPreferences.pushEnabled')}
            subtitle={t('notificationPreferences.pushEnabledDescription')}
            action={
              <Switch
                checked={preference.pushEnabled}
                onChange={(e) => onUpdate({ pushEnabled: e.target.checked })}
                color="primary"
              />
            }
          />
        </>
      )}
    </Card>
  )
}
