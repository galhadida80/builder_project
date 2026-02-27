import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { FormModal } from '../ui/Modal'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import type { DefectCreateData, DefectAnalysisItem } from '../../api/defects'
import type { Contact, ConstructionArea } from '../../types'
import type { ValidationError } from '../../utils/validation'
import { CameraAltIcon, CloseIcon, AutoAwesomeIcon, CheckCircleIcon } from '@/icons'
import {
  Box, Typography, MenuItem, IconButton, LinearProgress, CircularProgress,
  TextField as MuiTextField, Autocomplete, Paper,
} from '@/mui'

const MAX_PHOTOS = 5

const CATEGORY_OPTIONS = [
  'concrete_structure', 'structural', 'wet_room_waterproofing', 'plaster',
  'roof', 'roof_waterproofing', 'painting', 'plumbing', 'flooring',
  'tiling', 'fire_passage_sealing', 'fire_safety', 'building_general',
  'moisture', 'waterproofing', 'insulation', 'hvac', 'electrical',
  'lighting', 'solar_system', 'windows_doors', 'drainage', 'elevator',
  'gas', 'accessibility', 'exterior_cladding', 'landscaping', 'other',
]

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical']

interface DefectFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
  uploadProgress: number
  form: DefectCreateData
  setForm: (data: DefectCreateData) => void
  formErrors: ValidationError
  validateField: (field: string) => void
  contacts: Contact[]
  areas: ConstructionArea[]
  pendingPhotos: File[]
  photoPreviews: string[]
  addPhotos: (files: File[]) => void
  removePhoto: (index: number) => void
  analyzing: boolean
  onAnalyze: () => void
  analysisResults: DefectAnalysisItem[]
  setAnalysisResults: (items: DefectAnalysisItem[]) => void
  selectedDefects: boolean[]
  setSelectedDefects: (sel: boolean[]) => void
  selectedCount: number
  isMultiDefect: boolean
}

