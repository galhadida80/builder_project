import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { Tabs, TabPanel } from '../components/ui/Tabs'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField } from '../components/ui/TextField'
import { budgetApi, BudgetItemCreateData, CostEntryCreateData, ChangeOrderCreateData, ChangeOrderUpdateData } from '../api/budget'
import type { BudgetLineItem, BudgetSummary, ChangeOrder, CostEntry, BudgetCategory } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { AddIcon, EditIcon, DeleteIcon, AccountBalanceIcon, AttachMoneyIcon, ReceiptLongIcon, TrendingUpIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, MenuItem, IconButton, TextField as MuiTextField } from '@/mui'

const CATEGORIES: BudgetCategory[] = ['labor', 'materials', 'equipment', 'subcontractor', 'permits', 'overhead', 'other']
const CAT_COLORS: Record<string, string> = { labor: '#1976d2', materials: '#2e7d32', equipment: '#ed6c02', subcontractor: '#9c27b0', permits: '#0288d1', overhead: '#757575', other: '#9e9e9e' }
const CO_STATUS_COLORS: Record<string, 'default' | 'info' | 'success' | 'error'> = { draft: 'default', submitted: 'info', approved: 'success', rejected: 'error' }
const fmt = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)

export default function BudgetPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()

  const [items, setItems] = useState<BudgetLineItem[]>([])
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [costEntries, setCostEntries] = useState<Record<string, CostEntry[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('budget')
  const [itemDialog, setItemDialog] = useState(false)
  const [costDialog, setCostDialog] = useState(false)
  const [coDialog, setCoDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editItem, setEditItem] = useState<BudgetLineItem | null>(null)
  const [editCO, setEditCO] = useState<ChangeOrder | null>(null)
  const [costItemId, setCostItemId] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<BudgetItemCreateData>({ name: '', category: 'other', budgeted_amount: 0 })
  const [costForm, setCostForm] = useState<CostEntryCreateData>({ amount: 0, entry_date: today() })
  const [coForm, setCoForm] = useState<ChangeOrderCreateData & { status?: string }>({ title: '', amount: 0 })

  useEffect(() => { if (projectId) loadData() }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [il, bs, co] = await Promise.all([budgetApi.listItems(projectId), budgetApi.getSummary(projectId), budgetApi.listChangeOrders(projectId)])
      setItems(il); setSummary(bs); setChangeOrders(co)
    } catch { showError(t('budget.loadFailed', { defaultValue: 'Failed to load budget data' })) }
    finally { setLoading(false) }
  }

  const loadCosts = async (itemId: string) => {
    if (!projectId) return
    try { setCostEntries(prev => ({ ...prev, [itemId]: [] })); const c = await budgetApi.listCostEntries(projectId, itemId); setCostEntries(prev => ({ ...prev, [itemId]: c })) } catch { /* silent */ }
  }

  const handleSaveItem = async () => {
    if (!projectId) return
    try {
      if (editItem) await budgetApi.updateItem(projectId, editItem.id, itemForm)
      else await budgetApi.createItem(projectId, itemForm)
      showSuccess(t('budget.itemSaved', { defaultValue: 'Budget item saved' }))
      setItemDialog(false); setEditItem(null); setItemForm({ name: '', category: 'other', budgeted_amount: 0 }); loadData()
    } catch { showError(t('budget.saveFailed', { defaultValue: 'Failed to save' })) }
  }

  const handleSaveCost = async () => {
    if (!projectId || !costItemId) return
    try {
      await budgetApi.createCostEntry(projectId, costItemId, costForm)
      showSuccess(t('budget.costSaved', { defaultValue: 'Cost entry added' }))
      setCostDialog(false); setCostForm({ amount: 0, entry_date: today() }); loadCosts(costItemId); loadData()
    } catch { showError(t('budget.saveFailed', { defaultValue: 'Failed to save' })) }
  }

  const handleSaveCO = async () => {
    if (!projectId) return
    try {
      if (editCO) await budgetApi.updateChangeOrder(projectId, editCO.id, coForm)
      else await budgetApi.createChangeOrder(projectId, coForm)
      showSuccess(t('budget.coSaved', { defaultValue: 'Change order saved' }))
      setCoDialog(false); setEditCO(null); setCoForm({ title: '', amount: 0 }); loadData()
    } catch { showError(t('budget.saveFailed', { defaultValue: 'Failed to save' })) }
  }

  const handleDelete = async () => {
    if (!projectId || !deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'item') await withMinDuration(budgetApi.deleteItem(projectId, deleteTarget.id))
      else if (deleteTarget.type === 'co') await withMinDuration(budgetApi.deleteChangeOrder(projectId, deleteTarget.id))
      else { await withMinDuration(budgetApi.deleteCostEntry(projectId, deleteTarget.id)); if (expanded) loadCosts(expanded) }
      showSuccess(t('budget.deleted', { defaultValue: 'Deleted' })); setDeleteTarget(null); loadData()
    } catch { showError(t('budget.deleteFailed', { defaultValue: 'Failed to delete' })) }
    finally { setDeleting(false) }
  }

  const openEditItem = (item: BudgetLineItem) => { setEditItem(item); setItemForm({ name: item.name, category: item.category, description: item.description, budgeted_amount: item.budgetedAmount }); setItemDialog(true) }
  const openAddCost = (id: string) => { setCostItemId(id); setCostForm({ amount: 0, entry_date: today() }); setCostDialog(true) }
  const openEditCO = (co: ChangeOrder) => { setEditCO(co); setCoForm({ title: co.title, description: co.description, amount: co.amount, status: co.status, budget_item_id: co.budgetItemId }); setCoDialog(true) }

  const handleRowClick = (row: BudgetLineItem) => {
    const next = expanded === row.id ? null : row.id
    setExpanded(next)
    if (next && !costEntries[row.id]) loadCosts(row.id)
  }

  const itemCols: Column<BudgetLineItem>[] = [
    { id: 'name', label: t('budget.name', { defaultValue: 'Name' }), minWidth: 160, render: (r) => <Typography variant="body2" fontWeight={600}>{r.name}</Typography> },
    { id: 'category', label: t('budget.category', { defaultValue: 'Category' }), minWidth: 120, render: (r) => <Chip size="small" label={t(`budget.categories.${r.category}`, { defaultValue: r.category })} sx={{ bgcolor: CAT_COLORS[r.category] || '#9e9e9e', color: '#fff', fontWeight: 500 }} /> },
    { id: 'budgetedAmount', label: t('budget.budgeted', { defaultValue: 'Budgeted' }), minWidth: 120, sortable: true, render: (r) => <Typography variant="body2">{fmt(r.budgetedAmount)}</Typography> },
    { id: 'actualAmount', label: t('budget.actual', { defaultValue: 'Actual' }), minWidth: 120, hideOnMobile: true, render: (r) => <Typography variant="body2">{fmt(r.actualAmount)}</Typography> },
    { id: 'remainingAmount', label: t('budget.remaining', { defaultValue: 'Remaining' }), minWidth: 120, hideOnMobile: true, render: (r) => <Typography variant="body2" color={r.remainingAmount >= 0 ? 'success.main' : 'error.main'}>{fmt(r.remainingAmount)}</Typography> },
    { id: 'actions', label: '', minWidth: 130, align: 'right', render: (r) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <IconButton size="small" aria-label={t('budget.addCost')} onClick={(e) => { e.stopPropagation(); openAddCost(r.id) }}><AttachMoneyIcon fontSize="small" /></IconButton>
        <IconButton size="small" aria-label={t('budget.editItem')} onClick={(e) => { e.stopPropagation(); openEditItem(r) }}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" aria-label={t('common.delete')} onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'item', id: r.id }) }}><DeleteIcon fontSize="small" /></IconButton>
      </Box>
    )},
  ]

  const coCols: Column<ChangeOrder>[] = [
    { id: 'changeOrderNumber', label: '#', minWidth: 60, sortable: true, render: (r) => <Typography variant="body2" fontWeight={600}>CO-{r.changeOrderNumber}</Typography> },
    { id: 'title', label: t('budget.coTitle', { defaultValue: 'Title' }), minWidth: 180 },
    { id: 'amount', label: t('budget.amount', { defaultValue: 'Amount' }), minWidth: 120, sortable: true, render: (r) => <Typography variant="body2" color={r.amount >= 0 ? 'success.main' : 'error.main'}>{fmt(r.amount)}</Typography> },
    { id: 'status', label: t('common.status', { defaultValue: 'Status' }), minWidth: 110, render: (r) => <Chip size="small" label={t(`budget.statuses.${r.status}`, { defaultValue: r.status })} color={CO_STATUS_COLORS[r.status] || 'default'} /> },
    { id: 'requestedDate', label: t('budget.date', { defaultValue: 'Date' }), minWidth: 100, hideOnMobile: true, render: (r) => <Typography variant="body2">{r.requestedDate ? new Date(r.requestedDate).toLocaleDateString(getDateLocale()) : '-'}</Typography> },
    { id: 'actions', label: '', minWidth: 90, align: 'right', render: (r) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <IconButton size="small" aria-label={t('budget.editChangeOrder')} onClick={(e) => { e.stopPropagation(); openEditCO(r) }}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" aria-label={t('common.delete')} onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'co', id: r.id }) }}><DeleteIcon fontSize="small" /></IconButton>
      </Box>
    )},
  ]

  if (loading) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}
      </Box>
      <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
    </Box>
  )

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('budget.title', { defaultValue: 'Budget & Cost Tracking' })}
        subtitle={t('budget.subtitle', { defaultValue: 'Manage budget items, costs, and change orders' })}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('budget.title', { defaultValue: 'Budget' }) }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={() => {
            if (activeTab === 'budget') { setEditItem(null); setItemForm({ name: '', category: 'other', budgeted_amount: 0 }); setItemDialog(true) }
            else { setEditCO(null); setCoForm({ title: '', amount: 0 }); setCoDialog(true) }
          }}>
            {activeTab === 'budget' ? t('budget.addItem', { defaultValue: 'Add Item' }) : t('budget.addChangeOrder', { defaultValue: 'Add Change Order' })}
          </Button>
        }
      />

      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
          <KPICard title={t('budget.totalBudget', { defaultValue: 'Total Budget' })} value={fmt(summary.totalBudgeted)} icon={<AccountBalanceIcon />} color="primary" />
          <KPICard title={t('budget.totalSpent', { defaultValue: 'Total Spent' })} value={fmt(summary.totalActual)} icon={<AttachMoneyIcon />} color="warning" />
          <KPICard title={t('budget.variance', { defaultValue: 'Variance' })} value={fmt(summary.totalVariance)} icon={<TrendingUpIcon />} color={summary.totalVariance >= 0 ? 'success' : 'error'} />
          <KPICard title={t('budget.changeOrders', { defaultValue: 'Change Orders' })} value={`${summary.approvedChangeOrders}/${summary.totalChangeOrders}`} icon={<ReceiptLongIcon />} color="info" />
        </Box>
      )}

      <Card>
        <Box sx={{ p: 2 }}>
          <Tabs items={[
            { label: t('budget.budgetItems', { defaultValue: 'Budget Items' }), value: 'budget', badge: items.length },
            { label: t('budget.changeOrders', { defaultValue: 'Change Orders' }), value: 'changeOrders', badge: changeOrders.length },
          ]} value={activeTab} onChange={setActiveTab} size="small" />

          <TabPanel value="budget" activeValue={activeTab}>
            {items.length === 0
              ? <EmptyState title={t('budget.noItems', { defaultValue: 'No budget items' })} description={t('budget.noItemsDesc', { defaultValue: 'Add your first budget item to start tracking costs.' })} />
              : <DataTable columns={itemCols} rows={items} getRowId={(r) => r.id} onRowClick={handleRowClick} renderMobileCard={(row) => (
                  <Box
                    onClick={() => handleRowClick(row)}
                    sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:active': { bgcolor: 'action.pressed' } }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>{row.name}</Typography>
                      <Chip size="small" label={t(`budget.categories.${row.category}`, { defaultValue: row.category })} sx={{ bgcolor: CAT_COLORS[row.category] || '#9e9e9e', color: '#fff', fontWeight: 500, fontSize: '0.7rem', height: 22 }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">{t('budget.budgeted', { defaultValue: 'Budgeted' })}</Typography>
                        <Typography variant="body2" fontWeight={500}>{fmt(row.budgetedAmount)}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{t('budget.actual', { defaultValue: 'Actual' })}</Typography>
                        <Typography variant="body2">{fmt(row.actualAmount)}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">{t('budget.remaining', { defaultValue: 'Remaining' })}</Typography>
                        <Typography variant="body2" color={row.remainingAmount >= 0 ? 'success.main' : 'error.main'} fontWeight={500}>{fmt(row.remainingAmount)}</Typography>
                      </Box>
                    </Box>
                  </Box>
                )} renderExpandedRow={(row) => {
                  if (expanded !== row.id) return null
                  const costs = costEntries[row.id] || []
                  return (
                    <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('budget.costEntries', { defaultValue: 'Cost Entries' })} ({costs.length})</Typography>
                      {costs.length === 0 ? <Typography variant="body2" color="text.secondary">{t('budget.noCosts', { defaultValue: 'No cost entries yet' })}</Typography> : costs.map(c => (
                        <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box>
                            <Typography variant="body2">{c.description || c.vendor || '-'}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(c.entryDate).toLocaleDateString(getDateLocale())}{c.vendor ? ` - ${c.vendor}` : ''}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{fmt(c.amount)}</Typography>
                            <IconButton size="small" aria-label={t('common.delete')} onClick={() => setDeleteTarget({ type: 'cost', id: c.id })}><DeleteIcon fontSize="small" /></IconButton>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )
                }} />
            }
          </TabPanel>

          <TabPanel value="changeOrders" activeValue={activeTab}>
            {changeOrders.length === 0
              ? <EmptyState title={t('budget.noCOs', { defaultValue: 'No change orders' })} description={t('budget.noCOsDesc', { defaultValue: 'Create a change order to track budget adjustments.' })} />
              : <DataTable columns={coCols} rows={changeOrders} getRowId={(r) => r.id} renderMobileCard={(row) => (
                  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={700}>CO-{row.changeOrderNumber}</Typography>
                      <Chip size="small" label={t(`budget.statuses.${row.status}`, { defaultValue: row.status })} color={CO_STATUS_COLORS[row.status] || 'default'} sx={{ fontSize: '0.7rem', height: 22 }} />
                    </Box>
                    <Typography variant="body2" noWrap sx={{ mb: 0.5 }}>{row.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={600} color={row.amount >= 0 ? 'success.main' : 'error.main'}>{fmt(row.amount)}</Typography>
                      {row.requestedDate && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(row.requestedDate).toLocaleDateString(getDateLocale())}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )} />
            }
          </TabPanel>
        </Box>
      </Card>

      <FormModal open={itemDialog} onClose={() => { setItemDialog(false); setEditItem(null) }} onSubmit={handleSaveItem} title={editItem ? t('budget.editItem', { defaultValue: 'Edit Budget Item' }) : t('budget.addItem', { defaultValue: 'Add Budget Item' })} submitDisabled={!itemForm.name || !itemForm.budgeted_amount || itemForm.budgeted_amount <= 0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField fullWidth label={t('budget.name', { defaultValue: 'Name' })} value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
          <MuiTextField select fullWidth label={t('budget.category', { defaultValue: 'Category' })} value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{t(`budget.categories.${c}`, { defaultValue: c })}</MenuItem>)}
          </MuiTextField>
          <TextField fullWidth label={t('budget.description', { defaultValue: 'Description' })} multiline rows={2} value={itemForm.description || ''} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value || undefined })} />
          <TextField fullWidth label={t('budget.budgetedAmount', { defaultValue: 'Budgeted Amount' })} type="number" value={itemForm.budgeted_amount} onChange={(e) => setItemForm({ ...itemForm, budgeted_amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })} required />
        </Box>
      </FormModal>

      <FormModal open={costDialog} onClose={() => setCostDialog(false)} onSubmit={handleSaveCost} title={t('budget.addCost', { defaultValue: 'Add Cost Entry' })} submitDisabled={!costForm.amount || costForm.amount <= 0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField fullWidth label={t('budget.amount', { defaultValue: 'Amount' })} type="number" value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })} required />
          <TextField fullWidth label={t('budget.date', { defaultValue: 'Date' })} type="date" InputLabelProps={{ shrink: true }} value={costForm.entry_date} onChange={(e) => setCostForm({ ...costForm, entry_date: e.target.value })} />
          <TextField fullWidth label={t('budget.vendor', { defaultValue: 'Vendor' })} value={costForm.vendor || ''} onChange={(e) => setCostForm({ ...costForm, vendor: e.target.value || undefined })} />
          <TextField fullWidth label={t('budget.description', { defaultValue: 'Description' })} value={costForm.description || ''} onChange={(e) => setCostForm({ ...costForm, description: e.target.value || undefined })} />
          <TextField fullWidth label={t('budget.referenceNumber', { defaultValue: 'Reference #' })} value={costForm.reference_number || ''} onChange={(e) => setCostForm({ ...costForm, reference_number: e.target.value || undefined })} />
        </Box>
      </FormModal>

      <FormModal open={coDialog} onClose={() => { setCoDialog(false); setEditCO(null) }} onSubmit={handleSaveCO} title={editCO ? t('budget.editCO', { defaultValue: 'Edit Change Order' }) : t('budget.addChangeOrder', { defaultValue: 'Add Change Order' })} submitDisabled={!coForm.title || coForm.amount == null}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField fullWidth label={t('budget.coTitle', { defaultValue: 'Title' })} value={coForm.title} onChange={(e) => setCoForm({ ...coForm, title: e.target.value })} required />
          <TextField fullWidth label={t('budget.amount', { defaultValue: 'Amount' })} type="number" value={coForm.amount || ''} onChange={(e) => setCoForm({ ...coForm, amount: parseFloat(e.target.value) || 0 })} required />
          <TextField fullWidth label={t('budget.description', { defaultValue: 'Description' })} multiline rows={2} value={coForm.description || ''} onChange={(e) => setCoForm({ ...coForm, description: e.target.value || undefined })} />
          {editCO && (
            <MuiTextField select fullWidth label={t('common.status', { defaultValue: 'Status' })} value={coForm.status || 'draft'} onChange={(e) => setCoForm({ ...coForm, status: e.target.value })}>
              {['draft', 'submitted', 'approved', 'rejected'].map(s => <MenuItem key={s} value={s}>{t(`budget.statuses.${s}`, { defaultValue: s })}</MenuItem>)}
            </MuiTextField>
          )}
          <TextField fullWidth label={t('budget.requestedDate', { defaultValue: 'Requested Date' })} type="date" InputLabelProps={{ shrink: true }} value={coForm.requested_date || ''} onChange={(e) => setCoForm({ ...coForm, requested_date: e.target.value || undefined })} />
        </Box>
      </FormModal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title={t('budget.confirmDelete', { defaultValue: 'Confirm Delete' })} message={t('budget.deleteMessage', { defaultValue: 'Are you sure? This cannot be undone.' })} loading={deleting} />
    </Box>
  )
}
