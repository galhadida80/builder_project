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
import { vendorsApi } from '../api/vendors'
import type { Vendor } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { withMinDuration } from '../utils/async'
import { AddIcon, EditIcon, DeleteIcon, BusinessIcon, LocalShippingIcon, ConstructionIcon, PlumbingIcon, ElectricalServicesIcon, StarIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useMediaQuery, useTheme } from '@/mui'

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
        actions={<Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>{t('vendors.addVendor')}</Button>}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3 }}>
        <KPICard title={t('vendors.title')} value={vendors.length} icon={<BusinessIcon />} color="primary" />
        <KPICard title={t('vendors.trades.generalContractor')} value={tradeCount('general_contractor')} icon={<ConstructionIcon />} color="info" />
        <KPICard title={t('vendors.trades.supplier')} value={tradeCount('supplier')} icon={<LocalShippingIcon />} color="success" />
      </Box>

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
                    return (
                      <TableRow key={vendor.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: tradeConfig.color }}>{tradeConfig.icon}</Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{vendor.companyName}</Typography>
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
    </Box>
  )
}
