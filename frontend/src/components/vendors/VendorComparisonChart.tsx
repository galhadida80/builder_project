import { useTranslation } from 'react-i18next'
import { Box, Typography, Chip } from '@/mui'
import type { Vendor, VendorPerformance } from '../../types'

interface ScoreCellProps {
  score: number | null
  isBest: boolean
}

export function ScoreCell({ score, isBest }: ScoreCellProps) {
  const { t } = useTranslation()
  if (score === null) {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }}>-</Typography>
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: isBest ? 600 : 400, color: isBest ? 'success.main' : 'text.primary' }}>
        {score.toFixed(1)}
      </Typography>
      {isBest && <Chip label={t('vendors.comparison.best')} size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />}
    </Box>
  )
}

export function getVendorPerformance(vendor: Vendor) {
  if (!vendor.performances || vendor.performances.length === 0) {
    return { deliveryScore: null, qualityScore: null, priceScore: null, averageScore: null }
  }

  const scores = vendor.performances.reduce(
    (acc: { delivery: number[]; quality: number[]; price: number[] }, perf: VendorPerformance) => {
      if (perf.deliveryScore !== undefined && perf.deliveryScore !== null) acc.delivery.push(perf.deliveryScore)
      if (perf.qualityScore !== undefined && perf.qualityScore !== null) acc.quality.push(perf.qualityScore)
      if (perf.priceScore !== undefined && perf.priceScore !== null) acc.price.push(perf.priceScore)
      return acc
    },
    { delivery: [], quality: [], price: [] },
  )

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  const avgDelivery = avg(scores.delivery)
  const avgQuality = avg(scores.quality)
  const avgPrice = avg(scores.price)

  const allScores = [avgDelivery, avgQuality, avgPrice].filter((s) => s !== null) as number[]
  const avgScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null

  return { deliveryScore: avgDelivery, qualityScore: avgQuality, priceScore: avgPrice, averageScore: avgScore }
}

export function formatInsuranceExpiry(date: string | undefined, t: (key: string) => string) {
  if (!date) return t('vendors.comparison.noInsuranceInfo')
  const expiryDate = new Date(date)
  const now = new Date()
  const isExpired = expiryDate < now
  const formattedDate = expiryDate.toLocaleDateString()
  return isExpired ? `${formattedDate} (${t('vendors.comparison.expired')})` : formattedDate
}

export function isInsuranceExpired(date?: string) {
  if (!date) return false
  return new Date(date) < new Date()
}
