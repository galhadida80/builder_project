import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../../api/client'
import { Switch, Typography, Box } from '@/mui'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
const PUSH_ENABLED_KEY = 'pushNotificationsEnabled'

export default function PushNotificationToggle() {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  const [supported, setSupported] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(isSupported)
    if (isSupported) {
      setEnabled(localStorage.getItem(PUSH_ENABLED_KEY) === 'true')
    }
  }, [])

  const handleEnable = useCallback(async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = subscription.toJSON()
      await apiClient.post('/notifications/push-subscribe', {
        endpoint: json.endpoint,
        p256dh_key: json.keys?.p256dh || '',
        auth_key: json.keys?.auth || '',
      })

      localStorage.setItem(PUSH_ENABLED_KEY, 'true')
      setEnabled(true)
    } catch {
      localStorage.removeItem(PUSH_ENABLED_KEY)
      setEnabled(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDisable = useCallback(async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await apiClient.delete('/notifications/push-unsubscribe', {
            params: { endpoint: subscription.endpoint },
          })
          await subscription.unsubscribe()
        }
      }
      localStorage.removeItem(PUSH_ENABLED_KEY)
      setEnabled(false)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggle = useCallback(() => {
    if (enabled) {
      handleDisable()
    } else {
      handleEnable()
    }
  }, [enabled, handleDisable, handleEnable])

  if (!supported) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body1">{t('notifications.push.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('notifications.push.notSupported')}
          </Typography>
        </Box>
        <Switch disabled />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="body1">{t('notifications.push.title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {enabled ? t('notifications.push.enabledDescription') : t('notifications.push.disabledDescription')}
        </Typography>
      </Box>
      <Switch checked={enabled} onChange={handleToggle} disabled={loading} />
    </Box>
  )
}