export default function DefectFormModal({
  open, onClose, onSubmit, submitting, uploadProgress,
  form, setForm, formErrors, validateField,
  contacts, areas,
  pendingPhotos, photoPreviews, addPhotos, removePhoto,
  analyzing, onAnalyze,
  analysisResults, setAnalysisResults,
  selectedDefects, setSelectedDefects,
  selectedCount, isMultiDefect,
}: DefectFormModalProps) {
  const { t } = useTranslation()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: MAX_PHOTOS,
    maxSize: 5 * 1024 * 1024,
    onDrop: addPhotos,
    noClick: pendingPhotos.length >= MAX_PHOTOS,
    noDrag: pendingPhotos.length >= MAX_PHOTOS,
  })

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title={t('defects.reportDefect')}
      submitLabel={isMultiDefect ? t('defects.createMultiple', { count: selectedCount }) : t('defects.create')}
      submitDisabled={isMultiDefect ? selectedCount === 0 : (!form.description || !form.category || !form.severity)}
      loading={submitting}
      maxWidth="md"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {!isMultiDefect && (
          <>
            <TextField
              fullWidth label={t('defects.description')} multiline rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              onBlur={() => validateField('description')}
              error={!!formErrors.description} helperText={formErrors.description} required
            />
            <MuiTextField select fullWidth label={t('defects.category')} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              error={!!formErrors.category} helperText={formErrors.category} required
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <MenuItem key={cat} value={cat}>{t(`defects.categories.${cat}`, { defaultValue: cat })}</MenuItem>
              ))}
            </MuiTextField>
            {form.category === 'other' && (
              <TextField fullWidth label={t('common.customType')}
                value={(form as any).custom_category || ''}
                onChange={(e) => setForm({ ...form, custom_category: e.target.value } as any)}
              />
            )}
            <MuiTextField select fullWidth label={t('defects.severity')} value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              error={!!formErrors.severity} helperText={formErrors.severity} required
            >
              {SEVERITY_OPTIONS.map((sev) => (
                <MenuItem key={sev} value={sev}>{t(`defects.severities.${sev}`, { defaultValue: sev })}</MenuItem>
              ))}
            </MuiTextField>
          </>
        )}

        {areas.length > 0 && (
          <Autocomplete
            options={areas}
            getOptionLabel={(opt) => `${opt.name}${opt.floorNumber != null ? ` (${t('defects.floor')} ${opt.floorNumber})` : ''}`}
            value={areas.find(a => a.id === form.area_id) || null}
            onChange={(_, val) => setForm({ ...form, area_id: val?.id })}
            renderInput={(params) => <MuiTextField {...params} label={t('defects.location')} />}
          />
        )}

        {contacts.length > 0 && (
          <>
            <Autocomplete options={contacts}
              getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
              value={contacts.find(c => c.id === form.assigned_contact_id) || null}
              onChange={(_, val) => setForm({ ...form, assigned_contact_id: val?.id })}
              renderInput={(params) => <MuiTextField {...params} label={t('defects.primaryAssignee')} />}
            />
            <Autocomplete multiple options={contacts}
              getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
              value={contacts.filter(c => form.assignee_ids?.includes(c.id))}
              onChange={(_, val) => setForm({ ...form, assignee_ids: val.map(v => v.id) })}
              renderInput={(params) => <MuiTextField {...params} label={t('defects.additionalAssignees')} />}
            />
            <Autocomplete options={contacts}
              getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
              value={contacts.find(c => c.id === form.reporter_id) || null}
              onChange={(_, val) => setForm({ ...form, reporter_id: val?.id })}
              renderInput={(params) => <MuiTextField {...params} label={t('defects.reporter')} />}
            />
            <Autocomplete options={contacts}
              getOptionLabel={(opt) => `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`}
              value={contacts.find(c => c.id === form.followup_contact_id) || null}
              onChange={(_, val) => setForm({ ...form, followup_contact_id: val?.id })}
              renderInput={(params) => <MuiTextField {...params} label={t('defects.followupPerson')} />}
            />
          </>
        )}

        <TextField fullWidth label={t('defects.dueDate')} type="date" InputLabelProps={{ shrink: true }}
          value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value || undefined })}
        />

        <Box>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            {t('defects.attachPhotos')} ({pendingPhotos.length}/{MAX_PHOTOS})
          </Typography>
          <Box {...getRootProps()} sx={{
            border: '2px dashed', borderColor: isDragActive ? 'primary.main' : 'divider', borderRadius: 2,
            p: 2, textAlign: 'center', cursor: pendingPhotos.length >= MAX_PHOTOS ? 'default' : 'pointer',
            bgcolor: isDragActive ? 'action.hover' : 'transparent', transition: 'all 200ms ease',
            '&:hover': pendingPhotos.length < MAX_PHOTOS ? { borderColor: 'primary.light', bgcolor: 'action.hover' } : {},
          }}>
            <input {...getInputProps()} capture="environment" />
            <CameraAltIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {isDragActive ? t('defects.dropHere') : t('defects.dragOrTap')}
            </Typography>
            {pendingPhotos.length >= MAX_PHOTOS && (
              <Typography variant="caption" color="text.disabled">{t('defects.maxPhotos', { max: MAX_PHOTOS })}</Typography>
            )}
          </Box>
          {pendingPhotos.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              {photoPreviews.map((url, idx) => (
                <Box key={idx} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Box component="img" src={url} alt={pendingPhotos[idx]?.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton size="small" aria-label={t('common.removeItem')} onClick={(e) => { e.stopPropagation(); removePhoto(idx) }}
                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', p: 0.3, '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          {pendingPhotos.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Button variant="secondary" size="small"
                icon={analyzing ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                onClick={onAnalyze} disabled={analyzing}
              >
                {analyzing ? t('defects.analyzing') : t('defects.analyzeImage')}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{t('defects.analyzeHint')}</Typography>
            </Box>
          )}
          {submitting && uploadProgress > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{t('defects.uploadingPhotos')}</Typography>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.5, borderRadius: 1 }} />
            </Box>
          )}
        </Box>

        {isMultiDefect && (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              {t('defects.detectedDefects', { count: analysisResults.length })}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              {t('defects.reviewDefectsHint')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {analysisResults.map((item, idx) => {
                const isApproved = selectedDefects[idx]
                const isRejected = selectedDefects[idx] === false
                const confidencePercent = Math.round((item.confidence || 0) * 100)
                const confidenceColor = confidencePercent >= 90 ? 'success.main' : confidencePercent >= 75 ? 'warning.main' : 'error.main'

                return (
                  <Paper key={idx} variant="outlined" sx={{
                    p: 2, position: 'relative', overflow: 'hidden',
                    borderColor: isApproved ? 'success.main' : isRejected ? 'error.light' : 'divider',
                    borderWidth: isApproved ? 2 : 1,
                    opacity: isRejected ? 0.4 : 1,
                    transition: 'all 200ms ease',
                  }}>
                    {/* Header: title + confidence + approve/reject */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {t('defects.defectIndex', { index: idx + 1 })}
                        </Typography>
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center', gap: 0.5,
                          px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.hover',
                        }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: confidenceColor }} />
                          <Typography variant="caption" fontWeight={600} sx={{ color: confidenceColor }}>
                            {confidencePercent}%
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => { const next = [...selectedDefects]; next[idx] = true; setSelectedDefects(next) }}
                          sx={{
                            bgcolor: isApproved ? 'success.main' : 'action.hover',
                            color: isApproved ? 'white' : 'success.main',
                            '&:hover': { bgcolor: isApproved ? 'success.dark' : 'success.light', color: 'white' },
                            width: 32, height: 32,
                          }}
                        >
                          <CheckCircleIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => { const next = [...selectedDefects]; next[idx] = false; setSelectedDefects(next) }}
                          sx={{
                            bgcolor: isRejected ? 'error.main' : 'action.hover',
                            color: isRejected ? 'white' : 'error.main',
                            '&:hover': { bgcolor: isRejected ? 'error.dark' : 'error.light', color: 'white' },
                            width: 32, height: 32,
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Editable fields */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <MuiTextField select fullWidth size="small" label={t('defects.category')} value={item.category}
                        onChange={(e) => { const next = [...analysisResults]; next[idx] = { ...next[idx], category: e.target.value }; setAnalysisResults(next) }}
                      >
                        {CATEGORY_OPTIONS.map((cat) => <MenuItem key={cat} value={cat}>{t(`defects.categories.${cat}`, { defaultValue: cat })}</MenuItem>)}
                      </MuiTextField>
                      <MuiTextField select fullWidth size="small" label={t('defects.severity')} value={item.severity}
                        onChange={(e) => { const next = [...analysisResults]; next[idx] = { ...next[idx], severity: e.target.value }; setAnalysisResults(next) }}
                      >
                        {SEVERITY_OPTIONS.map((sev) => <MenuItem key={sev} value={sev}>{t(`defects.severities.${sev}`, { defaultValue: sev })}</MenuItem>)}
                      </MuiTextField>
                      <MuiTextField fullWidth multiline rows={2} size="small" label={t('defects.description')} value={item.description}
                        onChange={(e) => { const next = [...analysisResults]; next[idx] = { ...next[idx], description: e.target.value }; setAnalysisResults(next) }}
                      />
                    </Box>
                  </Paper>
                )
              })}
            </Box>
          </Box>
        )}
      </Box>
    </FormModal>
  )
}
