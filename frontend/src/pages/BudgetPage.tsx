import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField } from '../components/ui/TextField'
import { budgetApi, BudgetItemCreateData, CostEntryCreateData, ChangeOrderCreateData, ChangeOrderUpdateData } from '../api/budget'
import type { BudgetLineItem, BudgetSummary, ChangeOrder, CostEntry, BudgetCategory } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { AddIcon, EditIcon, DeleteIcon, AttachMoneyIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, MenuItem, IconButton, LinearProgress, TextField as MuiTextField } from '@/mui'

const CATEGORIES: BudgetCategory[] = ['labor', 'materials', 'equipment', 'subcontractor', 'permits', 'overhead', 'other']
const CAT_COLORS: Record<string, string> = { labor: '#e07842', materials: '#1976d2', equipment: '#2e7d32', subcontractor: '#9c27b0', permits: '#0288d1', overhead: '#757575', other: '#9e9e9e' }
const CO_STATUS_COLORS: Record<string, 'default' | 'info' | 'success' | 'error'> = { draft: 'default', submitted: 'info', approved: 'success', rejected: 'error' }
const fmt = (n: number) => n.toLocaleString(getDateLocale(), { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  if (loading) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}
      </Box>
      <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
    </Box>
  )

  const usagePct = summary ? (summary.totalBudgeted > 0 ? Math.round((summary.totalActual / summary.totalBudgeted) * 100) : 0) : 0
  const categorySummary = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { budgeted: 0, actual: 0 }
    acc[item.category].budgeted += item.budgetedAmount
    acc[item.category].actual += item.actualAmount
    return acc
  }, {} as Record<string, { budgeted: number; actual: number }>)

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('budget.title', { defaultValue: 'Budget & Cost Tracking' })}
        subtitle={t('budget.subtitle', { defaultValue: 'Manage budget items, costs, and change orders' })}
        actions={
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Button variant="primary" icon={<AddIcon />} onClick={() => {
              if (activeTab === 'budget') { setEditItem(null); setItemForm({ name: '', category: 'other', budgeted_amount: 0 }); setItemDialog(true) }
              else { setEditCO(null); setCoForm({ title: '', amount: 0 }); setCoDialog(true) }
            }}>
              {activeTab === 'budget' ? t('budget.addItem', { defaultValue: 'Add Item' }) : t('budget.addChangeOrder', { defaultValue: 'Add Change Order' })}
            </Button>
          </Box>
        }
      />

      {summary && (
        <Card sx={{ mb: 3, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('budget.budgetUtilization', { defaultValue: 'Budget Utilization' })}
            </Typography>
            <Box sx={{ position: 'relative', width: 140, height: 140, mb: 2 }}>
              <svg viewBox="0 0 96 96" style={{ width: '100%', height: '100%' }}>
                <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="7" style={{ color: 'var(--mui-palette-divider, #e0e0e0)' }} />
                <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="7" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * Math.min(usagePct, 100)) / 100} strokeLinecap="round" style={{ color: usagePct <= 100 ? '#e07842' : '#d32f2f', transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 600ms ease' }} />
              </svg>
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>{usagePct}%</Typography>
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700}>{fmt(summary.totalBudgeted)}</Typography>
            <Chip
              size="small"
              label={usagePct <= 100 ? t('budget.onBudget', { defaultValue: 'On Budget' }) : t('budget.overBudget', { defaultValue: 'Over Budget' })}
              sx={{
                mt: 1,
                bgcolor: usagePct <= 100 ? 'rgba(46,125,50,0.12)' : 'rgba(211,47,47,0.12)',
                color: usagePct <= 100 ? '#2e7d32' : '#d32f2f',
                fontWeight: 600,
              }}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">{t('budget.used', { defaultValue: 'Used' })}</Typography>
              <Typography variant="h6" fontWeight={600}>{fmt(summary.totalActual)}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">{t('budget.remaining', { defaultValue: 'Remaining' })}</Typography>
              <Typography variant="h6" fontWeight={600}>{fmt(summary.totalVariance)}</Typography>
            </Box>
          </Box>
        </Card>
      )}

      {Object.keys(categorySummary).length > 0 && (
        <Card sx={{ mb: 3, p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            {t('budget.breakdownByCategory', { defaultValue: 'Breakdown by Category' })}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {Object.entries(categorySummary)
              .sort(([, a], [, b]) => (b.budgeted > 0 ? b.actual / b.budgeted : 0) - (a.budgeted > 0 ? a.actual / a.budgeted : 0))
              .map(([cat, data]) => {
                const catPct = data.budgeted > 0 ? Math.round((data.actual / data.budgeted) * 100) : 0
                return (
                  <Box key={cat}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: CAT_COLORS[cat] || '#9e9e9e' }}>
                          {catPct}%
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {t(`budget.categories.${cat}`, { defaultValue: cat })}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('budget.fromOf', { actual: Math.round(data.actual).toLocaleString(), budgeted: Math.round(data.budgeted).toLocaleString(), defaultValue: `₪${Math.round(data.actual).toLocaleString()} from ₪${Math.round(data.budgeted).toLocaleString()}` })}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(catPct, 100)}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: 'divider',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5,
                          bgcolor: CAT_COLORS[cat] || '#9e9e9e',
                          transition: 'transform 600ms ease',
                        },
                      }}
                    />
                  </Box>
                )
              })}
          </Box>
        </Card>
      )}

      {Object.values(costEntries).flat().length > 0 && (
        <Card sx={{ mb: 3, p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            {t('budget.recentExpenses', { defaultValue: 'Recent Expenses' })}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {Object.entries(costEntries)
              .flatMap(([itemId, entries]) => entries.map(e => ({ ...e, itemId })))
              .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
              .slice(0, 5)
              .map((entry) => {
                const parentItem = items.find(i => i.id === entry.itemId)
                return (
                  <Box key={entry.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body1" fontWeight={700}>{fmt(entry.amount)}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>{entry.description || entry.vendor || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(entry.entryDate).toLocaleDateString(getDateLocale())}</Typography>
                    </Box>
                    {parentItem && (
                      <Chip
                        size="small"
                        label={t(`budget.categories.${parentItem.category}`, { defaultValue: parentItem.category })}
                        sx={{
                          ml: 1,
                          bgcolor: `${CAT_COLORS[parentItem.category] || '#9e9e9e'}20`,
                          color: CAT_COLORS[parentItem.category] || '#9e9e9e',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    )}
                  </Box>
                )
              })}
          </Box>
        </Card>
      )}

      <Tabs items={[
        { label: t('budget.budgetItems', { defaultValue: 'Budget Items' }), value: 'budget', badge: items.length },
        { label: t('budget.changeOrders', { defaultValue: 'Change Orders' }), value: 'changeOrders', badge: changeOrders.length },
      ]} value={activeTab} onChange={setActiveTab} size="small" />

      {activeTab === 'budget' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
          {items.length === 0 ? (
            <EmptyState title={t('budget.noItems', { defaultValue: 'No budget items' })} description={t('budget.noItemsDesc', { defaultValue: 'Add your first budget item to start tracking costs.' })} />
          ) : (
            items.map((row) => {
              const pct = row.budgetedAmount > 0 ? Math.round((row.actualAmount / row.budgetedAmount) * 100) : 0
              return (
                <Card key={row.id} hoverable onClick={() => handleRowClick(row)}>
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                      <Typography variant="caption" fontWeight={600} color="primary.main">{pct}%</Typography>
                    </Box>
                    <Box sx={{ height: 8, bgcolor: 'divider', borderRadius: 4, overflow: 'hidden', mb: 1 }}>
                      <Box sx={{ height: '100%', bgcolor: CAT_COLORS[row.category] || '#9e9e9e', borderRadius: 4, width: `${Math.min(pct, 100)}%`, transition: 'width 300ms' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">{fmt(row.actualAmount)} / {fmt(row.budgetedAmount)}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, justifyContent: 'flex-end' }}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); openAddCost(row.id) }}><AttachMoneyIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditItem(row) }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'item', id: row.id }) }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                    {expanded === row.id && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" fontWeight={600}>{t('budget.costEntries', { defaultValue: 'Cost Entries' })}</Typography>
                        {(costEntries[row.id] || []).length === 0
                          ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('budget.noCosts', { defaultValue: 'No cost entries yet' })}</Typography>
                          : (costEntries[row.id] || []).map(c => (
                            <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.5, mt: 0.75, borderRadius: 2, bgcolor: 'action.hover' }}>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" fontWeight={700}>{fmt(c.amount)}</Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>{c.description || c.vendor || '-'}</Typography>
                                <Typography variant="caption" color="text.secondary">{new Date(c.entryDate).toLocaleDateString(getDateLocale())}</Typography>
                              </Box>
                              <Chip
                                size="small"
                                label={t(`budget.categories.${row.category}`, { defaultValue: row.category })}
                                sx={{
                                  ml: 1,
                                  bgcolor: `${CAT_COLORS[row.category] || '#9e9e9e'}20`,
                                  color: CAT_COLORS[row.category] || '#9e9e9e',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}
                              />
                            </Box>
                          ))}
                      </Box>
                    )}
                  </Box>
                </Card>
              )
            })
          )}
        </Box>
      )}

      {activeTab === 'changeOrders' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
          {changeOrders.length === 0 ? (
            <EmptyState title={t('budget.noCOs', { defaultValue: 'No change orders' })} description={t('budget.noCOsDesc', { defaultValue: 'Create a change order to track budget adjustments.' })} />
          ) : (
            changeOrders.map((co) => (
              <Card key={co.id}>
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="body2" fontWeight={700}>CO-{co.changeOrderNumber}</Typography>
                    <Chip size="small" label={t(`budget.statuses.${co.status}`, { defaultValue: co.status })} color={CO_STATUS_COLORS[co.status] || 'default'} />
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>{co.title}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight={700} color={co.amount >= 0 ? 'success.main' : 'error.main'}>{fmt(co.amount)}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => openEditCO(co)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={() => setDeleteTarget({ type: 'co', id: co.id })}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                    </Box>
                  </Box>
                </Box>
              </Card>
            ))
          )}
        </Box>
      )}

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
