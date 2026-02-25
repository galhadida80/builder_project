import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@/mui'
import { ArchitectureIcon } from '@/icons'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/Breadcrumbs'

export default function BlueprintsPage() {
  const { t } = useTranslation()

  return (
    <Box>
      <PageHeader title={t('blueprints.title', 'Blueprints')} />
      <Card>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
          <ArchitectureIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary">
            {t('blueprints.comingSoon', 'Blueprint extraction coming soon')}
          </Typography>
        </Box>
      </Card>
    </Box>
  )
}
