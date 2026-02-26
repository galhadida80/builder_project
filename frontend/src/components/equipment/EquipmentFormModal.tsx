import { useState, useEffect, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useSignatureStamp } from '../../hooks/useSignatureStamp'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { FormModal } from '../ui/Modal'
import TemplatePicker from '../ui/TemplatePicker'
import KeyValueEditor, { type KeyValuePair, EQUIPMENT_SUGGESTIONS } from '../ui/KeyValueEditor'
import RecipientSelector from '../ui/RecipientSelector'
import type { Recipient } from '../ui/RecipientSelector'
import SignaturePad from '../ui/SignaturePad'
import type { EquipmentTemplate } from '../../api/equipmentTemplates'
import { VALIDATION, type ValidationError } from '../../utils/validation'
import { BuildIcon, DescriptionIcon, CheckCircleIcon, CloudUploadIcon, PersonIcon, ExpandMoreIcon, ExpandLessIcon, CalendarTodayIcon, DrawIcon } from '@/icons'
import { Box, Typography, Divider, MenuItem, TextField as MuiTextField, Chip, Checkbox, FormControlLabel, Alert, Collapse } from '@/mui'

interface EquipmentFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  saving: boolean
  editing: boolean
  projectId: string
  formData: { name: string; templateId: string; manufacturer: string; modelNumber: string; notes: string; approvalDueDate: string }
  setFormData: (data: EquipmentFormModalProps['formData']) => void
  errors: ValidationError
  templates: EquipmentTemplate[]
  selectedTemplate: EquipmentTemplate | null
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
  contractorSignature: string | null
  setContractorSignature: (v: string | null) => void
  supervisorSignature: string | null
  setSupervisorSignature: (v: string | null) => void
  isClosed: boolean
  setIsClosed: (v: boolean) => void
  formRef?: RefObject<HTMLElement | null>
}

