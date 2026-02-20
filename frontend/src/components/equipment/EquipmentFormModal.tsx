import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { FormModal } from '../ui/Modal'
import TemplatePicker from '../ui/TemplatePicker'
import KeyValueEditor, { type KeyValuePair } from '../ui/KeyValueEditor'
import type { EquipmentTemplate } from '../../api/equipmentTemplates'
import { VALIDATION, type ValidationError } from '../../utils/validation'
import { BuildIcon, DescriptionIcon, CheckCircleIcon, CloudUploadIcon, PersonIcon } from '@/icons'
import { Box, Typography, Divider, MenuItem, TextField as MuiTextField, Chip, Checkbox, FormControlLabel, Alert } from '@/mui'

interface EquipmentFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  saving: boolean
  editing: boolean
  formData: { name: string; templateId: string; manufacturer: string; modelNumber: string; serialNumber: string; notes: string }
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
}

export default function EquipmentFormModal({
  open, onClose, onSubmit, saving, editing,
  formData, setFormData, errors, templates, selectedTemplate,
  specificationValues, setSpecificationValues,
  documentFiles, setDocumentFiles,
  checklistResponses, setChecklistResponses,
  customFields, setCustomFields,
}: EquipmentFormModalProps) {
  const { t } = useTranslation()

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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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

        <Divider sx={{ my: 1 }} />

        <TextField fullWidth label={t('equipment.manufacturer')} value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField fullWidth label={t('equipment.model')} value={formData.modelNumber} onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })} />
          <TextField fullWidth label={t('equipment.serialNumber')} value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} error={!!errors.serialNumber} helperText={errors.serialNumber} />
        </Box>
        <TextField fullWidth label={t('common.notes')} multiline rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} error={!!errors.notes || formData.notes.length > VALIDATION.MAX_NOTES_LENGTH} helperText={errors.notes || (formData.notes.length > 0 ? `${formData.notes.length}/${VALIDATION.MAX_NOTES_LENGTH}` : undefined)} />

        <Divider sx={{ my: 1 }} />

        <KeyValueEditor entries={customFields} onChange={setCustomFields} />
      </Box>
    </FormModal>
  )
}
