import { useTranslation } from 'react-i18next'
import { Box, CircularProgress, Typography, Fade } from '@/mui'

interface LoadingPageProps {
  message?: string
}

export function LoadingPage({ message }: LoadingPageProps) {
  const { t } = useTranslation()

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          gap: 2,
        }}
      >
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          {message || t('common.loadingPage')}
        </Typography>
      </Box>
    </Fade>
  )
}
