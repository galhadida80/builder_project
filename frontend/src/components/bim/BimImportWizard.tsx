import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { bimApi } from '../../api/bim'
import { useToast } from '../common/ToastProvider'
import KeyValueEditor, { EQUIPMENT_SUGGESTIONS, MATERIAL_SUGGESTIONS } from '../ui/KeyValueEditor'
import type { KeyValuePair } from '../ui/KeyValueEditor'
import type {
  BimModel,
  BimExtractionResponse,
  BimExtractedArea,
  BimExtractedEquipment,
  BimExtractedMaterial,
  BimImportResult,
} from '../../types'
import {
  CheckCircleIcon,
  SyncIcon,
  ExpandMoreIcon,
  ExpandLessIcon,
  SwapHorizIcon,
  ArrowForwardIcon,
} from '@/icons'
import {
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useTheme,
  IconButton,
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
  const [selectedAreas, setSelectedAreas] = useState<Set<number>>(new Set())
  const [selectedEquipment, setSelectedEquipment] = useState<Set<number>>(new Set())
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<BimImportResult[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['areas', 'equipment', 'materials']))
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [itemProperties, setItemProperties] = useState<Record<string, KeyValuePair[]>>({})
  const [filter, setFilter] = useState<'all' | 'problems' | 'selected'>('all')

  useEffect(() => {
    if (open) {
      setActiveStep(0)
      setExtraction(null)
      setSelectedAreas(new Set())
      setSelectedEquipment(new Set())
      setSelectedMaterials(new Set())
      setResults([])
      setExpandedSections(new Set(['areas', 'equipment', 'materials']))
      setExpandedItem(null)
      setItemProperties({})
      setFilter('all')
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

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, items: { bimObjectId: number }[], current: Set<number>) => {
    setter(current.size === items.length ? new Set() : new Set(items.map((i) => i.bimObjectId)))
  }

  const totalSelected = selectedAreas.size + selectedEquipment.size + selectedMaterials.size

  const filterEquipment = (items: BimExtractedEquipment[]) => {
    if (filter === 'problems') return items.filter((i) => i.confidence < 0.6)
    if (filter === 'selected') return items.filter((i) => selectedEquipment.has(i.bimObjectId))
    return items
  }

  const filterMaterials = (items: BimExtractedMaterial[]) => {
    if (filter === 'problems') return items.filter((i) => i.confidence < 0.6)
    if (filter === 'selected') return items.filter((i) => selectedMaterials.has(i.bimObjectId))
    return items
  }

  const filterAreas = (items: BimExtractedArea[]) => {
    if (filter === 'selected') return items.filter((i) => selectedAreas.has(i.bimObjectId))
    return items
  }

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle sx={{ pb: 0 }}>{t('bim.import.title')}</DialogTitle>
      <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }} alternativeLabel>
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
            <SummaryBar extraction={extraction} selectedAreas={selectedAreas} selectedEquipment={selectedEquipment} selectedMaterials={selectedMaterials} t={t} />

            <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
              {(['all', 'problems', 'selected'] as const).map((f) => (
                <Chip
                  key={f}
                  label={t(`bim.import.filter.${f}`)}
                  size="small"
                  variant={filter === f ? 'filled' : 'outlined'}
                  color={filter === f ? 'primary' : 'default'}
                  onClick={() => setFilter(f)}
                  sx={{ fontWeight: 600, fontSize: 11, height: 28, borderRadius: '14px', flexShrink: 0 }}
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
              <SectionAccordion
                title={t('bim.import.areas')}
                color="#2196F3"
                count={extraction.areas.length}
                selectedCount={selectedAreas.size}
                expanded={expandedSections.has('areas')}
                onToggleExpand={() => toggleSection('areas')}
                onToggleAll={() => toggleAll(setSelectedAreas, extraction.areas, selectedAreas)}
                t={t}
              >
                {(() => {
                  const filtered = filterAreas(extraction.areas)
                  return filtered.length === 0 ? (
                    <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>{t('bim.import.noItems')}</Typography>
                  ) : (
                    filtered.map((item) => (
                      <AreaItemCard
                        key={item.bimObjectId}
                        item={item}
                        checked={selectedAreas.has(item.bimObjectId)}
                        onToggle={() => toggleSet(setSelectedAreas, item.bimObjectId)}
                        t={t}
                      />
                    ))
                  )
                })()}
              </SectionAccordion>

              <SectionAccordion
                title={t('bim.import.equipment')}
                color="#9C27B0"
                count={extraction.equipment.length}
                selectedCount={selectedEquipment.size}
                expanded={expandedSections.has('equipment')}
                onToggleExpand={() => toggleSection('equipment')}
                onToggleAll={() => toggleAll(setSelectedEquipment, extraction.equipment, selectedEquipment)}
                t={t}
              >
                {(() => {
                  const filtered = filterEquipment(extraction.equipment)
                  return filtered.length === 0 ? (
                    <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>{t('bim.import.noItems')}</Typography>
                  ) : (
                    filtered.map((item) => (
                      <TemplateItemCard
                        key={item.bimObjectId}
                        itemKey={`eq-${item.bimObjectId}`}
                        name={item.name}
                        type={item.equipmentType}
                        manufacturer={item.manufacturer}
                        confidence={item.confidence}
                        templateName={item.matchedTemplateName}
                        checked={selectedEquipment.has(item.bimObjectId)}
                        onToggle={() => toggleSet(setSelectedEquipment, item.bimObjectId)}
                        expanded={expandedItem === `eq-${item.bimObjectId}`}
                        onExpandToggle={() => setExpandedItem(expandedItem === `eq-${item.bimObjectId}` ? null : `eq-${item.bimObjectId}`)}
                        properties={itemProperties[`eq-${item.bimObjectId}`] || []}
                        onPropertiesChange={(props) => setItemProperties((prev) => ({ ...prev, [`eq-${item.bimObjectId}`]: props }))}
                        suggestions={EQUIPMENT_SUGGESTIONS}
                        specifications={item.specifications}
                        t={t}
                      />
                    ))
                  )
                })()}
              </SectionAccordion>

              <SectionAccordion
                title={t('bim.import.materials')}
                color="#FF9800"
                count={extraction.materials.length}
                selectedCount={selectedMaterials.size}
                expanded={expandedSections.has('materials')}
                onToggleExpand={() => toggleSection('materials')}
                onToggleAll={() => toggleAll(setSelectedMaterials, extraction.materials, selectedMaterials)}
                t={t}
              >
                {(() => {
                  const filtered = filterMaterials(extraction.materials)
                  return filtered.length === 0 ? (
                    <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>{t('bim.import.noItems')}</Typography>
                  ) : (
                    filtered.map((item) => (
                      <TemplateItemCard
                        key={item.bimObjectId}
                        itemKey={`mat-${item.bimObjectId}`}
                        name={item.name}
                        type={item.materialType}
                        manufacturer={item.manufacturer}
                        confidence={item.confidence}
                        templateName={item.matchedTemplateName}
                        checked={selectedMaterials.has(item.bimObjectId)}
                        onToggle={() => toggleSet(setSelectedMaterials, item.bimObjectId)}
                        expanded={expandedItem === `mat-${item.bimObjectId}`}
                        onExpandToggle={() => setExpandedItem(expandedItem === `mat-${item.bimObjectId}` ? null : `mat-${item.bimObjectId}`)}
                        properties={itemProperties[`mat-${item.bimObjectId}`] || []}
                        onPropertiesChange={(props) => setItemProperties((prev) => ({ ...prev, [`mat-${item.bimObjectId}`]: props }))}
                        suggestions={MATERIAL_SUGGESTIONS}
                        t={t}
                      />
                    ))
                  )
                })()}
              </SectionAccordion>
            </Box>

            <Button
              size="small"
              startIcon={<SyncIcon />}
              onClick={() => handleExtract(true)}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {t('bim.import.refresh')}
            </Button>
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('bim.import.complete')}
            </Typography>
            {results.map((r) => (
              <Box key={r.entityType} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Chip label={t(`bim.import.${r.entityType}`)} size="small" variant="outlined" />
                <Typography variant="body2">
                  {r.importedCount} {t('bim.import.imported')}, {r.skippedCount} {t('bim.import.skipped')}
                  {r.linkedCount > 0 && `, ${r.linkedCount} ${t('bim.import.linked')}`}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 1.5, sm: 3 }, pb: 2 }}>
        {activeStep === 2 ? (
          <Button variant="contained" onClick={onClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            {activeStep === 1 && (
              <Button variant="contained" onClick={handleImport} disabled={importing || totalSelected === 0}>
                {importing ? (
                  <CircularProgress size={20} />
                ) : (
                  <>
                    {t('bim.import.importButton', { count: totalSelected })}
                    <ArrowForwardIcon sx={{ fontSize: 18, ml: 0.5, transform: 'scaleX(-1)' }} />
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

function SummaryBar({
  extraction,
  selectedAreas,
  selectedEquipment,
  selectedMaterials,
  t,
}: {
  extraction: BimExtractionResponse
  selectedAreas: Set<number>
  selectedEquipment: Set<number>
  selectedMaterials: Set<number>
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const theme = useTheme()
  const total = extraction.areas.length + extraction.equipment.length + extraction.materials.length
  const selected = selectedAreas.size + selectedEquipment.size + selectedMaterials.size

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 3,
        bgcolor: alpha(theme.palette.primary.main, 0.06),
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.15),
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 120 }}>
        <Typography variant="body2" fontWeight={700}>
          {total} {t('bim.import.totalExtracted')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {selected} {t('bim.import.selectedForImport')}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        <Chip label={`${extraction.areas.length} ${t('bim.import.areas')}`} size="small" sx={{ bgcolor: alpha('#2196F3', 0.12), color: '#1565C0', fontWeight: 600, fontSize: 11, height: 26 }} />
        <Chip label={`${extraction.equipment.length} ${t('bim.import.equipment')}`} size="small" sx={{ bgcolor: alpha('#9C27B0', 0.12), color: '#7B1FA2', fontWeight: 600, fontSize: 11, height: 26 }} />
        <Chip label={`${extraction.materials.length} ${t('bim.import.materials')}`} size="small" sx={{ bgcolor: alpha('#FF9800', 0.12), color: '#E65100', fontWeight: 600, fontSize: 11, height: 26 }} />
      </Box>
    </Box>
  )
}

function SectionAccordion({
  title,
  color,
  count,
  selectedCount,
  expanded,
  onToggleExpand,
  onToggleAll,
  children,
  t,
}: {
  title: string
  color: string
  count: number
  selectedCount: number
  expanded: boolean
  onToggleExpand: () => void
  onToggleAll: () => void
  children: React.ReactNode
  t: (key: string) => string
}) {
  const theme = useTheme()
  return (
    <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
      <Box
        onClick={onToggleExpand}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1.25,
          cursor: 'pointer',
          borderInlineStart: `4px solid ${color}`,
          bgcolor: expanded ? alpha(color, 0.04) : 'transparent',
          transition: 'background-color 150ms',
          '&:hover': { bgcolor: alpha(color, 0.06) },
        }}
      >
        <Checkbox
          size="small"
          checked={count > 0 && selectedCount === count}
          indeterminate={selectedCount > 0 && selectedCount < count}
          onClick={(e) => e.stopPropagation()}
          onChange={onToggleAll}
          sx={{ p: 0.5, color, '&.Mui-checked': { color }, '&.MuiCheckbox-indeterminate': { color } }}
        />
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1, fontSize: 14 }}>
          {title}
        </Typography>
        <Chip
          label={`${selectedCount}/${count}`}
          size="small"
          sx={{
            height: 22,
            fontSize: 11,
            fontWeight: 700,
            bgcolor: selectedCount > 0 ? alpha(color, 0.15) : alpha(theme.palette.text.disabled, 0.1),
            color: selectedCount > 0 ? color : 'text.disabled',
          }}
        />
        {expanded ? <ExpandLessIcon sx={{ fontSize: 20, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 20, color: 'text.secondary' }} />}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1, pt: 0.5 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  )
}

function AreaItemCard({
  item,
  checked,
  onToggle,
  t,
}: {
  item: BimExtractedArea
  checked: boolean
  onToggle: () => void
  t: (key: string) => string
}) {
  const theme = useTheme()
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        cursor: 'pointer',
        bgcolor: checked ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
        border: '1px solid',
        borderColor: checked ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
        transition: 'all 150ms',
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
      }}
    >
      <Checkbox size="small" checked={checked} sx={{ p: 0.25 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>
          {item.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.25 }}>
          {item.areaType && <Chip label={item.areaType} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
          {item.floorNumber != null && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              {t('bim.import.floor')}: {item.floorNumber}
            </Typography>
          )}
          {item.areaCode && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              {item.areaCode}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

function ConfidenceBar({ confidence, templateName, t }: { confidence: number; templateName?: string; t: (key: string) => string }) {
  const theme = useTheme()
  if (!templateName || confidence < 0.3) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.text.disabled, 0.06) }}>
        <SwapHorizIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
          {t('bim.import.noMatch')}
        </Typography>
      </Box>
    )
  }

  const pct = Math.round(confidence * 100)
  const barColor = confidence >= 0.8 ? theme.palette.success.main : confidence >= 0.6 ? theme.palette.warning.main : theme.palette.grey[400]
  const bgColor = confidence >= 0.8 ? alpha(theme.palette.success.main, 0.08) : confidence >= 0.6 ? alpha(theme.palette.warning.main, 0.08) : alpha(theme.palette.grey[400], 0.08)

  return (
    <Box sx={{ borderRadius: 2, bgcolor: bgColor, px: 1.25, py: 0.75, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <SwapHorizIcon sx={{ fontSize: 14, color: barColor, flexShrink: 0 }} />
        <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, fontSize: 11, color: 'text.primary' }}>
          {templateName}
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, color: barColor, flexShrink: 0 }}>
          {pct}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: alpha(barColor, 0.15),
          '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 2 },
        }}
      />
    </Box>
  )
}

