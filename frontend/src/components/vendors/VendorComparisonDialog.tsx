import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Paper, useMediaQuery, useTheme,
} from '@/mui'
import type { Vendor } from '../../types'
import { StarIcon, LocalShippingIcon, VerifiedIcon, AttachMoneyIcon, CloseIcon } from '@/icons'
import { ScoreCell, getVendorPerformance, formatInsuranceExpiry, isInsuranceExpired } from './VendorComparisonChart'

interface VendorComparisonDialogProps {
  open: boolean
  onClose: () => void
  vendors: Vendor[]
}

export default function VendorComparisonDialog({ open, onClose, vendors }: VendorComparisonDialogProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const bestRating = Math.max(...vendors.map((v) => v.rating || 0))
  const bestDelivery = Math.max(...vendors.map((v) => getVendorPerformance(v).deliveryScore || 0))
  const bestQuality = Math.max(...vendors.map((v) => getVendorPerformance(v).qualityScore || 0))
  const bestPrice = Math.max(...vendors.map((v) => getVendorPerformance(v).priceScore || 0))

  if (isMobile) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('vendors.comparison.title')}
            <Button onClick={onClose} size="small" sx={{ minWidth: 'auto' }}><CloseIcon /></Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {vendors.map((vendor) => {
              const perf = getVendorPerformance(vendor)
              return (
                <Paper key={vendor.id} elevation={2} sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>{vendor.companyName}</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('vendors.rating')}:</Typography>
                      {vendor.rating ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="body2" sx={{ fontWeight: vendor.rating === bestRating ? 600 : 400 }}>{vendor.rating.toFixed(1)}</Typography>
                        </Box>
                      ) : <Typography variant="body2" sx={{ color: 'text.secondary' }}>-</Typography>}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('vendors.comparison.deliveryScore')}:</Typography>
                      <ScoreCell score={perf.deliveryScore} isBest={perf.deliveryScore === bestDelivery && bestDelivery > 0} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('vendors.comparison.qualityScore')}:</Typography>
                      <ScoreCell score={perf.qualityScore} isBest={perf.qualityScore === bestQuality && bestQuality > 0} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('vendors.comparison.priceScore')}:</Typography>
                      <ScoreCell score={perf.priceScore} isBest={perf.priceScore === bestPrice && bestPrice > 0} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('vendors.insuranceExpiry')}:</Typography>
                      <Typography variant="body2" sx={{ color: isInsuranceExpired(vendor.insuranceExpiry) ? 'error.main' : 'text.primary' }}>
                        {formatInsuranceExpiry(vendor.insuranceExpiry, t)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>{t('vendors.certifications')}:</Typography>
                      {vendor.certifications?.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {vendor.certifications.map((cert, idx) => (<Chip key={idx} label={cert} size="small" variant="outlined" />))}
                        </Box>
                      ) : <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('vendors.comparison.noCertifications')}</Typography>}
                    </Box>
                  </Box>
                </Paper>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="contained">{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('vendors.comparison.title')}</DialogTitle>
      <DialogContent>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '20%' }}>{t('vendors.comparison.title')}</TableCell>
                {vendors.map((vendor) => (<TableCell key={vendor.id} sx={{ fontWeight: 600 }}>{vendor.companyName}</TableCell>))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} />{t('vendors.rating')}
                </TableCell>
                {vendors.map((vendor) => (
                  <TableCell key={vendor.id}>
                    {vendor.rating ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: vendor.rating === bestRating ? 600 : 400 }}>{vendor.rating.toFixed(1)}</Typography>
                        {vendor.rating === bestRating && <Chip label={t('vendors.comparison.best')} size="small" color="success" sx={{ height: 18 }} />}
                      </Box>
                    ) : <Typography variant="body2" sx={{ color: 'text.secondary' }}>-</Typography>}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalShippingIcon sx={{ fontSize: 18, color: 'info.main' }} />{t('vendors.comparison.deliveryScore')}
                </TableCell>
                {vendors.map((vendor) => {
                  const perf = getVendorPerformance(vendor)
                  return <TableCell key={vendor.id}><ScoreCell score={perf.deliveryScore} isBest={perf.deliveryScore === bestDelivery && bestDelivery > 0} /></TableCell>
                })}
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VerifiedIcon sx={{ fontSize: 18, color: 'success.main' }} />{t('vendors.comparison.qualityScore')}
                </TableCell>
                {vendors.map((vendor) => {
                  const perf = getVendorPerformance(vendor)
                  return <TableCell key={vendor.id}><ScoreCell score={perf.qualityScore} isBest={perf.qualityScore === bestQuality && bestQuality > 0} /></TableCell>
                })}
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoneyIcon sx={{ fontSize: 18, color: 'primary.main' }} />{t('vendors.comparison.priceScore')}
                </TableCell>
                {vendors.map((vendor) => {
                  const perf = getVendorPerformance(vendor)
                  return <TableCell key={vendor.id}><ScoreCell score={perf.priceScore} isBest={perf.priceScore === bestPrice && bestPrice > 0} /></TableCell>
                })}
              </TableRow>
              <TableRow hover>
                <TableCell>{t('vendors.insuranceExpiry')}</TableCell>
                {vendors.map((vendor) => (
                  <TableCell key={vendor.id}>
                    <Typography variant="body2" sx={{ color: isInsuranceExpired(vendor.insuranceExpiry) ? 'error.main' : 'text.primary' }}>
                      {formatInsuranceExpiry(vendor.insuranceExpiry, t)}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ verticalAlign: 'top' }}>{t('vendors.certifications')}</TableCell>
                {vendors.map((vendor) => (
                  <TableCell key={vendor.id}>
                    {vendor.certifications?.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {vendor.certifications.map((cert, idx) => (<Chip key={idx} label={cert} size="small" variant="outlined" />))}
                      </Box>
                    ) : <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('vendors.comparison.noCertifications')}</Typography>}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
