import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Stepper, Step, StepLabel, Typography, Tabs, Tab, Checkbox,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, Alert,
} from '@/mui'
import { CheckCircleIcon } from '@/icons'
import { blueprintsApi, BlueprintExtractionDetail, BlueprintImportResult } from '../../api/blueprints'

interface BlueprintImportWizardProps {
  open: boolean
  onClose: () => void
  projectId: string
  extraction: BlueprintExtractionDetail
}

const steps = ['import.stepSummary', 'import.stepReview', 'import.stepImport']

export default function BlueprintImportWizard({ open, onClose, projectId, extraction }: BlueprintImportWizardProps) {
  const { t } = useTranslation()
  const [activeStep, setActiveStep] = useState(0)
  const [tabIndex, setTabIndex] = useState(0)
  const [selectedFloors, setSelectedFloors] = useState<Set<number>>(new Set())
  const [selectedAreas, setSelectedAreas] = useState<Set<number>>(new Set())
  const [selectedEquipment, setSelectedEquipment] = useState<Set<number>>(new Set())
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<BlueprintImportResult[]>([])
  const [error, setError] = useState('')

  const isPdf = extraction.extractionSource === 'pdf_quantity'
  const data = extraction.extractedData || {}
  const floors = data.floors || []
  const areas = data.areas || []
  const equipment = data.equipment || []
  const materials = data.materials || []

  const totalSelected = isPdf
    ? selectedFloors.size
    : selectedAreas.size + selectedEquipment.size + selectedMaterials.size

  const toggleFloor = (idx: number) => {
    setSelectedFloors(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const toggleAllFloors = () => {
    if (selectedFloors.size === floors.length) {
      setSelectedFloors(new Set())
    } else {
      setSelectedFloors(new Set(floors.map((_, i) => i)))
    }
  }

  const toggleBimItem = (set: Set<number>, setFn: (s: Set<number>) => void, id: number) => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setFn(next)
  }

  const toggleAllBim = (items: Array<{ bimObjectId: number }>, set: Set<number>, setFn: (s: Set<number>) => void) => {
    if (set.size === items.length) {
      setFn(new Set())
    } else {
      setFn(new Set(items.map(i => i.bimObjectId)))
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setError('')
    const importResults: BlueprintImportResult[] = []

    try {
      if (isPdf && selectedFloors.size > 0) {
        const result = await blueprintsApi.importAreas(
          projectId, extraction.id, [], Array.from(selectedFloors),
        )
        importResults.push(result)
      }
      if (!isPdf && selectedAreas.size > 0) {
        const result = await blueprintsApi.importAreas(
          projectId, extraction.id, Array.from(selectedAreas),
        )
        importResults.push(result)
      }
      if (selectedEquipment.size > 0) {
        const result = await blueprintsApi.importEquipment(
          projectId, extraction.id, Array.from(selectedEquipment),
        )
        importResults.push(result)
      }
      if (selectedMaterials.size > 0) {
        const result = await blueprintsApi.importMaterials(
          projectId, extraction.id, Array.from(selectedMaterials),
        )
        importResults.push(result)
      }
      setResults(importResults)
      setActiveStep(2)
    } catch {
      setError(t('blueprints.import.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  const renderSummary = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body1">
        <strong>{extraction.filename}</strong>
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {extraction.summary && Object.entries(extraction.summary).map(([key, val]) => (
          <Box key={key} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h6">{val as number}</Typography>
            <Typography variant="caption" color="text.secondary">{key.replace(/_/g, ' ')}</Typography>
          </Box>
        ))}
      </Box>
      {extraction.tierUsed && (
        <Chip label={extraction.tierUsed} size="small" variant="outlined" />
      )}
      {extraction.processingTimeMs && (
        <Typography variant="caption" color="text.secondary">
          {t('blueprints.processingTime')}: {(extraction.processingTimeMs / 1000).toFixed(1)} {t('blueprints.seconds')}
        </Typography>
      )}
    </Box>
  )

  const renderPdfReview = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">{t('blueprints.import.floors')}</Typography>
        <Button size="small" onClick={toggleAllFloors}>
          {t('blueprints.import.selectAll')}
        </Button>
      </Box>
      <TableContainer sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedFloors.size === floors.length && floors.length > 0}
                  indeterminate={selectedFloors.size > 0 && selectedFloors.size < floors.length}
                  onChange={toggleAllFloors}
                />
              </TableCell>
              <TableCell>{t('blueprints.import.name')}</TableCell>
              <TableCell>{t('blueprints.import.rooms')}</TableCell>
              <TableCell>{t('quantityExtraction.totalArea')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {floors.map((floor, idx) => (
              <TableRow key={idx} hover onClick={() => toggleFloor(idx)} sx={{ cursor: 'pointer' }}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedFloors.has(idx)} />
                </TableCell>
                <TableCell>{floor.floorName || `Floor ${floor.floorNumber}`}</TableCell>
                <TableCell>{floor.rooms?.length || 0}</TableCell>
                <TableCell>{floor.totalAreaSqm ? `${floor.totalAreaSqm} m²` : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )

  const renderBimReview = () => (
    <Box>
      <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
        <Tab label={`${t('blueprints.import.areas')} (${areas.length})`} />
        <Tab label={`${t('blueprints.import.equipment')} (${equipment.length})`} />
        <Tab label={`${t('blueprints.import.materials')} (${materials.length})`} />
      </Tabs>

      {tabIndex === 0 && (
        <TableContainer sx={{ maxHeight: 350 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedAreas.size === areas.length && areas.length > 0}
                    indeterminate={selectedAreas.size > 0 && selectedAreas.size < areas.length}
                    onChange={() => toggleAllBim(areas, selectedAreas, setSelectedAreas)}
                  />
                </TableCell>
                <TableCell>{t('blueprints.import.name')}</TableCell>
                <TableCell>{t('blueprints.import.type')}</TableCell>
                <TableCell>{t('blueprints.import.floor')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {areas.length === 0 ? (
                <TableRow><TableCell colSpan={4}><Typography color="text.secondary">{t('blueprints.import.noItems')}</Typography></TableCell></TableRow>
              ) : areas.map(a => (
                <TableRow key={a.bimObjectId} hover onClick={() => toggleBimItem(selectedAreas, setSelectedAreas, a.bimObjectId)} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox"><Checkbox checked={selectedAreas.has(a.bimObjectId)} /></TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.areaType || '-'}</TableCell>
                  <TableCell>{a.floorNumber ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabIndex === 1 && (
        <TableContainer sx={{ maxHeight: 350 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedEquipment.size === equipment.length && equipment.length > 0}
                    indeterminate={selectedEquipment.size > 0 && selectedEquipment.size < equipment.length}
                    onChange={() => toggleAllBim(equipment, selectedEquipment, setSelectedEquipment)}
                  />
                </TableCell>
                <TableCell>{t('blueprints.import.name')}</TableCell>
                <TableCell>{t('blueprints.import.type')}</TableCell>
                <TableCell>{t('blueprints.import.manufacturer')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipment.length === 0 ? (
                <TableRow><TableCell colSpan={4}><Typography color="text.secondary">{t('blueprints.import.noItems')}</Typography></TableCell></TableRow>
              ) : equipment.map(e => (
                <TableRow key={e.bimObjectId} hover onClick={() => toggleBimItem(selectedEquipment, setSelectedEquipment, e.bimObjectId)} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox"><Checkbox checked={selectedEquipment.has(e.bimObjectId)} /></TableCell>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>{e.equipmentType || '-'}</TableCell>
                  <TableCell>{e.manufacturer || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabIndex === 2 && (
        <TableContainer sx={{ maxHeight: 350 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedMaterials.size === materials.length && materials.length > 0}
                    indeterminate={selectedMaterials.size > 0 && selectedMaterials.size < materials.length}
                    onChange={() => toggleAllBim(materials, selectedMaterials, setSelectedMaterials)}
                  />
                </TableCell>
                <TableCell>{t('blueprints.import.name')}</TableCell>
                <TableCell>{t('blueprints.import.type')}</TableCell>
                <TableCell>{t('blueprints.import.manufacturer')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materials.length === 0 ? (
                <TableRow><TableCell colSpan={4}><Typography color="text.secondary">{t('blueprints.import.noItems')}</Typography></TableCell></TableRow>
              ) : materials.map(m => (
                <TableRow key={m.bimObjectId} hover onClick={() => toggleBimItem(selectedMaterials, setSelectedMaterials, m.bimObjectId)} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox"><Checkbox checked={selectedMaterials.has(m.bimObjectId)} /></TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.materialType || '-'}</TableCell>
                  <TableCell>{m.manufacturer || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )

  const renderResults = () => (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>{t('blueprints.import.complete')}</Typography>
      {results.map((r, i) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1 }}>
          <Chip label={r.entityType} size="small" variant="outlined" />
          <Typography variant="body2" color="success.main">
            {t('blueprints.import.imported')}: {r.importedCount}
          </Typography>
          {r.skippedCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('blueprints.import.skipped')}: {r.skippedCount}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('blueprints.import.title')}
        <Stepper activeStep={activeStep} sx={{ mt: 2 }}>
          {steps.map(label => (
            <Step key={label}><StepLabel>{t(`blueprints.${label}`)}</StepLabel></Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 300 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {activeStep === 0 && renderSummary()}
        {activeStep === 1 && (isPdf ? renderPdfReview() : renderBimReview())}
        {activeStep === 2 && renderResults()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {activeStep === 2 ? t('common.close') : t('common.cancel')}
        </Button>
        {activeStep === 0 && (
          <Button variant="contained" onClick={() => setActiveStep(1)}>
            {t('common.next')}
          </Button>
        )}
        {activeStep === 1 && (
          <>
            <Button onClick={() => setActiveStep(0)}>{t('common.back')}</Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={totalSelected === 0 || importing}
              startIcon={importing ? <CircularProgress size={16} /> : undefined}
            >
              {importing ? t('blueprints.processing') : t('blueprints.import.importButton', { count: totalSelected })}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
