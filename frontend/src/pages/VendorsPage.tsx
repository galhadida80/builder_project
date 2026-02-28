import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import { ConfirmModal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import VendorDialog from '../components/vendors/VendorDialog'
import type { VendorFormData } from '../components/vendors/VendorDialog'
import VendorComparisonDialog from '../components/vendors/VendorComparisonDialog'
import DistributionChart from '../pages/Analytics/components/DistributionChart'
import { vendorsApi } from '../api/vendors'
import type { Vendor } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { withMinDuration } from '../utils/async'
import { AddIcon, EditIcon, DeleteIcon, BusinessIcon, LocalShippingIcon, ConstructionIcon, PlumbingIcon, ElectricalServicesIcon, StarIcon, CompareArrowsIcon, WarningIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useMediaQuery, useTheme, Checkbox, Grid, Tooltip } from '@/mui'

export default function VendorsPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [loading, setLoading] = useState(true)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [search, setSearch] = useState('')
  const [filterTrade, setFilterTrade] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false)

  const tradeTypes = [
    { value: 'general_contractor', label: t('vendors.trades.generalContractor'), icon: <ConstructionIcon />, color: '#e07842' },
    { value: 'plumbing', label: t('vendors.trades.plumbing'), icon: <PlumbingIcon />, color: '#0288d1' },
    { value: 'electrical', label: t('vendors.trades.electrical'), icon: <ElectricalServicesIcon />, color: '#ed6c02' },
    { value: 'hvac', label: t('vendors.trades.hvac'), icon: <BusinessIcon />, color: '#9c27b0' },
    { value: 'concrete', label: t('vendors.trades.concrete'), icon: <ConstructionIcon />, color: '#757575' },
    { value: 'masonry', label: t('vendors.trades.masonry'), icon: <ConstructionIcon />, color: '#795548' },
    { value: 'carpentry', label: t('vendors.trades.carpentry'), icon: <ConstructionIcon />, color: '#8d6e63' },
    { value: 'roofing', label: t('vendors.trades.roofing'), icon: <ConstructionIcon />, color: '#d32f2f' },
    { value: 'supplier', label: t('vendors.trades.supplier'), icon: <LocalShippingIcon />, color: '#2e7d32' },
  ]

  const filterChipTrades = [
    { value: 'all', label: t('common.all') },
    { value: 'general_contractor', label: t('vendors.generalContractors') },
    { value: 'supplier', label: t('vendors.suppliers') },
    { value: 'plumbing', label: t('vendors.plumbing') },
  ]

  useEffect(() => { loadVendors() }, [])

  const loadVendors = async () => {
    try {
      setLoading(true)
      const data = await vendorsApi.list()
      setVendors(data)
    } catch {
      showError(t('vendors.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingVendor(null)
  }

  const handleOpenCreate = () => {
    setEditingVendor(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setDialogOpen(true)
  }

  const handleSaveVendor = async (formData: VendorFormData) => {
    setSaving(true)
    try {
      const payload = {
        company_name: formData.company_name,
        trade: formData.trade,
        contact_email: formData.contact_email || undefined,
        contact_phone: formData.contact_phone || undefined,
        address: formData.address || undefined,
        license_number: formData.license_number || undefined,
        insurance_expiry: formData.insurance_expiry || undefined,
        rating: formData.rating || undefined,
        certifications: formData.certifications && formData.certifications.length > 0 ? formData.certifications : undefined,
        notes: formData.notes || undefined
      }

      if (editingVendor) {
        await withMinDuration(vendorsApi.update(editingVendor.id, payload))
        showSuccess(t('vendors.updateSuccess'))
      } else {
        await withMinDuration(vendorsApi.create(payload))
        showSuccess(t('vendors.createSuccess'))
      }

      handleCloseDialog()
      loadVendors()
    } catch {
      showError(editingVendor ? t('vendors.failedToUpdate') : t('vendors.failedToCreate'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return
    setDeleting(true)
    try {
      await withMinDuration(vendorsApi.delete(vendorToDelete.id))
      showSuccess(t('vendors.deleteSuccess'))
      setDeleteDialogOpen(false)
      setVendorToDelete(null)
      loadVendors()
    } catch {
      showError(t('vendors.failedToDelete'))
    } finally {
      setDeleting(false)
    }
  }

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.companyName.toLowerCase().includes(search.toLowerCase()) ||
      v.contactEmail?.toLowerCase().includes(search.toLowerCase()) ||
      v.trade.toLowerCase().includes(search.toLowerCase())
    const matchesTrade = filterTrade === 'all' || v.trade === filterTrade
    return matchesSearch && matchesTrade
  })

  const getTradeConfig = (trade: string) =>
    tradeTypes.find(t => t.value === trade) || { label: trade, icon: <BusinessIcon />, color: '#757575' }

  const tradeCount = (trade: string) => vendors.filter(v => v.trade === trade).length

  const handleVendorSelect = (vendorId: string) => {
    setSelectedVendors(prev => {
      if (prev.includes(vendorId)) {
        return prev.filter(id => id !== vendorId)
      } else {
        if (prev.length >= 4) {
          showError(t('vendors.comparison.selectVendors'))
          return prev
        }
        return [...prev, vendorId]
      }
    })
  }

  const handleCompareClick = () => {
    if (selectedVendors.length < 2) {
      showError(t('vendors.comparison.selectVendors'))
      return
    }
    setComparisonDialogOpen(true)
  }

  const handleCloseComparison = () => {
    setComparisonDialogOpen(false)
    setSelectedVendors([])
  }

  const getSelectedVendorObjects = () => {
    return vendors.filter(v => selectedVendors.includes(v.id))
  }

  const getInsuranceExpiryStatus = (insuranceExpiry?: string) => {
    if (!insuranceExpiry) return null

    const expiryDate = new Date(insuranceExpiry)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return 'expired'
    } else if (daysUntilExpiry <= 30) {
      return 'expiring_soon'
    }
    return null
  }

  const getRatingDistributionData = () => {
    const ratingGroups = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
      'unrated': 0
    }

    vendors.forEach(vendor => {
      if (!vendor.rating) {
        ratingGroups['unrated']++
      } else {
        const ratingFloor = Math.floor(vendor.rating)
        if (ratingFloor >= 5) ratingGroups['5']++
        else if (ratingFloor >= 4) ratingGroups['4']++
        else if (ratingFloor >= 3) ratingGroups['3']++
        else if (ratingFloor >= 2) ratingGroups['2']++
        else ratingGroups['1']++
      }
    })

    return [
      { id: '5', label: t('vendors.charts.fiveStars'), value: ratingGroups['5'], color: '#2e7d32' },
      { id: '4', label: t('vendors.charts.fourStars'), value: ratingGroups['4'], color: '#66bb6a' },
      { id: '3', label: t('vendors.charts.threeStars'), value: ratingGroups['3'], color: '#ed6c02' },
      { id: '2', label: t('vendors.charts.twoStars'), value: ratingGroups['2'], color: '#f57c00' },
      { id: '1', label: t('vendors.charts.oneStar'), value: ratingGroups['1'], color: '#d32f2f' },
      { id: 'unrated', label: t('vendors.charts.unrated'), value: ratingGroups['unrated'], color: '#757575' },
    ].filter(item => item.value > 0)
  }

  const getTopVendorsByTradeData = () => {
    const tradeCounts: { [key: string]: number } = {}

    vendors.forEach(vendor => {
      tradeCounts[vendor.trade] = (tradeCounts[vendor.trade] || 0) + 1
    })

    return Object.entries(tradeCounts)
      .map(([trade, count]) => {
        const tradeConfig = getTradeConfig(trade)
        return {
          id: trade,
          label: tradeConfig.label,
          value: count,
          color: tradeConfig.color
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3 }}>
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <Box sx={{ p: 2 }}>
                <Skeleton variant="text" width={100} />
                <Skeleton variant="text" width={60} height={32} />
              </Box>
            </Card>
          ))}
        </Box>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 2 }} />
        {[...Array(4)].map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Skeleton variant="circular" width={48} height={48} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width={140} height={22} />
              <Skeleton variant="text" width={200} height={18} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('vendors.title')}
        subtitle={t('vendors.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.vendors') }]}
        actions={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedVendors.length >= 2 && (
              <Button variant="secondary" icon={<CompareArrowsIcon />} onClick={handleCompareClick}>
                {t('vendors.compareVendors')} ({selectedVendors.length})
              </Button>
            )}
            <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>{t('vendors.addVendor')}</Button>
          </Box>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3 }}>
        <KPICard title={t('vendors.title')} value={vendors.length} icon={<BusinessIcon />} color="primary" />
        <KPICard title={t('vendors.trades.generalContractor')} value={tradeCount('general_contractor')} icon={<ConstructionIcon />} color="info" />
        <KPICard title={t('vendors.trades.supplier')} value={tradeCount('supplier')} icon={<LocalShippingIcon />} color="success" />
      </Box>

      {vendors.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <DistributionChart
                title={t('vendors.charts.ratingDistribution')}
                data={getRatingDistributionData()}
                height={280}
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DistributionChart
                title={t('vendors.charts.topVendorsByTrade')}
                data={getTopVendorsByTradeData()}
                height={280}
                loading={loading}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      <Card>
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ mb: 2 }}>
            <SearchField
              placeholder={t('vendors.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
            />
          </Box>

          <FilterChips
            items={filterChipTrades}
            value={filterTrade}
            onChange={setFilterTrade}
          />

          {filteredVendors.length === 0 ? (
            <EmptyState
              icon={<BusinessIcon />}
              title={t('vendors.noVendors')}
              description={t('vendors.noVendorsDescription')}
              action={{ label: t('vendors.addVendor'), onClick: handleOpenCreate }}
            />
          ) : (
            <TableContainer sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedVendors.length > 0 && selectedVendors.length < filteredVendors.length}
                        checked={selectedVendors.length > 0 && selectedVendors.length === filteredVendors.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVendors(filteredVendors.slice(0, 4).map(v => v.id))
                          } else {
                            setSelectedVendors([])
                          }
                        }}
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
                  {filteredVendors.map(vendor => {
                    const tradeConfig = getTradeConfig(vendor.trade)
                    const isSelected = selectedVendors.includes(vendor.id)
                    const insuranceStatus = getInsuranceExpiryStatus(vendor.insuranceExpiry)
                    return (
                      <TableRow key={vendor.id} hover selected={isSelected}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleVendorSelect(vendor.id)}
                            size="small"
                            disabled={!isSelected && selectedVendors.length >= 4}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: tradeConfig.color }}>{tradeConfig.icon}</Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{vendor.companyName}</Typography>
                                {insuranceStatus === 'expired' && (
                                  <Tooltip title={t('vendors.insuranceExpired')}>
                                    <WarningIcon sx={{ fontSize: 18, color: 'error.main' }} />
                                  </Tooltip>
                                )}
                              </Box>
                              {insuranceStatus && (
                                <Chip
                                  label={t(insuranceStatus === 'expired' ? 'vendors.insuranceExpired' : 'vendors.insuranceExpiringSoon')}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    bgcolor: insuranceStatus === 'expired' ? 'error.main' : 'warning.main',
                                    color: 'white',
                                    fontWeight: 500,
                                    alignSelf: 'flex-start'
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={tradeConfig.label} size="small" sx={{ bgcolor: tradeConfig.color + '20', color: tradeConfig.color }} />
                        </TableCell>
                        {!isMobile && (
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{vendor.contactEmail || '-'}</Typography>
                          </TableCell>
                        )}
                        {!isMobile && (
                          <TableCell>
                            {vendor.rating ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                <Typography variant="body2">{vendor.rating.toFixed(1)}</Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>-</Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenEdit(vendor)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteClick(vendor)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Card>

      <VendorDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveVendor}
        editingVendor={editingVendor}
        loading={saving}
      />

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('vendors.deleteVendor')}
        message={t('vendors.deleteConfirmationMessage', { name: vendorToDelete?.companyName })}
        loading={deleting}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      <VendorComparisonDialog
        open={comparisonDialogOpen}
        onClose={handleCloseComparison}
        vendors={getSelectedVendorObjects()}
      />
    </Box>
  )
}
