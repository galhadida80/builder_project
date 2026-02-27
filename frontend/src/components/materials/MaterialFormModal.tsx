import { useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { FormModal } from '../ui/Modal'
import { SegmentedTabs } from '../ui/Tabs'
import TemplatePicker from '../ui/TemplatePicker'
import KeyValueEditor, { type KeyValuePair, MATERIAL_SUGGESTIONS } from '../ui/KeyValueEditor'
import RecipientSelector from '../ui/RecipientSelector'
import type { Recipient } from '../ui/RecipientSelector'
import type { MaterialTemplate } from '../../api/materialTemplates'
import { VALIDATION, type ValidationError } from '../../utils/validation'
import { InventoryIcon, DescriptionIcon, CheckCircleIcon, CloudUploadIcon, PersonIcon, CalendarTodayIcon, EditNoteIcon, ContentCopyIcon } from '@/icons'
import { Box, Typography, Divider, MenuItem, TextField as MuiTextField, Chip, Checkbox, FormControlLabel, LinearProgress } from '@/mui'

const UNIT_KEYS = ['ton', 'm3', 'm2', 'm', 'kg', 'unit', 'box', 'pallet', 'roll'] as const

interface MaterialFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  saving: boolean
  editing: boolean
  projectId: string
  formData: { name: string; templateId: string; manufacturer: string; modelNumber: string; quantity: string; unit: string; expectedDelivery: string; storageLocation: string; notes: string; approvalDueDate: string }
  setFormData: (data: MaterialFormModalProps['formData']) => void
  errors: ValidationError
  templates: MaterialTemplate[]
  selectedTemplate: MaterialTemplate | null
  specificationValues: Record<string, string | number | boolean>
  setSpecificationValues: (v: Record<string, string | number | boolean>) => void
  documentFiles: Record<string, File | null>
  setDocumentFiles: (v: Record<string, File | null>) => void
  checklistResponses: Record<string, boolean>
  setChecklistResponses: (v: Record<string, boolean>) => void
  customFields: KeyValuePair[]
  setCustomFields: (v: KeyValuePair[]) => void
  approvers: Recipient[]
  setApprovers: (v: Recipient[]) => void
  distributionList: Recipient[]
  setDistributionList: (v: Recipient[]) => void
  isClosed: boolean
  setIsClosed: (v: boolean) => void
  formRef?: RefObject<HTMLElement | null>
}

