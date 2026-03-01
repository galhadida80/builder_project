import { useTranslation } from 'react-i18next'
import {
  Box, Typography, Chip, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Checkbox, Tooltip, useMediaQuery, useTheme,
} from '@/mui'
import {
  EditIcon, DeleteIcon, BusinessIcon, LocalShippingIcon, ConstructionIcon,
  PlumbingIcon, ElectricalServicesIcon, StarIcon, WarningIcon,
} from '@/icons'
import type { Vendor } from '../../types'

interface VendorTableProps {
  vendors: Vendor[]
  selectedVendors: string[]
  onSelect: (vendorId: string) => void
  onSelectAll: (checked: boolean) => void
  onEdit: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
}

const TRADE_TYPES = [
  { value: 'general_contractor', label: 'vendors.trades.generalContractor', icon: <ConstructionIcon />, color: '#e07842' },
  { value: 'plumbing', label: 'vendors.trades.plumbing', icon: <PlumbingIcon />, color: '#0288d1' },
  { value: 'electrical', label: 'vendors.trades.electrical', icon: <ElectricalServicesIcon />, color: '#ed6c02' },
  { value: 'hvac', label: 'vendors.trades.hvac', icon: <BusinessIcon />, color: '#9c27b0' },
  { value: 'concrete', label: 'vendors.trades.concrete', icon: <ConstructionIcon />, color: '#757575' },
  { value: 'masonry', label: 'vendors.trades.masonry', icon: <ConstructionIcon />, color: '#795548' },
  { value: 'carpentry', label: 'vendors.trades.carpentry', icon: <ConstructionIcon />, color: '#8d6e63' },
  { value: 'roofing', label: 'vendors.trades.roofing', icon: <ConstructionIcon />, color: '#d32f2f' },
  { value: 'supplier', label: 'vendors.trades.supplier', icon: <LocalShippingIcon />, color: '#2e7d32' },
]

export default function VendorTable({ vendors, selectedVendors, onSelect, onSelectAll, onEdit, onDelete }: VendorTableProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const getTradeConfig = (trade: string) =>
    TRADE_TYPES.find(tt => tt.value === trade) || { label: trade, icon: <BusinessIcon />, color: '#757575' }

  const getInsuranceStatus = (insuranceExpiry?: string) => {
    if (!insuranceExpiry) return null
    const days = Math.ceil((new Date(insuranceExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'expired'
    if (days <= 30) return 'expiring_soon'
    return null
  }

  return (
    <TableContainer sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedVendors.length > 0 && selectedVendors.length < vendors.length}
                checked={selectedVendors.length > 0 && selectedVendors.length === vendors.length}
                onChange={(e) => onSelectAll(e.target.checked)}
                size="small"
              />
            </TableCell>
            <TableCell>{t('vendors.companyName')}</TableCell>
            <TableCell>{t('vendors.trade')}</TableCell>
            {!isMobile && <TableCell>{t('vendors.contactEmail')}</TableCell>}
            {!isMobile && <TableCell>{t('vendors.rating')}</TableCell>}
            <TableCell align="right">{t('common.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vendors.map(vendor => {
            const tradeConfig = getTradeConfig(vendor.trade)
            const isSelected = selectedVendors.includes(vendor.id)
            const insuranceStatus = getInsuranceStatus(vendor.insuranceExpiry)
            return (
              <TableRow key={vendor.id} hover selected={isSelected}>
                <TableCell padding="checkbox">
                  <Checkbox checked={isSelected} onChange={() => onSelect(vendor.id)} size="small"
                    disabled={!isSelected && selectedVendors.length >= 4} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: tradeConfig.color }}>{tradeConfig.icon}</Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{vendor.companyName}</Typography>
                        {insuranceStatus === 'expired' && (
                          <Tooltip title={t('vendors.insuranceExpired')}><WarningIcon sx={{ fontSize: 18, color: 'error.main' }} /></Tooltip>
                        )}
                      </Box>
                      {insuranceStatus && (
                        <Chip
                          label={t(insuranceStatus === 'expired' ? 'vendors.insuranceExpired' : 'vendors.insuranceExpiringSoon')}
                          size="small"
                          sx={{
                            height: 20, fontSize: '0.7rem', fontWeight: 500, alignSelf: 'flex-start',
                            bgcolor: insuranceStatus === 'expired' ? 'error.main' : 'warning.main', color: 'white',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={t(tradeConfig.label)} size="small" sx={{ bgcolor: tradeConfig.color + '20', color: tradeConfig.color }} />
                </TableCell>
                {!isMobile && (
                  <TableCell><Typography variant="body2" sx={{ color: 'text.secondary' }}>{vendor.contactEmail || '-'}</Typography></TableCell>
                )}
                {!isMobile && (
                  <TableCell>
                    {vendor.rating ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="body2">{vendor.rating.toFixed(1)}</Typography>
                      </Box>
                    ) : <Typography variant="body2" sx={{ color: 'text.secondary' }}>-</Typography>}
                  </TableCell>
                )}
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onEdit(vendor)}><EditIcon /></IconButton>
                  <IconButton size="small" onClick={() => onDelete(vendor)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