export default function EquipmentFormModal({
  open, onClose, onSubmit, saving, editing, projectId,
  formData, setFormData, errors, templates, selectedTemplate,
  specificationValues, setSpecificationValues,
  documentFiles, setDocumentFiles,
  checklistResponses, setChecklistResponses,
  customFields, setCustomFields,
  approvers, setApprovers,
  distributionList, setDistributionList,
  contractorSignature, setContractorSignature,
  supervisorSignature, setSupervisorSignature,
  isClosed, setIsClosed,
  formRef,
}: EquipmentFormModalProps) {
  const { t } = useTranslation()
  const { stampUrl, hasStamp } = useSignatureStamp()
  const [templateExpanded, setTemplateExpanded] = useState(false)

  useEffect(() => {
    if (open && hasStamp && !contractorSignature) {
      setContractorSignature(stampUrl)
    }
  }, [open, hasStamp])

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
      title={editing ? t('equipment.editEquipmentTitle') : t('equipment.addNewEquipment')}
      submitLabel={editing ? t('common.save') : t('equipment.addEquipment')}
      loading={saving}
      maxWidth="md"
    >
      <Box ref={formRef} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          fullWidth
          label={t('equipment.equipmentName')}
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={!!errors.name || formData.name.length > VALIDATION.MAX_NAME_LENGTH}
          helperText={errors.name || (formData.name.length > 0 ? `${formData.name.length}/${VALIDATION.MAX_NAME_LENGTH}` : undefined)}
          inputProps={{ maxLength: VALIDATION.MAX_NAME_LENGTH }}
        />
        <TextField fullWidth label={t('equipment.manufacturer')} value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
        <TextField fullWidth label={t('equipment.model')} value={formData.modelNumber} onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })} />

        <Divider sx={{ my: 1 }} />

        <Box
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}
          onClick={() => setTemplateExpanded(!templateExpanded)}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {t('equipment.useTemplate')}
          </Typography>
          {templateExpanded ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
        </Box>

        <Collapse in={templateExpanded}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TemplatePicker
              templates={templates}
              value={selectedTemplate}
              onChange={(template) => {
                setFormData({ ...formData, templateId: template?.id || '' })
                setSpecificationValues({})
                setDocumentFiles({})
                setChecklistResponses({})
              }}
              label={t('equipment.type')}
              placeholder={t('equipment.selectTemplate')}
            />

            {selectedTemplate && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedTemplate.description && (
                  <Alert severity="info" sx={{ mt: 1 }}>{selectedTemplate.description}</Alert>
                )}

                {selectedTemplate.required_specifications?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon fontSize="small" color="primary" />
                      {t('equipment.specifications')}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                      {selectedTemplate.required_specifications.map((spec) => (
                        <Box key={spec.name}>
                          {spec.field_type === 'boolean' ? (
                            <FormControlLabel
                              control={<Checkbox checked={!!specificationValues[spec.name]} onChange={(e) => setSpecificationValues({ ...specificationValues, [spec.name]: e.target.checked })} />}
                              label={<Typography variant="body2">{spec.name_he}{spec.required && <span style={{ color: 'red' }}> *</span>}</Typography>}
                            />
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

                {selectedTemplate.required_documents?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon fontSize="small" color="primary" />
                      {t('equipment.requiredDocuments')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                      {selectedTemplate.required_documents.map((doc) => (
                        <Box key={doc.name} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {doc.name_he}
                              {doc.required && <Chip label={t('common.required')} size="small" color="error" sx={{ ml: 1, height: 20 }} />}
                            </Typography>
                            {doc.description && <Typography variant="caption" color="text.secondary">{doc.description}</Typography>}
                            <Typography variant="caption" display="block" color="text.secondary">
                              <PersonIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                              {t(`equipment.source.${doc.source}`)}
                            </Typography>
                          </Box>
                          <Box>
                            {documentFiles[doc.name] ? (
                              <Chip icon={<CheckCircleIcon />} label={documentFiles[doc.name]?.name} color="success" size="small" onDelete={() => setDocumentFiles({ ...documentFiles, [doc.name]: null })} />
                            ) : (
                              <Button variant="secondary" size="small" icon={<CloudUploadIcon />} onClick={() => {
                                const input = document.createElement('input')
                                input.type = 'file'
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0]
                                  if (file) setDocumentFiles({ ...documentFiles, [doc.name]: file })
                                }
                                input.click()
                              }}>
                                {t('common.upload')}
                              </Button>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {selectedTemplate.submission_checklist?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon fontSize="small" color="primary" />
                      {t('equipment.checklist')}
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                      {selectedTemplate.submission_checklist.map((item) => (
                        <FormControlLabel
                          key={item.name}
                          sx={{ display: 'flex', mb: 1 }}
                          control={<Checkbox checked={!!checklistResponses[item.name]} onChange={(e) => setChecklistResponses({ ...checklistResponses, [item.name]: e.target.checked })} />}
                          label={
                            <Box>
                              <Typography variant="body2">{item.name_he}</Typography>
                              {item.requires_file && <Typography variant="caption" color="text.secondary">({t('equipment.requiresFile')})</Typography>}
                            </Box>
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Collapse>

        <TextField fullWidth label={t('common.notes')} multiline rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} error={!!errors.notes || formData.notes.length > VALIDATION.MAX_NOTES_LENGTH} helperText={errors.notes || (formData.notes.length > 0 ? `${formData.notes.length}/${VALIDATION.MAX_NOTES_LENGTH}` : undefined)} />

        <KeyValueEditor entries={customFields} onChange={setCustomFields} suggestions={EQUIPMENT_SUGGESTIONS} />

        <Divider sx={{ my: 1 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarTodayIcon fontSize="small" color="primary" />
          {t('equipment.approvalSettings')}
        </Typography>

        <TextField
          fullWidth
          label={t('equipment.approvalDueDate')}
          type="date"
          InputLabelProps={{ shrink: true }}
          value={formData.approvalDueDate}
          onChange={(e) => setFormData({ ...formData, approvalDueDate: e.target.value })}
          inputProps={{ min: minDateStr, max: maxDateStr }}
        />

        <RecipientSelector
          projectId={projectId}
          label={t('equipment.approvers')}
          value={approvers}
          onChange={setApprovers}
          filterTypes={['consultant', 'inspector', 'supervisor']}
          placeholder={t('equipment.selectApprovers')}
          multiple
        />

        <RecipientSelector
          projectId={projectId}
          label={t('equipment.distributionList')}
          value={distributionList}
          onChange={setDistributionList}
          placeholder={t('equipment.selectDistribution')}
          multiple
        />

        <Divider sx={{ my: 1 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DrawIcon fontSize="small" color="primary" />
          {t('equipment.signatures')}
        </Typography>

        {hasStamp && contractorSignature === stampUrl && (
          <Alert severity="success" sx={{ py: 0.5 }}>
            {t('equipment.stampAutoApplied')}
          </Alert>
        )}

        <SignaturePad
          label={t('equipment.contractorSignature')}
          value={contractorSignature}
          onChange={setContractorSignature}
        />

        <SignaturePad
          label={t('equipment.supervisorSignature')}
          value={supervisorSignature}
          onChange={setSupervisorSignature}
        />

        <Divider sx={{ my: 1 }} />

        <FormControlLabel
          control={<Checkbox checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} />}
          label={<Typography variant="body2">{t('equipment.markAsClosed')}</Typography>}
        />
      </Box>
    </FormModal>
  )
}
