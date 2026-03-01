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
import VendorAnalytics from '../components/vendors/VendorAnalytics'
import VendorTable from '../components/vendors/VendorTable'
import { vendorsApi } from '../api/vendors'
import type { Vendor } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { withMinDuration } from '../utils/async'
import { AddIcon, BusinessIcon, LocalShippingIcon, ConstructionIcon, CompareArrowsIcon } from '@/icons'
import { Box, Skeleton } from '@/mui'

export default function VendorsPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
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

  const handleCloseDialog = () => { setDialogOpen(false); setEditingVendor(null) }

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
        certifications: formData.certifications?.length ? formData.certifications : undefined,
        notes: formData.notes || undefined,
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

  const handleVendorSelect = (vendorId: string) => {
    setSelectedVendors(prev => {
      if (prev.includes(vendorId)) return prev.filter(id => id !== vendorId)
      if (prev.length >= 4) { showError(t('vendors.comparison.selectVendors')); return prev }
      return [...prev, vendorId]
    })
  }

  const handleCompareClick = () => {
    if (selectedVendors.length < 2) { showError(t('vendors.comparison.selectVendors')); return }
    setComparisonDialogOpen(true)
  }

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.companyName.toLowerCase().includes(search.toLowerCase()) ||
      v.contactEmail?.toLowerCase().includes(search.toLowerCase()) ||
      v.trade.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (filterTrade === 'all' || v.trade === filterTrade)
  })

  const tradeCount = (trade: string) => vendors.filter(v => v.trade === trade).length

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3 }}>
          {[...Array(3)].map((_, i) => (<Card key={i}><Box sx={{ p: 2 }}><Skeleton variant="text" width={100} /><Skeleton variant="text" width={60} height={32} /></Box></Card>))}
        </Box>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 2 }} />
        {[...Array(4)].map((_, i) => (<Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />))}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('vendors.title')} subtitle={t('vendors.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('nav.vendors') }]}
        actions={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedVendors.length >= 2 && (
              <Button variant="secondary" icon={<CompareArrowsIcon />} onClick={handleCompareClick}>
                {t('vendors.compareVendors')} ({selectedVendors.length})
              </Button>
            )}
            <Button variant="primary" icon={<AddIcon />} onClick={() => { setEditingVendor(null); setDialogOpen(true) }}>
              {t('vendors.addVendor')}
            </Button>
          </Box>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 3 }}>
        <KPICard title={t('vendors.title')} value={vendors.length} icon={<BusinessIcon />} color="primary" />
        <KPICard title={t('vendors.trades.generalContractor')} value={tradeCount('general_contractor')} icon={<ConstructionIcon />} color="info" />
        <KPICard title={t('vendors.trades.supplier')} value={tradeCount('supplier')} icon={<LocalShippingIcon />} color="success" />
      </Box>

      {vendors.length > 0 && <Box sx={{ mb: 3 }}><VendorAnalytics vendors={vendors} loading={loading} /></Box>}

      <Card>
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ mb: 2 }}>
            <SearchField placeholder={t('vendors.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
          </Box>
          <FilterChips items={filterChipTrades} value={filterTrade} onChange={setFilterTrade} />
          {filteredVendors.length === 0 ? (
            <EmptyState icon={<BusinessIcon />} title={t('vendors.noVendors')} description={t('vendors.noVendorsDescription')}
              action={{ label: t('vendors.addVendor'), onClick: () => { setEditingVendor(null); setDialogOpen(true) } }} />
          ) : (
            <VendorTable vendors={filteredVendors} selectedVendors={selectedVendors}
              onSelect={handleVendorSelect}
              onSelectAll={(checked) => setSelectedVendors(checked ? filteredVendors.slice(0, 4).map(v => v.id) : [])}
              onEdit={(v) => { setEditingVendor(v); setDialogOpen(true) }}
              onDelete={(v) => { setVendorToDelete(v); setDeleteDialogOpen(true) }}
            />
          )}
        </Box>
      </Card>

      <VendorDialog open={dialogOpen} onClose={handleCloseDialog} onSubmit={handleSaveVendor} editingVendor={editingVendor} loading={saving} />
      <ConfirmModal open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleConfirmDelete}
        title={t('vendors.deleteVendor')} message={t('vendors.deleteConfirmationMessage', { name: vendorToDelete?.companyName })}
        loading={deleting} confirmLabel={t('common.delete')} variant="danger" />
      <VendorComparisonDialog open={comparisonDialogOpen} onClose={() => { setComparisonDialogOpen(false); setSelectedVendors([]) }}
        vendors={vendors.filter(v => selectedVendors.includes(v.id))} />
    </Box>
  )
}
