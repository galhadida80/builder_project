import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, Box, Typography,
} from '@/mui'
import type { SelectChangeEvent } from '@/mui'
import type { CustomKpiDefinition } from '../../types'

interface KpiFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  editingKpi?: CustomKpiDefinition | null
  projectId: string
}

const ENTITY_TYPES = ['equipment', 'material', 'inspection', 'rfi', 'defect', 'task', 'budget', 'checklist', 'area']
const CALCULATIONS = ['count', 'sum', 'average']
const COLOR_OPTIONS = ['#e07842', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4', '#795548', '#607d8b']

interface FormState {
  name: string
  description: string
  kpi_type: string
  entity_type: string
  calculation: string
  field_name: string
  target_value: string
  warning_threshold: string
  unit: string
  display_order: string
  icon: string
  color: string
  filter_status: string
}

export default function KpiFormDialog({ open, onClose, onSubmit, editingKpi, projectId }: KpiFormDialogProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    kpi_type: 'count',
    entity_type: 'equipment',
    calculation: 'count',
    field_name: '',
    target_value: '',
    warning_threshold: '',
    unit: '',
    display_order: '0',
    icon: '',
    color: '#e07842',
    filter_status: '',
  })

  useEffect(() => {
    if (editingKpi) {
      setForm({
        name: editingKpi.name,
        description: editingKpi.description || '',
        kpi_type: editingKpi.kpiType,
        entity_type: editingKpi.entityType,
        calculation: editingKpi.calculation,
        field_name: editingKpi.fieldName || '',
        target_value: editingKpi.targetValue != null ? String(editingKpi.targetValue) : '',
        warning_threshold: editingKpi.warningThreshold != null ? String(editingKpi.warningThreshold) : '',
        unit: editingKpi.unit || '',
        display_order: String(editingKpi.displayOrder || 0),
        icon: editingKpi.icon || '',
        color: editingKpi.color || '#e07842',
        filter_status: editingKpi.filterConfig?.status as string || '',
      })
    } else {
      setForm({
        name: '', description: '', kpi_type: 'count', entity_type: 'equipment',
        calculation: 'count', field_name: '', target_value: '', warning_threshold: '',
        unit: '', display_order: '0', icon: '', color: '#e07842', filter_status: '',
      })
    }
  }, [editingKpi, open])

  const handleChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = () => {
    const data: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      kpi_type: form.calculation,
      entity_type: form.entity_type,
      calculation: form.calculation,
      field_name: form.field_name || null,
      target_value: form.target_value ? parseFloat(form.target_value) : null,
      warning_threshold: form.warning_threshold ? parseFloat(form.warning_threshold) : null,
      unit: form.unit || null,
      display_order: parseInt(form.display_order) || 0,
      icon: form.icon || null,
      color: form.color || null,
      project_id: projectId,
      filter_config: form.filter_status ? { status: form.filter_status } : null,
    }
    onSubmit(data)
  }

  const showFieldName = form.calculation === 'sum' || form.calculation === 'average'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingKpi ? t('kpi.editKpi') : t('kpi.addKpi')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('kpi.name')}
            value={form.name}
            onChange={handleChange('name')}
            required
            fullWidth
            size="small"
          />
          <TextField
            label={t('kpi.description')}
            value={form.description}
            onChange={handleChange('description')}
            multiline
            rows={2}
            fullWidth
            size="small"
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('kpi.entityType')}</InputLabel>
                <Select value={form.entity_type} onChange={handleChange('entity_type')} label={t('kpi.entityType')}>
                  {ENTITY_TYPES.map(et => (
                    <MenuItem key={et} value={et}>{t(`kpi.entityTypes.${et}`)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('kpi.calculation')}</InputLabel>
                <Select value={form.calculation} onChange={handleChange('calculation')} label={t('kpi.calculation')}>
                  {CALCULATIONS.map(c => (
                    <MenuItem key={c} value={c}>{t(`kpi.calculations.${c}`)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {showFieldName && (
            <TextField
              label={t('kpi.fieldName')}
              value={form.field_name}
              onChange={handleChange('field_name')}
              fullWidth
              size="small"
              placeholder="amount, estimated_hours..."
            />
          )}

          <TextField
            label={t('kpi.filterStatus')}
            value={form.filter_status}
            onChange={handleChange('filter_status')}
            fullWidth
            size="small"
            placeholder="approved, completed, open..."
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('kpi.targetValue')}
                value={form.target_value}
                onChange={handleChange('target_value')}
                type="number"
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('kpi.warningThreshold')}
                value={form.warning_threshold}
                onChange={handleChange('warning_threshold')}
                type="number"
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('kpi.unit')}
                value={form.unit}
                onChange={handleChange('unit')}
                fullWidth
                size="small"
                placeholder="%, units, NIS..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('kpi.displayOrder')}
                value={form.display_order}
                onChange={handleChange('display_order')}
                type="number"
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {t('kpi.color')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map(c => (
                <Box
                  key={c}
                  onClick={() => setForm(prev => ({ ...prev, color: c }))}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: c,
                    cursor: 'pointer',
                    border: form.color === c ? '3px solid' : '2px solid transparent',
                    borderColor: form.color === c ? 'text.primary' : 'transparent',
                    transition: 'border-color 0.15s',
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('close')}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!form.name.trim()}>
          {editingKpi ? t('save') : t('kpi.addKpi')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
