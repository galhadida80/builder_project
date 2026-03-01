import { useTranslation } from 'react-i18next'
import { Grid } from '@/mui'
import DistributionChart from '../../pages/Analytics/components/DistributionChart'
import type { Vendor } from '../../types'
import { BusinessIcon, ConstructionIcon, PlumbingIcon, ElectricalServicesIcon, LocalShippingIcon } from '@/icons'

interface VendorAnalyticsProps {
  vendors: Vendor[]
  loading: boolean
}

const TRADE_TYPES = [
  { value: 'general_contractor', labelKey: 'vendors.trades.generalContractor', icon: <ConstructionIcon />, color: '#e07842' },
  { value: 'plumbing', labelKey: 'vendors.trades.plumbing', icon: <PlumbingIcon />, color: '#0288d1' },
  { value: 'electrical', labelKey: 'vendors.trades.electrical', icon: <ElectricalServicesIcon />, color: '#ed6c02' },
  { value: 'hvac', labelKey: 'vendors.trades.hvac', icon: <BusinessIcon />, color: '#9c27b0' },
  { value: 'concrete', labelKey: 'vendors.trades.concrete', icon: <ConstructionIcon />, color: '#757575' },
  { value: 'masonry', labelKey: 'vendors.trades.masonry', icon: <ConstructionIcon />, color: '#795548' },
  { value: 'carpentry', labelKey: 'vendors.trades.carpentry', icon: <ConstructionIcon />, color: '#8d6e63' },
  { value: 'roofing', labelKey: 'vendors.trades.roofing', icon: <ConstructionIcon />, color: '#d32f2f' },
  { value: 'supplier', labelKey: 'vendors.trades.supplier', icon: <LocalShippingIcon />, color: '#2e7d32' },
]

export default function VendorAnalytics({ vendors, loading }: VendorAnalyticsProps) {
  const { t } = useTranslation()

  const getTradeConfig = (trade: string) =>
    TRADE_TYPES.find(tt => tt.value === trade) || { labelKey: trade, color: '#757575' }

  const getRatingDistributionData = () => {
    const groups: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, unrated: 0 }
    vendors.forEach(v => {
      if (!v.rating) { groups['unrated']++; return }
      const floor = Math.floor(v.rating)
      if (floor >= 5) groups['5']++
      else if (floor >= 4) groups['4']++
      else if (floor >= 3) groups['3']++
      else if (floor >= 2) groups['2']++
      else groups['1']++
    })
    return [
      { id: '5', label: t('vendors.charts.fiveStars'), value: groups['5'], color: '#2e7d32' },
      { id: '4', label: t('vendors.charts.fourStars'), value: groups['4'], color: '#66bb6a' },
      { id: '3', label: t('vendors.charts.threeStars'), value: groups['3'], color: '#ed6c02' },
      { id: '2', label: t('vendors.charts.twoStars'), value: groups['2'], color: '#f57c00' },
      { id: '1', label: t('vendors.charts.oneStar'), value: groups['1'], color: '#d32f2f' },
      { id: 'unrated', label: t('vendors.charts.unrated'), value: groups['unrated'], color: '#757575' },
    ].filter(item => item.value > 0)
  }

  const getTopVendorsByTradeData = () => {
    const counts: Record<string, number> = {}
    vendors.forEach(v => { counts[v.trade] = (counts[v.trade] || 0) + 1 })
    return Object.entries(counts)
      .map(([trade, count]) => {
        const config = getTradeConfig(trade)
        return { id: trade, label: t(config.labelKey), value: count, color: config.color }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <DistributionChart title={t('vendors.charts.ratingDistribution')} data={getRatingDistributionData()} height={280} loading={loading} />
      </Grid>
      <Grid item xs={12} md={6}>
        <DistributionChart title={t('vendors.charts.topVendorsByTrade')} data={getTopVendorsByTradeData()} height={280} loading={loading} />
      </Grid>
    </Grid>
  )
}
