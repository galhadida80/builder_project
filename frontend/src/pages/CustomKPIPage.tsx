import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { analyticsApi } from '../api/analytics'
import KpiCard from '../components/kpi/KpiCard'
import KpiFormDialog from '../components/kpi/KpiFormDialog'
import { useToast } from '../components/common/ToastProvider'
import type { CustomKpiDefinition, KpiValue } from '../types'
import { AddIcon, ShowChartIcon, CalendarMonthIcon } from '@/icons'
import { Box, Typography, Skeleton, Switch, FormControlLabel } from '@/mui'

export default function CustomKPIPage() {
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  const pid = projectId!
  const { showError, showSuccess } = useToast()

  const [kpiValues, setKpiValues] = useState<KpiValue[]>([])
  const [kpiDefs, setKpiDefs] = useState<CustomKpiDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKpi, setEditingKpi] = useState<CustomKpiDefinition | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [period, setPeriod] = useState('month')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [values, defs] = await Promise.all([
        analyticsApi.getKpiValues(pid),
        analyticsApi.listKpis(pid),
      ])
      setKpiValues(values)
      setKpiDefs(defs)
    } catch {
      showError(t('kpi.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [pid, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async (data: Record<string, unknown>) => {
    try {
      await analyticsApi.createKpi(data)
      showSuccess(t('kpi.createSuccess'))
      setDialogOpen(false)
      loadData()
    } catch {
      showError(t('kpi.createFailed'))
    }
  }

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingKpi) return
    try {
      await analyticsApi.updateKpi(editingKpi.id, data)
      showSuccess(t('kpi.updateSuccess'))
      setEditingKpi(null)
      setDialogOpen(false)
      loadData()
    } catch {
      showError(t('kpi.updateFailed'))
    }
  }

  const handleDelete = async (kpiId: string) => {
    if (!confirm(t('kpi.confirmDeleteMessage'))) return
    try {
      await analyticsApi.deleteKpi(kpiId)
      showSuccess(t('kpi.deleteSuccess'))
      loadData()
    } catch {
      showError(t('kpi.deleteFailed'))
    }
  }

  const handleEdit = (kpiId: string) => {
    const def = kpiDefs.find(d => d.id === kpiId)
    if (def) {
      setEditingKpi(def)
      setDialogOpen(true)
    }
  }

  const filteredValues = showInactive
    ? kpiValues
    : kpiValues.filter(v => {
        const def = kpiDefs.find(d => d.id === v.kpiId)
        return def ? def.isActive : true
      })

  const hasInactive = kpiDefs.some(d => !d.isActive)

  if (loading) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={160} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('kpi.pageTitle')}
        subtitle={t('kpi.pageSubtitle')}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={() => { setEditingKpi(null); setDialogOpen(true) }}>
            {t('kpi.addKpi')}
          </Button>
        }
      />

      <Box sx={{ mb: 2, bgcolor: 'action.hover', borderRadius: 2, p: 0.5, display: 'flex' }}>
        {[
          { key: 'year', label: t('kpi.year') },
          { key: 'quarter', label: t('kpi.quarter') },
          { key: 'month', label: t('kpi.month') },
          { key: 'week', label: t('kpi.week') },
        ].map(p => (
          <Box key={p.key} onClick={() => setPeriod(p.key)}
            sx={{ flex: 1, py: 1, textAlign: 'center', borderRadius: 1.5, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              bgcolor: period === p.key ? 'primary.main' : 'transparent', color: period === p.key ? 'white' : 'text.secondary',
              boxShadow: period === p.key ? 1 : 0, transition: 'all 0.2s' }}>
            {p.label}
          </Box>
        ))}
      </Box>

      {hasInactive && (
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={<Switch checked={showInactive} onChange={(_, v) => setShowInactive(v)} size="small" />}
            label={<Typography variant="caption">{showInactive ? t('kpi.hideInactive') : t('kpi.showInactive')}</Typography>}
          />
        </Box>
      )}

      {filteredValues.length === 0 ? (
        <EmptyState
          icon={<ShowChartIcon sx={{ color: 'text.secondary' }} />}
          title={t('kpi.noKpis')}
          description={t('kpi.noKpisDescription')}
          action={{ label: t('kpi.createFirst'), onClick: () => { setEditingKpi(null); setDialogOpen(true) } }}
        />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          {filteredValues.map(kv => (
            <KpiCard
              key={kv.kpiId}
              kpiValue={kv}
              onEdit={() => handleEdit(kv.kpiId)}
              onDelete={() => handleDelete(kv.kpiId)}
            />
          ))}
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="body2" fontWeight={700} sx={{ mb: 2 }}>
          {t('kpi.snapshots')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
          {[
            { month: t('kpi.currentMonth'), progress: `${filteredValues.length > 0 ? filteredValues[0].value?.toFixed(0) ?? '—' : '—'}`, budget: t('kpi.onTrack'), active: true },
            { month: t('kpi.previousMonth'), progress: '—', budget: '—', active: false },
          ].map((snap, idx) => (
            <Box key={idx} sx={{ minWidth: 176, p: 2, borderRadius: 2, border: 1, borderColor: snap.active ? 'primary.main' : 'divider', bgcolor: 'background.paper', flexShrink: 0, opacity: snap.active ? 1 : 0.6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: snap.active ? 'primary.light' : 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarMonthIcon sx={{ fontSize: 18, color: snap.active ? 'primary.main' : 'text.secondary' }} />
                </Box>
                <Typography variant="body2" fontWeight={700}>{snap.month}</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">{t('kpi.progress')}</Typography>
                  <Typography variant="caption" fontWeight={700}>{snap.progress}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">{t('kpi.budgetStatus')}</Typography>
                  <Typography variant="caption" fontWeight={700} color={snap.budget === t('kpi.onTrack') ? 'success.main' : 'text.secondary'}>{snap.budget}</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <KpiFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingKpi(null) }}
        onSubmit={editingKpi ? handleUpdate : handleCreate}
        editingKpi={editingKpi}
        projectId={pid}
      />
    </Box>
  )
}