export default function MaterialFormModal({
  open, onClose, onSubmit, saving, editing, projectId,
  formData, setFormData, errors, templates, selectedTemplate,
  specificationValues, setSpecificationValues,
  documentFiles, setDocumentFiles,
  checklistResponses, setChecklistResponses,
  customFields, setCustomFields,
  approvers, setApprovers,
  distributionList, setDistributionList,
  isClosed, setIsClosed,
  formRef,
}: MaterialFormModalProps) {
  const { t } = useTranslation()
  const [formMode, setFormMode] = useState<'scratch' | 'template'>(selectedTemplate ? 'template' : 'scratch')

  // Progress calculation
  const commonFieldCount = [formData.name, formData.manufacturer, formData.modelNumber, formData.quantity, formData.unit].filter(Boolean).length
  const specFieldCount = formMode === 'template' && selectedTemplate?.required_specifications
    ? selectedTemplate.required_specifications.filter(s => specificationValues[s.name] !== undefined && specificationValues[s.name] !== '').length : 0
  const specTotal = formMode === 'template' && selectedTemplate?.required_specifications ? selectedTemplate.required_specifications.length : 0
  const customFilledCount = customFields.filter(f => f.value !== '' && f.value !== 0 && f.value !== false).length
  const totalFields = 5 + specTotal + customFields.length
  const filledFields = commonFieldCount + specFieldCount + customFilledCount
  const progress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0

  const today = new Date()
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + 2)
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + 365)
  const minDateStr = minDate.toISOString().split('T')[0]
  const maxDateStr = maxDate.toISOString().split('T')[0]

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title={editing ? t('materials.editMaterialTitle') : t('materials.addNewMaterial')}
      submitLabel={editing ? t('common.saveChanges') : t('materials.addMaterial')}
      loading={saving}
      maxWidth="md"
    >
      <Box ref={formRef} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {/* Mode tabs: From Scratch / From Template */}
        <SegmentedTabs
          items={[
            { label: t('common.fromScratch'), value: 'scratch', icon: <EditNoteIcon sx={{ fontSize: 18 }} /> },
            { label: t('common.fromTemplate'), value: 'template', icon: <ContentCopyIcon sx={{ fontSize: 18 }} /> },
          ]}
          value={formMode}
          onChange={(value) => {
            setFormMode(value as 'scratch' | 'template')
            if (value === 'scratch' && selectedTemplate) {
              setFormData({ ...formData, templateId: '' })
              setSpecificationValues({})
              setDocumentFiles({})
              setChecklistResponses({})
            }
          }}
        />

        {/* Progress bar */}
        {(filledFields > 0) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: progress === 100 ? 'linear-gradient(90deg, #4CAF50, #66BB6A)' : 'linear-gradient(90deg, #c4854c, #daa66c)',
                },
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: progress === 100 ? 'success.main' : 'primary.main', minWidth: 32 }}>
              {progress}%
            </Typography>
          </Box>
        )}

        {/* Template picker (only in template mode) */}
        {formMode === 'template' && (
          <TemplatePicker
            templates={templates}
            value={selectedTemplate}
            onChange={(template) => {
              setFormData({ ...formData, templateId: template?.id || '' })
              setSpecificationValues({})
              setDocumentFiles({})
              setChecklistResponses({})
            }}
            label={t('materials.useTemplate')}
            placeholder={t('materials.selectTemplate')}
          />
        )}

        <Divider />

        {/* Common fields — always visible */}
        <TextField fullWidth label={t('materials.materialName')} required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={!!errors.name || formData.name.length > VALIDATION.MAX_NAME_LENGTH} helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)} inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }} />
        <TextField fullWidth label={t('materials.manufacturer')} value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
        <TextField fullWidth label={t('materials.model')} value={formData.modelNumber} onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })} />

        {/* Quantity & logistics */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField fullWidth label={t('materials.quantity')} type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} error={!!errors.quantity} helperText={errors.quantity} inputProps={{ min: 0 }} />
          <MuiTextField fullWidth select label={t('materials.unit')} value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
            <MenuItem value="">{t('materials.selectUnit')}</MenuItem>
            {UNIT_KEYS.map(unit => <MenuItem key={unit} value={unit}>{t(`materials.units.${unit}`)}</MenuItem>)}
            <MenuItem value="other">{t('common.other')}</MenuItem>
          </MuiTextField>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField fullWidth label={t('materials.deliveryDate')} type="date" InputLabelProps={{ shrink: true }} value={formData.expectedDelivery} onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })} />
          <TextField fullWidth label={t('materials.storageLocation')} value={formData.storageLocation} onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })} />
        </Box>
        <TextField fullWidth label={t('common.notes')} multiline rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} error={!!errors.notes || formData.notes.length > VALIDATION.MAX_NOTES_LENGTH} helperText={errors.notes || (formData.notes.length > 0 ? `${formData.notes.length}/${VALIDATION.MAX_NOTES_LENGTH}` : undefined)} />

        {/* Template specifications */}
        {formMode === 'template' && selectedTemplate && selectedTemplate.required_specifications?.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryIcon fontSize="small" color="primary" />{t('materials.specifications')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              {selectedTemplate.required_specifications.map((spec) => (
                <Box key={spec.name}>
                  {spec.field_type === 'boolean' ? (
                    <FormControlLabel control={<Checkbox checked={!!specificationValues[spec.name]} onChange={(e) => setSpecificationValues({ ...specificationValues, [spec.name]: e.target.checked })} />} label={<Typography variant="body2">{spec.name_he}{spec.required && <span style={{ color: 'red' }}> *</span>}</Typography>} />
                  ) : spec.field_type === 'select' ? (
                    <MuiTextField fullWidth select size="small" label={spec.name_he} required={spec.required} value={specificationValues[spec.name] || ''} onChange={(e) => setSpecificationValues({ ...specificationValues, [spec.name]: e.target.value })}>
                      <MenuItem value="">{t('common.select')}</MenuItem>
                      {spec.options?.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                    </MuiTextField>
                  ) : (
                    <TextField fullWidth size="small" type={spec.field_type === 'number' ? 'number' : 'text'} label={`${spec.name_he}${spec.unit ? ` (${spec.unit})` : ''}`} required={spec.required} value={specificationValues[spec.name] || ''} onChange={(e) => setSpecificationValues({ ...specificationValues, [spec.name]: e.target.value })} />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Template documents */}
        {formMode === 'template' && selectedTemplate && selectedTemplate.required_documents?.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon fontSize="small" color="primary" />{t('materials.requiredDocuments')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              {selectedTemplate.required_documents.map((doc) => (
                <Box key={doc.name} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>{doc.name_he}{doc.required && <Chip label={t('common.required')} size="small" color="error" sx={{ ml: 1, height: 20 }} />}</Typography>
                    {doc.description && <Typography variant="caption" color="text.secondary">{doc.description}</Typography>}
                    <Typography variant="caption" display="block" color="text.secondary"><PersonIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />{t(`materials.source.${doc.source}`)}</Typography>
                  </Box>
                  <Box>
                    {documentFiles[doc.name] ? (
                      <Chip icon={<CheckCircleIcon />} label={documentFiles[doc.name]?.name} color="success" size="small" onDelete={() => setDocumentFiles({ ...documentFiles, [doc.name]: null })} />
                    ) : (
                      <Button variant="secondary" size="small" icon={<CloudUploadIcon />} onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) setDocumentFiles({ ...documentFiles, [doc.name]: file }) }; input.click() }}>{t('common.upload')}</Button>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Template checklist */}
        {formMode === 'template' && selectedTemplate && selectedTemplate.submission_checklist?.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon fontSize="small" color="primary" />{t('materials.checklist')}
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              {selectedTemplate.submission_checklist.map((item) => (
                <FormControlLabel key={item.name} sx={{ display: 'flex', mb: 1 }} control={<Checkbox checked={!!checklistResponses[item.name]} onChange={(e) => setChecklistResponses({ ...checklistResponses, [item.name]: e.target.checked })} />} label={<Box><Typography variant="body2">{item.name_he}</Typography>{item.requires_file && <Typography variant="caption" color="text.secondary">({t('materials.requiresFile')})</Typography>}</Box>} />
              ))}
            </Box>
          </Box>
        )}

        <Divider />

        {/* Custom properties — always available */}
        <KeyValueEditor entries={customFields} onChange={setCustomFields} suggestions={MATERIAL_SUGGESTIONS} />

        <Divider />

        {/* Approval settings */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarTodayIcon fontSize="small" color="primary" />
          {t('materials.approvalSettings')}
        </Typography>
        <TextField fullWidth label={t('materials.approvalDueDate')} type="date" InputLabelProps={{ shrink: true }} value={formData.approvalDueDate} onChange={(e) => setFormData({ ...formData, approvalDueDate: e.target.value })} inputProps={{ min: minDateStr, max: maxDateStr }} />
        <RecipientSelector projectId={projectId} label={t('materials.approvers')} value={approvers} onChange={setApprovers} filterTypes={['consultant', 'inspector', 'supervisor']} placeholder={t('materials.selectApprovers')} multiple />
        <RecipientSelector projectId={projectId} label={t('materials.distributionList')} value={distributionList} onChange={setDistributionList} placeholder={t('materials.selectDistribution')} multiple />

        <Divider />
        <FormControlLabel control={<Checkbox checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} />} label={<Typography variant="body2">{t('materials.markAsClosed')}</Typography>} />
      </Box>
    </FormModal>
  )
}
