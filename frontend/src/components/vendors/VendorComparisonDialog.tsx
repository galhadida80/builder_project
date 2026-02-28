import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  useMediaQuery,
  useTheme,
} from '@/mui'
import type { Vendor } from '../../types'
import { StarIcon, LocalShippingIcon, VerifiedIcon, AttachMoneyIcon, CloseIcon } from '@/icons'

interface VendorComparisonDialogProps {
  open: boolean
  onClose: () => void
  vendors: Vendor[]
}

export default function VendorComparisonDialog({ open, onClose, vendors }: VendorComparisonDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Calculate average performance scores for each vendor
  const getVendorPerformance = (vendor: Vendor) => {
    if (!vendor.performances || vendor.performances.length === 0) {
      return { deliveryScore: null, qualityScore: null, priceScore: null, averageScore: null }
    }

    const scores = vendor.performances.reduce(
      (acc, perf) => {
        if (perf.deliveryScore !== undefined && perf.deliveryScore !== null) {
          acc.delivery.push(perf.deliveryScore)
        }
        if (perf.qualityScore !== undefined && perf.qualityScore !== null) {
          acc.quality.push(perf.qualityScore)
        }
        if (perf.priceScore !== undefined && perf.priceScore !== null) {
          acc.price.push(perf.priceScore)
        }
        return acc
      },
      { delivery: [] as number[], quality: [] as number[], price: [] as number[] }
    )

    const avgDelivery = scores.delivery.length > 0 ? scores.delivery.reduce((a, b) => a + b, 0) / scores.delivery.length : null
    const avgQuality = scores.quality.length > 0 ? scores.quality.reduce((a, b) => a + b, 0) / scores.quality.length : null
    const avgPrice = scores.price.length > 0 ? scores.price.reduce((a, b) => a + b, 0) / scores.price.length : null

    const allScores = [avgDelivery, avgQuality, avgPrice].filter((s) => s !== null) as number[]
    const avgScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null

    return {
      deliveryScore: avgDelivery,
      qualityScore: avgQuality,
      priceScore: avgPrice,
      averageScore: avgScore,
    }
  }

  // Find best values for highlighting
  const bestRating = Math.max(...vendors.map((v) => v.rating || 0))
  const bestDelivery = Math.max(...vendors.map((v) => getVendorPerformance(v).deliveryScore || 0))
  const bestQuality = Math.max(...vendors.map((v) => getVendorPerformance(v).qualityScore || 0))
  const bestPrice = Math.max(...vendors.map((v) => getVendorPerformance(v).priceScore || 0))

  // Format date for insurance expiry
  const formatInsuranceExpiry = (date?: string) => {
    if (!date) return t('vendors.comparison.noInsuranceInfo')
    const expiryDate = new Date(date)
    const now = new Date()
    const isExpired = expiryDate < now
    const formattedDate = expiryDate.toLocaleDateString()
    return isExpired ? `${formattedDate} (${t('vendors.comparison.expired')})` : formattedDate
  }

  const isInsuranceExpired = (date?: string) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  // Score display component
  const ScoreCell = ({ score, isBest }: { score: number | null; isBest: boolean }) => {
    if (score === null) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          -
        </Typography>
      )
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isBest ? 600 : 400,
            color: isBest ? 'success.main' : 'text.primary',
          }}
        >
          {score.toFixed(1)}
        </Typography>
        {isBest && <Chip label={t('vendors.comparison.best')} size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />}
      </Box>
    )
  }

  if (isMobile) {
    // Mobile view: cards instead of table
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('vendors.comparison.title')}
            <Button onClick={onClose} size="small" sx={{ minWidth: 'auto' }}>
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {vendors.map((vendor) => {
              const perf = getVendorPerformance(vendor)
              return (
                <Paper key={vendor.id} elevation={2} sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    {vendor.companyName}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Rating */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {t('vendors.rating')}:
                      </Typography>
                      {vendor.rating ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="body2" sx={{ fontWeight: vendor.rating === bestRating ? 600 : 400 }}>
                            {vendor.rating.toFixed(1)}
                          </Typography>
                          {vendor.rating === bestRating && <Chip label={t('vendors.comparison.best')} size="small" color="success" />}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          -
                        </Typography>
                      )}
                    </Box>

                    {/* Delivery Score */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {t('vendors.comparison.deliveryScore')}:
                      </Typography>
                      <ScoreCell score={perf.deliveryScore} isBest={perf.deliveryScore === bestDelivery && bestDelivery > 0} />
                    </Box>

                    {/* Quality Score */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {t('vendors.comparison.qualityScore')}:
                      </Typography>
                      <ScoreCell score={perf.qualityScore} isBest={perf.qualityScore === bestQuality && bestQuality > 0} />
                    </Box>

                    {/* Price Score */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {t('vendors.comparison.priceScore')}:
                      </Typography>
                      <ScoreCell score={perf.priceScore} isBest={perf.priceScore === bestPrice && bestPrice > 0} />
                    </Box>

                    {/* Insurance Expiry */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {t('vendors.insuranceExpiry')}:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isInsuranceExpired(vendor.insuranceExpiry) ? 'error.main' : 'text.primary',
                        }}
                      >
                        {formatInsuranceExpiry(vendor.insuranceExpiry)}
                      </Typography>
                    </Box>

                    {/* Certifications */}
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                        {t('vendors.certifications')}:
                      </Typography>
                      {vendor.certifications && vendor.certifications.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {vendor.certifications.map((cert, idx) => (
                            <Chip key={idx} label={cert} size="small" variant="outlined" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {t('vendors.comparison.noCertifications')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="contained">
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  // Desktop view: comparison table
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('vendors.comparison.title')}</DialogTitle>
      <DialogContent>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '20%' }}>{t('common.field')}</TableCell>
                {vendors.map((vendor) => (
                  <TableCell key={vendor.id} sx={{ fontWeight: 600 }}>
                    {vendor.companyName}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Rating */}
              <TableRow hover>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                  {t('vendors.rating')}
                </TableCell>
                {vendors.map((vendor) => (
                  <TableCell key={vendor.id}>
                    {vendor.rating ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: vendor.rating === bestRating ? 600 : 400 }}>
                          {vendor.rating.toFixed(1)}
                        </Typography>
                        {vendor.rating === bestRating && <Chip label={t('vendors.comparison.best')} size="small" color="success" sx={{ height: 18 }} />}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        -
                      </Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>

              {/* Delivery Score */}
              <TableRow hover>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalShippingIcon sx={{ fontSize: 18, color: 'info.main' }} />
                  {t('vendors.comparison.deliveryScore')}
                </TableCell>
                {vendors.map((vendor) => {
                  const perf = getVendorPerformance(vendor)
                  return (
                    <TableCell key={vendor.id}>
                      <ScoreCell score={perf.deliveryScore} isBest={perf.deliveryScore === bestDelivery && bestDelivery > 0} />
                    </TableCell>
                  )
                })}
              </TableRow>

              {/* Quality Score */}
              <TableRow hover>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VerifiedIcon sx={{ fontSize: 18, color: 'success.main' }} />
                  {t('vendors.comparison.qualityScore')}
                </TableCell>
                {vendors.map((vendor) => {
                  const perf = getVendorPerformance(vendor)
                  return (
                    <TableCell key={vendor.id}>
                      <ScoreCell score={perf.qualityScore} isBest={perf.qualityScore === bestQuality && bestQuality > 0} />
                    </TableCell>
                  )
                })}
              </TableRow>

              {/* Price Score */}
              <TableRow hover>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoneyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                  {t('vendors.comparison.priceScore')}
                </TableCell>
                {vendors.map((vendor) => {
                  const perf = getVendorPerformance(vendor)
                  return (
                    <TableCell key={vendor.id}>
                      <ScoreCell score={perf.priceScore} isBest={perf.priceScore === bestPrice && bestPrice > 0} />
                    </TableCell>
                  )
                })}
              </TableRow>

              {/* Insurance Expiry */}
              <TableRow hover>
                <TableCell>{t('vendors.insuranceExpiry')}</TableCell>
                {vendors.map((vendor) => (
                  <TableCell key={vendor.id}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isInsuranceExpired(vendor.insuranceExpiry) ? 'error.main' : 'text.primary',
                        fontWeight: isInsuranceExpired(vendor.insuranceExpiry) ? 600 : 400,
                      }}
                    >
                      {formatInsuranceExpiry(vendor.insuranceExpiry)}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>

              {/* Certifications */}
              <TableRow hover>
                <TableCell sx={{ verticalAlign: 'top' }}>{t('vendors.certifications')}</TableCell>
                {vendors.map((vendor) => (
                  <TableCell key={vendor.id}>
                    {vendor.certifications && vendor.certifications.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {vendor.certifications.map((cert, idx) => (
                          <Chip key={idx} label={cert} size="small" variant="outlined" />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {t('vendors.comparison.noCertifications')}
                      </Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