function TemplateItemCard({
  itemKey,
  name,
  type,
  manufacturer,
  confidence,
  templateName,
  checked,
  onToggle,
  expanded,
  onExpandToggle,
  properties,
  onPropertiesChange,
  suggestions,
  specifications,
  t,
}: {
  itemKey: string
  name: string
  type?: string
  manufacturer?: string
  confidence: number
  templateName?: string
  checked: boolean
  onToggle: () => void
  expanded: boolean
  onExpandToggle: () => void
  properties: KeyValuePair[]
  onPropertiesChange: (props: KeyValuePair[]) => void
  suggestions: typeof EQUIPMENT_SUGGESTIONS
  specifications?: Record<string, unknown>
  t: (key: string) => string
}) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: checked ? alpha(theme.palette.primary.main, 0.25) : 'divider',
        bgcolor: checked ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
        overflow: 'hidden',
        transition: 'all 150ms',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          px: 1.5,
          py: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
        }}
      >
        <Checkbox
          size="small"
          checked={checked}
          onClick={(e) => e.stopPropagation()}
          onChange={onToggle}
          sx={{ p: 0.25, mt: 0.25 }}
        />
        <Box onClick={onExpandToggle} sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13, flex: 1 }}>
              {name}
            </Typography>
            <IconButton size="small" sx={{ p: 0.25 }}>
              {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 0.75 }}>
            {type && <Chip label={type} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
            {manufacturer && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                {t('bim.import.manufacturer')}: {manufacturer}
              </Typography>
            )}
          </Box>
          <ConfidenceBar confidence={confidence} templateName={templateName} t={t} />
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
          {specifications && Object.keys(specifications).length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.75, display: 'block', fontSize: 11 }}>
                {t('bim.import.bimProperties')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(specifications).map(([k, v]) => (
                  <Chip
                    key={k}
                    label={`${k}: ${String(v)}`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: 10, bgcolor: alpha(theme.palette.info.main, 0.04) }}
                  />
                ))}
              </Box>
            </Box>
          )}
          <KeyValueEditor
            entries={properties}
            onChange={onPropertiesChange}
            label={t('bim.import.addProperties')}
            suggestions={suggestions}
          />
        </Box>
      </Collapse>
    </Box>
  )
}
