import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TextField } from '../ui/TextField'
import { FormModal } from '../ui/Modal'
import type { Permit, PermitCreate, PermitType, PermitStatus } from '../../types/permit'
import { Box, MenuItem, TextField as MuiTextField } from '@/mui'

interface PermitFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: PermitFormData) => void | Promise<void>
  permit?: Permit | null
  loading?: boolean
}

export interface PermitFormData {
  permitType: PermitType
  status?: PermitStatus
  permitNumber?: string
  issuingAuthority?: string
  applicationDate?: string
  approvalDate?: string
  expirationDate?: string
  conditions?: string
  notes?: string
}

export function PermitForm({
  open,
  onClose,
  onSubmit,
  permit,
  loading = false,
}: PermitFormProps) {
  const { t } = useTranslation()

  const permitTypeOptions: { value: PermitType; label: string }[] = [
    { value: 'building_permit', label: t('permits.permitTypes.buildingPermit') },
    { value: 'occupancy_certificate', label: t('permits.permitTypes.occupancyCertificate') },
    { value: 'completion_certificate', label: t('permits.permitTypes.completionCertificate') },
    { value: 'environmental_permit', label: t('permits.permitTypes.environmentalPermit') },
    { value: 'fire_safety_approval', label: t('permits.permitTypes.fireSafetyApproval') },
  ]

  const statusOptions: { value: PermitStatus; label: string }[] = [
    { value: 'not_applied', label: t('permits.statuses.notApplied') },
    { value: 'applied', label: t('permits.statuses.applied') },
    { value: 'under_review', label: t('permits.statuses.underReview') },
    { value: 'approved', label: t('permits.statuses.approved') },
    { value: 'conditional', label: t('permits.statuses.conditional') },
    { value: 'rejected', label: t('permits.statuses.rejected') },
    { value: 'expired', label: t('permits.statuses.expired') },
  ]

  const [formData, setFormData] = useState<PermitFormData>({
    permitType: 'building_permit',
    status: 'not_applied',
    permitNumber: '',
    issuingAuthority: '',
    applicationDate: '',
    approvalDate: '',
    expirationDate: '',
    conditions: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form when editing
  useEffect(() => {
    if (permit) {
      setFormData({
        permitType: permit.permitType,
        status: permit.status,
        permitNumber: permit.permitNumber || '',
        issuingAuthority: permit.issuingAuthority || '',
        applicationDate: permit.applicationDate ? permit.applicationDate.split('T')[0] : '',
        approvalDate: permit.approvalDate ? permit.approvalDate.split('T')[0] : '',
        expirationDate: permit.expirationDate ? permit.expirationDate.split('T')[0] : '',
        conditions: permit.conditions || '',
        notes: permit.notes || '',
      })
      setErrors({})
    } else {
      // Reset form for create
      setFormData({
        permitType: 'building_permit',
        status: 'not_applied',
        permitNumber: '',
        issuingAuthority: '',
        applicationDate: '',
        approvalDate: '',
        expirationDate: '',
        conditions: '',
        notes: '',
      })
      setErrors({})
    }
  }, [permit, open])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.permitType) {
      newErrors.permitType = t('validation.fieldRequired')
    }

    if (formData.applicationDate && formData.approvalDate) {
      const application = new Date(formData.applicationDate)
      const approval = new Date(formData.approvalDate)
      if (approval < application) {
        newErrors.approvalDate = t('permits.approvalDateAfterApplication')
      }
    }

    if (formData.approvalDate && formData.expirationDate) {
      const approval = new Date(formData.approvalDate)
      const expiration = new Date(formData.expirationDate)
      if (expiration < approval) {
        newErrors.expirationDate = t('permits.expirationDateAfterApproval')
      }
    }

    if (formData.conditions && formData.conditions.length > 2000) {
      newErrors.conditions = t('validation.tooLong', { max: 2000 })
    }

    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = t('validation.tooLong', { max: 1000 })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    // Prepare data for submission
    const submitData: PermitFormData = {
      permitType: formData.permitType,
      status: formData.status || undefined,
      permitNumber: formData.permitNumber || undefined,
      issuingAuthority: formData.issuingAuthority || undefined,
      applicationDate: formData.applicationDate || undefined,
      approvalDate: formData.approvalDate || undefined,
      expirationDate: formData.expirationDate || undefined,
      conditions: formData.conditions || undefined,
      notes: formData.notes || undefined,
    }

    await onSubmit(submitData)
  }

  const handleClose = () => {
    setFormData({
      permitType: 'building_permit',
      status: 'not_applied',
      permitNumber: '',
      issuingAuthority: '',
      applicationDate: '',
      approvalDate: '',
      expirationDate: '',
      conditions: '',
      notes: '',
    })
    setErrors({})
    onClose()
  }

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      onSubmit={handleSubmit}
      title={permit ? t('permits.editPermit') : t('permits.addNewPermit')}
      submitLabel={permit ? t('common.saveChanges') : t('permits.addPermit')}
      loading={loading}
      submitDisabled={loading}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Permit Type Selection */}
        <MuiTextField
          fullWidth
          select
          label={t('permits.permitType')}
          required
          value={formData.permitType}
          onChange={(e) => setFormData({ ...formData, permitType: e.target.value as PermitType })}
          error={!!errors.permitType}
          helperText={errors.permitType}
          disabled={loading}
        >
          {permitTypeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </MuiTextField>

        {/* Status Selection */}
        <MuiTextField
          fullWidth
          select
          label={t('permits.status')}
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as PermitStatus })}
          disabled={loading}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </MuiTextField>

        {/* Permit Number */}
        <TextField
          fullWidth
          label={t('permits.permitNumber')}
          value={formData.permitNumber}
          onChange={(e) => setFormData({ ...formData, permitNumber: e.target.value })}
          error={!!errors.permitNumber}
          helperText={errors.permitNumber}
          disabled={loading}
        />

        {/* Issuing Authority */}
        <TextField
          fullWidth
          label={t('permits.authority')}
          value={formData.issuingAuthority}
          onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
          error={!!errors.issuingAuthority}
          helperText={errors.issuingAuthority}
          disabled={loading}
        />

        {/* Date Fields */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            fullWidth
            label={t('permits.submissionDate')}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={formData.applicationDate}
            onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
            error={!!errors.applicationDate}
            helperText={errors.applicationDate}
            disabled={loading}
          />
          <TextField
            fullWidth
            label={t('permits.approvalDate')}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={formData.approvalDate}
            onChange={(e) => setFormData({ ...formData, approvalDate: e.target.value })}
            error={!!errors.approvalDate}
            helperText={errors.approvalDate}
            disabled={loading}
          />
        </Box>

        {/* Expiration Date */}
        <TextField
          fullWidth
          label={t('permits.expiryDate')}
          type="date"
          InputLabelProps={{ shrink: true }}
          value={formData.expirationDate}
          onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
          error={!!errors.expirationDate}
          helperText={errors.expirationDate}
          disabled={loading}
        />

        {/* Conditions */}
        <TextField
          fullWidth
          label={t('permits.conditions')}
          multiline
          rows={3}
          value={formData.conditions}
          onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
          error={!!errors.conditions}
          helperText={errors.conditions || `${formData.conditions?.length || 0}/2000`}
          inputProps={{ maxLength: 2000 }}
          disabled={loading}
        />

        {/* Notes */}
        <TextField
          fullWidth
          label={t('permits.notes')}
          multiline
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          error={!!errors.notes}
          helperText={errors.notes || `${formData.notes?.length || 0}/1000`}
          inputProps={{ maxLength: 1000 }}
          disabled={loading}
        />
      </Box>
    </FormModal>
  )
}
