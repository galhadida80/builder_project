import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { bimApi } from '../../api/bim'
import { useToast } from '../common/ToastProvider'
import type {
  BimModel,
  BimExtractionResponse,
  BimExtractedArea,
  BimExtractedEquipment,
  BimExtractedMaterial,
  BimImportResult,
} from '../../types'
import { CheckCircleIcon, SyncIcon } from '@/icons'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@/mui'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
  model: BimModel
}

const STEPS = ['bim.import.stepExtract', 'bim.import.stepReview', 'bim.import.stepImport']

export default function BimImportWizard({ open, onClose, projectId, model }: Props) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()

  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [extraction, setExtraction] = useState<BimExtractionResponse | null>(null)
  const [tabIndex, setTabIndex] = useState(0)
  const [selectedAreas, setSelectedAreas] = useState<Set<number>>(new Set())
  const [selectedEquipment, setSelectedEquipment] = useState<Set<number>>(new Set())
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<BimImportResult[]>([])

  useEffect(() => {
    if (open) {
      setActiveStep(0)
      setExtraction(null)
      setSelectedAreas(new Set())
      setSelectedEquipment(new Set())
      setSelectedMaterials(new Set())
      setResults([])
      setTabIndex(0)
    }
  }, [open])

  const handleExtract = async (refresh = false) => {
    setLoading(true)
    try {
      const data = refresh
        ? await bimApi.refreshExtraction(projectId, model.id)
        : await bimApi.extractData(projectId, model.id)
      setExtraction(data)
      setSelectedAreas(new Set(data.areas.map((a) => a.bimObjectId)))
      setSelectedEquipment(new Set(data.equipment.map((e) => e.bimObjectId)))
      setSelectedMaterials(new Set(data.materials.map((m) => m.bimObjectId)))
      setActiveStep(1)
    } catch {
      showError(t('bim.import.extractFailed'))
    } finally {
      setLoading(false)
    }
  }

  const toggleArea = (id: number) => {
    setSelectedAreas((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleEquipment = (id: number) => {
    setSelectedEquipment((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleMaterial = (id: number) => {
    setSelectedMaterials((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAllAreas = () => {
    if (!extraction) return
    setSelectedAreas((prev) =>
      prev.size === extraction.areas.length ? new Set() : new Set(extraction.areas.map((a) => a.bimObjectId)),
    )
  }

  const toggleAllEquipment = () => {
    if (!extraction) return
    setSelectedEquipment((prev) =>
      prev.size === extraction.equipment.length
        ? new Set()
        : new Set(extraction.equipment.map((e) => e.bimObjectId)),
    )
  }

  const toggleAllMaterials = () => {
    if (!extraction) return
    setSelectedMaterials((prev) =>
      prev.size === extraction.materials.length
        ? new Set()
        : new Set(extraction.materials.map((m) => m.bimObjectId)),
    )
  }

  const totalSelected = selectedAreas.size + selectedEquipment.size + selectedMaterials.size

  const handleImport = async () => {
    setImporting(true)
    const importResults: BimImportResult[] = []
    try {
      if (selectedAreas.size > 0) {
        const r = await bimApi.importAreas(projectId, model.id, [...selectedAreas])
        importResults.push(r)
      }
      if (selectedEquipment.size > 0) {
        const eqMappings = extraction?.equipment
          .filter((e) => selectedEquipment.has(e.bimObjectId) && e.matchedTemplateId)
          .map((e) => ({ bim_object_id: e.bimObjectId, template_id: e.matchedTemplateId }))
        const r = await bimApi.importEquipment(projectId, model.id, [...selectedEquipment], eqMappings)
        importResults.push(r)
      }
      if (selectedMaterials.size > 0) {
        const matMappings = extraction?.materials
          .filter((m) => selectedMaterials.has(m.bimObjectId) && m.matchedTemplateId)
          .map((m) => ({ bim_object_id: m.bimObjectId, template_id: m.matchedTemplateId }))
        const r = await bimApi.importMaterials(projectId, model.id, [...selectedMaterials], matMappings)
        importResults.push(r)
      }
      setResults(importResults)
      setActiveStep(2)
      const totalImported = importResults.reduce((sum, r) => sum + r.importedCount, 0)
      showSuccess(t('bim.import.importSuccess', { count: totalImported }))
    } catch {
      showError(t('bim.import.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('bim.import.title')}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{t(label)}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {t('bim.import.extractDescription', { filename: model.filename })}
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : (
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="contained" onClick={() => handleExtract(false)}>
                  {t('bim.import.extractButton')}
                </Button>
                {extraction && (
                  <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => handleExtract(true)}>
                    {t('bim.import.refresh')}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}

        {activeStep === 1 && extraction && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`${extraction.areas.length} ${t('bim.import.areas')}`} color="primary" variant="outlined" />
              <Chip
                label={`${extraction.equipment.length} ${t('bim.import.equipment')}`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`${extraction.materials.length} ${t('bim.import.materials')}`}
                color="info"
                variant="outlined"
              />
              <Button size="small" startIcon={<SyncIcon />} onClick={() => handleExtract(true)} disabled={loading}>
                {t('bim.import.refresh')}
              </Button>
            </Box>

            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
              <Tab label={`${t('bim.import.areas')} (${selectedAreas.size}/${extraction.areas.length})`} />
              <Tab label={`${t('bim.import.equipment')} (${selectedEquipment.size}/${extraction.equipment.length})`} />
              <Tab label={`${t('bim.import.materials')} (${selectedMaterials.size}/${extraction.materials.length})`} />
            </Tabs>

            {tabIndex === 0 && (
              <AreaTable
                items={extraction.areas}
                selected={selectedAreas}
                onToggle={toggleArea}
                onToggleAll={toggleAllAreas}
                t={t}
              />
            )}
            {tabIndex === 1 && (
              <EquipmentTable
                items={extraction.equipment}
                selected={selectedEquipment}
                onToggle={toggleEquipment}
                onToggleAll={toggleAllEquipment}
                t={t}
              />
            )}
            {tabIndex === 2 && (
              <MaterialTable
                items={extraction.materials}
                selected={selectedMaterials}
                onToggle={toggleMaterial}
                onToggleAll={toggleAllMaterials}
                t={t}
              />
            )}
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('bim.import.complete')}
            </Typography>
            {results.map((r) => (
              <Typography key={r.entityType} variant="body2" sx={{ mb: 0.5 }}>
                {t(`bim.import.${r.entityType}`)}: {r.importedCount} {t('bim.import.imported')}, {r.skippedCount}{' '}
                {t('bim.import.skipped')}
                {r.linkedCount > 0 && `, ${r.linkedCount} ${t('bim.import.linked')}`}
              </Typography>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {activeStep === 2 ? (
          <Button onClick={onClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            {activeStep === 1 && (
              <Button variant="contained" onClick={handleImport} disabled={importing || totalSelected === 0}>
                {importing ? (
                  <CircularProgress size={20} />
                ) : (
                  t('bim.import.importButton', { count: totalSelected })
                )}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

function AreaTable({
  items,
  selected,
  onToggle,
  onToggleAll,
  t,
}: {
  items: BimExtractedArea[]
  selected: Set<number>
  onToggle: (id: number) => void
  onToggleAll: () => void
  t: (key: string) => string
}) {
  if (items.length === 0) return <Typography color="text.secondary">{t('bim.import.noItems')}</Typography>
  return (
    <TableContainer sx={{ maxHeight: 350 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox checked={selected.size === items.length} indeterminate={selected.size > 0 && selected.size < items.length} onChange={onToggleAll} />
            </TableCell>
            <TableCell>{t('common.name')}</TableCell>
            <TableCell>{t('bim.import.type')}</TableCell>
            <TableCell>{t('bim.import.floor')}</TableCell>
            <TableCell>{t('bim.import.code')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.bimObjectId} hover onClick={() => onToggle(item.bimObjectId)} sx={{ cursor: 'pointer' }}>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.has(item.bimObjectId)} />
              </TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.areaType || '—'}</TableCell>
              <TableCell>{item.floorNumber ?? '—'}</TableCell>
              <TableCell>{item.areaCode || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function ConfidenceChip({ confidence, templateName, t }: { confidence: number; templateName?: string; t: (key: string) => string }) {
  if (!templateName || confidence < 0.3) return <Typography variant="caption" color="text.disabled">—</Typography>
  const color = confidence >= 0.8 ? 'success' : confidence >= 0.6 ? 'warning' : 'default'
  return (
    <Chip
      size="small"
      label={`${templateName} (${Math.round(confidence * 100)}%)`}
      color={color as 'success' | 'warning' | 'default'}
      variant={confidence >= 0.8 ? 'filled' : 'outlined'}
      sx={{ fontSize: '0.7rem', height: 24 }}
    />
  )
}

function EquipmentTable({
  items,
  selected,
  onToggle,
  onToggleAll,
  t,
}: {
  items: BimExtractedEquipment[]
  selected: Set<number>
  onToggle: (id: number) => void
  onToggleAll: () => void
  t: (key: string) => string
}) {
  if (items.length === 0) return <Typography color="text.secondary">{t('bim.import.noItems')}</Typography>
  return (
    <TableContainer sx={{ maxHeight: 350 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox checked={selected.size === items.length} indeterminate={selected.size > 0 && selected.size < items.length} onChange={onToggleAll} />
            </TableCell>
            <TableCell>{t('common.name')}</TableCell>
            <TableCell>{t('bim.import.type')}</TableCell>
            <TableCell>{t('bim.import.templateMatch')}</TableCell>
            <TableCell>{t('bim.import.manufacturer')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.bimObjectId} hover onClick={() => onToggle(item.bimObjectId)} sx={{ cursor: 'pointer' }}>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.has(item.bimObjectId)} />
              </TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.equipmentType || '—'}</TableCell>
              <TableCell>
                <ConfidenceChip confidence={item.confidence} templateName={item.matchedTemplateName} t={t} />
              </TableCell>
              <TableCell>{item.manufacturer || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function MaterialTable({
  items,
  selected,
  onToggle,
  onToggleAll,
  t,
}: {
  items: BimExtractedMaterial[]
  selected: Set<number>
  onToggle: (id: number) => void
  onToggleAll: () => void
  t: (key: string) => string
}) {
  if (items.length === 0) return <Typography color="text.secondary">{t('bim.import.noItems')}</Typography>
  return (
    <TableContainer sx={{ maxHeight: 350 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox checked={selected.size === items.length} indeterminate={selected.size > 0 && selected.size < items.length} onChange={onToggleAll} />
            </TableCell>
            <TableCell>{t('common.name')}</TableCell>
            <TableCell>{t('bim.import.type')}</TableCell>
            <TableCell>{t('bim.import.templateMatch')}</TableCell>
            <TableCell>{t('bim.import.manufacturer')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.bimObjectId} hover onClick={() => onToggle(item.bimObjectId)} sx={{ cursor: 'pointer' }}>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.has(item.bimObjectId)} />
              </TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.materialType || '—'}</TableCell>
              <TableCell>
                <ConfidenceChip confidence={item.confidence} templateName={item.matchedTemplateName} t={t} />
              </TableCell>
              <TableCell>{item.manufacturer || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
