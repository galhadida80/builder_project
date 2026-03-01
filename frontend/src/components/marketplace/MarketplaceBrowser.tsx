import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Grid } from '@/mui'
import { Tabs } from '../ui/Tabs'
import { EmptyState } from '../ui/EmptyState'
import { TemplateCard } from './TemplateCard'
import TemplatePreview from './TemplatePreview'
import { TemplateFilters } from './TemplateFilters'
import { marketplaceApi, MarketplaceTemplateWithListing, TemplateType, TemplateTier } from '../../api/marketplace'
import { useToast } from '../common/ToastProvider'

interface MarketplaceBrowserProps {
  onInstall?: (templateId: string) => void | Promise<void>
}

export function MarketplaceBrowser({ onInstall }: MarketplaceBrowserProps) {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [templates, setTemplates] = useState<MarketplaceTemplateWithListing[]>([])
  const [tabValue, setTabValue] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [templateType, setTemplateType] = useState<TemplateType | ''>('')
  const [category, setCategory] = useState('')
  const [trade, setTrade] = useState('')
  const [buildingType, setBuildingType] = useState('')
  const [tier, setTier] = useState<TemplateTier | ''>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue, searchQuery, templateType, category, trade, buildingType, tier])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)

      const params: {
        search?: string
        templateType?: TemplateType
        category?: string
        trade?: string
        buildingType?: string
        tier?: TemplateTier
        isOfficial?: boolean
        featured?: boolean
      } = {}

      if (searchQuery) params.search = searchQuery
      if (templateType) params.templateType = templateType
      if (category) params.category = category
      if (trade) params.trade = trade
      if (buildingType) params.buildingType = buildingType
      if (tier) params.tier = tier

      if (tabValue === 'featured') params.featured = true
      if (tabValue === 'official') params.isOfficial = true

      const data = await marketplaceApi.searchTemplates(params)
      setTemplates(data)
    } catch {
      setError(true)
      showError(t('marketplace.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplate(templateId)
    setPreviewOpen(true)
  }

  const handlePreviewClose = () => {
    setPreviewOpen(false)
    setSelectedTemplate(null)
  }

  const handleInstall = async (templateId: string) => {
    handlePreviewClose()
    if (onInstall) {
      await onInstall(templateId)
    }
    await loadData()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setTemplateType('')
    setCategory('')
    setTrade('')
    setBuildingType('')
    setTier('')
    setTabValue('all')
  }

  if (error) {
    return (
      <EmptyState
        variant="error"
        description={t('marketplace.failedToLoad')}
        action={{ label: t('marketplace.retry'), onClick: loadData }}
      />
    )
  }

  const tabItems = [
    { label: t('marketplace.tabAll'), value: 'all' },
    { label: t('marketplace.tabFeatured'), value: 'featured' },
    { label: t('marketplace.tabOfficial'), value: 'official' },
  ]

  const hasActiveFilters = templateType || category || trade || buildingType || tier || searchQuery || tabValue !== 'all'

  return (
    <Box sx={{ width: '100%' }}>
      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs items={tabItems} value={tabValue} onChange={setTabValue} />
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <TemplateFilters
          searchQuery={searchQuery}
          templateType={templateType}
          category={category}
          trade={trade}
          buildingType={buildingType}
          tier={tier}
          onSearchChange={setSearchQuery}
          onTemplateTypeChange={setTemplateType}
          onCategoryChange={setCategory}
          onTradeChange={setTrade}
          onBuildingTypeChange={setBuildingType}
          onTierChange={setTier}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </Box>

      {/* Results */}
      {loading ? (
        <EmptyState
          variant="no-data"
          description={t('marketplace.loading')}
        />
      ) : templates.length === 0 ? (
        <EmptyState
          variant="no-results"
          description={t('marketplace.noResults')}
          action={hasActiveFilters ? { label: t('marketplace.clearFilters'), onClick: handleClearFilters } : undefined}
        />
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={template.id}>
              <TemplateCard
                template={template}
                onClick={() => handleTemplateClick(template.id)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <TemplatePreview
          templateId={selectedTemplate}
          open={previewOpen}
          onClose={handlePreviewClose}
          onInstall={handleInstall}
        />
      )}
    </Box>
  )
}
