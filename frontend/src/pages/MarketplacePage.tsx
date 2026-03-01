import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@/mui'
import { MarketplaceBrowser } from '../components/marketplace/MarketplaceBrowser'
import { useToast } from '../components/common/ToastProvider'
import { marketplaceApi } from '../api/marketplace'
import { organizationsApi } from '../api/organizations'
import type { Organization } from '../types'

export default function MarketplacePage() {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const [organizations, setOrganizations] = useState<Organization[]>([])

  useEffect(() => {
    organizationsApi.list().then(setOrganizations).catch(() => {})
  }, [])

  const handleInstall = async (templateId: string) => {
    const orgId = organizations[0]?.id
    if (!orgId) {
      showError(t('marketplace.errors.noOrganization', 'You must belong to an organization to install templates'))
      return
    }
    await marketplaceApi.installTemplate(templateId, orgId)
    showSuccess(t('marketplace.installSuccess'))
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 12, sm: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}
        >
          {t('marketplace.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('marketplace.subtitle')}
        </Typography>
      </Box>

      <MarketplaceBrowser onInstall={handleInstall} />
    </Box>
  )
}
