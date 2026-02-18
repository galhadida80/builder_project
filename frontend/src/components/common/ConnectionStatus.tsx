import React from 'react'
import { Chip } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useTranslation } from 'react-i18next'

interface ConnectionStatusProps {
  isConnected: boolean
}

export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  const { t } = useTranslation()

  return (
    <Chip
      icon={
        <FiberManualRecordIcon
          sx={{ fontSize: 10, color: isConnected ? 'success.main' : 'error.main' }}
        />
      }
      label={isConnected ? t('websocket.connected') : t('websocket.disconnected')}
      size="small"
      variant="outlined"
      sx={{
        borderColor: isConnected ? 'success.main' : 'error.main',
        '& .MuiChip-label': { fontSize: '0.75rem' },
      }}
    />
  )
}
