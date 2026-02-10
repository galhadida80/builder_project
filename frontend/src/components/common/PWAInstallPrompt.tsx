import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Snackbar, Button, IconButton, Box, Typography, Paper, Slide } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GetAppIcon from '@mui/icons-material/GetApp'
import IosShareIcon from '@mui/icons-material/IosShare'
import { usePWAInstall } from '../../hooks/usePWAInstall'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000

export function PWAInstallPrompt(): React.ReactElement | null {
  const { t } = useTranslation()
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [open, setOpen] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    if (isInstalled) {
      return
    }

    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return
      }
    }

    const timer = setTimeout(() => {
      if (isInstallable || isIOS) {
        setOpen(true)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [isInstallable, isInstalled, isIOS])

  const handleDismiss = () => {
    setOpen(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }

    const installed = await promptInstall()
    if (installed) {
      setOpen(false)
    }
  }

  if (isInstalled) {
    return null
  }

  if (showIOSGuide) {
    return (
      <Snackbar
        open={true}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Paper elevation={6} sx={{ p: 2, maxWidth: 340 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <IosShareIcon color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('pwa.installIOS')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('pwa.iosStep1')}
                <br />
                {t('pwa.iosStep2')}
                <br />
                {t('pwa.iosStep3')}
              </Typography>
            </Box>
            <IconButton size="small" aria-label={t('common.closeInstallGuide')} onClick={() => setShowIOSGuide(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Snackbar>
    )
  }

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      TransitionComponent={Slide}
    >
      <Paper elevation={6} sx={{ p: 2, maxWidth: 340 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GetAppIcon color="primary" fontSize="large" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">
              {t('pwa.installTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('pwa.installDescription')}
            </Typography>
          </Box>
          <IconButton size="small" aria-label={t('common.dismissInstallPrompt')} onClick={handleDismiss}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={handleDismiss}>
            {t('common.notNow')}
          </Button>
          <Button variant="contained" size="small" onClick={handleInstall} startIcon={<GetAppIcon />}>
            {t('common.install')}
          </Button>
        </Box>
      </Paper>
    </Snackbar>
  )
}
