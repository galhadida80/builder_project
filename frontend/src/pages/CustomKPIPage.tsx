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
import { AddIcon, ShowChartIcon } from '@/icons'
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
