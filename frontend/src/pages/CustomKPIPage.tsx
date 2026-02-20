import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Skeleton, Grid, Button as MuiButton, Switch, FormControlLabel, Snackbar, Alert } from '@/mui'
import { AddIcon, ShowChartIcon } from '@/icons'
import { analyticsApi } from '../api/analytics'
import KpiCard from '../components/kpi/KpiCard'
import KpiFormDialog from '../components/kpi/KpiFormDialog'
import type { CustomKpiDefinition, KpiValue } from '../types'

export default function CustomKPIPage() {
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  const pid = projectId!

  const [kpiValues, setKpiValues] = useState<KpiValue[]>([])
  const [kpiDefs, setKpiDefs] = useState<CustomKpiDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKpi, setEditingKpi] = useState<CustomKpiDefinition | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)

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
      setToast({ message: t('kpi.loadFailed'), severity: 'error' })
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
      setToast({ message: t('kpi.createSuccess'), severity: 'success' })
      setDialogOpen(false)
      loadData()
    } catch {
      setToast({ message: t('kpi.createFailed'), severity: 'error' })
    }
  }

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingKpi) return
    try {
      await analyticsApi.updateKpi(editingKpi.id, data)
      setToast({ message: t('kpi.updateSuccess'), severity: 'success' })
      setEditingKpi(null)
      setDialogOpen(false)
      loadData()
    } catch {
      setToast({ message: t('kpi.updateFailed'), severity: 'error' })
    }
  }

  const handleDelete = async (kpiId: string) => {
    if (!confirm(t('kpi.confirmDeleteMessage'))) return
    try {
      await analyticsApi.deleteKpi(kpiId)
      setToast({ message: t('kpi.deleteSuccess'), severity: 'success' })
      loadData()
    } catch {
      setToast({ message: t('kpi.deleteFailed'), severity: 'error' })
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

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('kpi.pageTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('kpi.pageSubtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {hasInactive && (
            <FormControlLabel
              control={<Switch checked={showInactive} onChange={(_, v) => setShowInactive(v)} size="small" />}
              label={<Typography variant="caption">{showInactive ? t('kpi.hideInactive') : t('kpi.showInactive')}</Typography>}
            />
          )}
          <MuiButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditingKpi(null); setDialogOpen(true) }}
            size="small"
          >
            {t('kpi.addKpi')}
          </MuiButton>
        </Box>
      </Box>

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map(i => (
            <Grid key={i} item xs={12} sm={6} md={4}>
              <Skeleton variant="rounded" height={180} />
            </Grid>
          ))}
        </Grid>
      ) : filteredValues.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShowChartIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('kpi.noKpis')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('kpi.noKpisDescription')}
          </Typography>
          <MuiButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditingKpi(null); setDialogOpen(true) }}
          >
            {t('kpi.createFirst')}
          </MuiButton>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredValues.map(kv => (
            <Grid key={kv.kpiId} item xs={12} sm={6} md={4}>
              <KpiCard
                kpiValue={kv}
                onEdit={() => handleEdit(kv.kpiId)}
                onDelete={() => handleDelete(kv.kpiId)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <KpiFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingKpi(null) }}
        onSubmit={editingKpi ? handleUpdate : handleCreate}
        editingKpi={editingKpi}
        projectId={pid}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}
