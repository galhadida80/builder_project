import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@/mui'
import { Button } from '../components/ui/Button'
import { HomeIcon, ConstructionIcon } from '@/icons'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        bgcolor: 'background.default',
        px: 3,
        textAlign: 'center',
      }}
    >
      <ConstructionIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />

      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '4rem', sm: '6rem' },
          fontWeight: 800,
          background: 'linear-gradient(135deg, #f28c26 0%, #EA580C 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          mb: 1,
        }}
      >
        404
      </Typography>

      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        {t('notFound.title')}
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 400 }}
      >
        {t('notFound.message')}
      </Typography>

      <Button
        variant="primary"
        icon={<HomeIcon />}
        onClick={() => navigate('/dashboard')}
      >
        {t('notFound.backHome')}
      </Button>
    </Box>
  )
}
