import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, Box, Autocomplete, Chip,
} from '@/mui'
import type { SelectChangeEvent } from '@/mui'
import type { Vendor } from '../../types'
import { BusinessIcon, LocalShippingIcon, ConstructionIcon, PlumbingIcon, ElectricalServicesIcon } from '@/icons'

interface VendorDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: VendorFormData) => void
  editingVendor?: Vendor | null
  loading?: boolean
}

export interface VendorFormData {
  company_name: string
  trade: string
  contact_email?: string
  contact_phone?: string
  address?: string
  license_number?: string
  insurance_expiry?: string
  rating?: number
  certifications?: string[]
  notes?: string
}

const vendorSchema = z.object({
  company_name: z.string().min(1),
  trade: z.string().min(1),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  license_number: z.string().optional(),
  insurance_expiry: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  certifications: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

const TRADE_TYPES = [
  { value: 'general_contractor', labelKey: 'vendors.trades.generalContractor', icon: <ConstructionIcon />, color: '#e07842' },
  { value: 'plumbing', labelKey: 'vendors.trades.plumbing', icon: <PlumbingIcon />, color: '#0288d1' },
  { value: 'electrical', labelKey: 'vendors.trades.electrical', icon: <ElectricalServicesIcon />, color: '#ed6c02' },
  { value: 'hvac', labelKey: 'vendors.trades.hvac', icon: <BusinessIcon />, color: '#9c27b0' },
  { value: 'concrete', labelKey: 'vendors.trades.concrete', icon: <ConstructionIcon />, color: '#757575' },
  { value: 'masonry', labelKey: 'vendors.trades.masonry', icon: <ConstructionIcon />, color: '#795548' },
  { value: 'carpentry', labelKey: 'vendors.trades.carpentry', icon: <ConstructionIcon />, color: '#8d6e63' },
  { value: 'roofing', labelKey: 'vendors.trades.roofing', icon: <ConstructionIcon />, color: '#d32f2f' },
  { value: 'supplier', labelKey: 'vendors.trades.supplier', icon: <LocalShippingIcon />, color: '#2e7d32' },
]

export default function VendorDialog({ open, onClose, onSubmit, editingVendor, loading = false }: VendorDialogProps) {
  const { t } = useTranslation()

  const { control, handleSubmit, reset, formState: { errors } } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      company_name: '', trade: '', contact_email: '', contact_phone: '',
      address: '', license_number: '', insurance_expiry: '', rating: 0,
      certifications: [], notes: '',
    },
  })

  useEffect(() => {
    if (editingVendor) {
      reset({
        company_name: editingVendor.companyName,
        trade: editingVendor.trade,
        contact_email: editingVendor.contactEmail || '',
        contact_phone: editingVendor.contactPhone || '',
        address: editingVendor.address || '',
        license_number: editingVendor.licenseNumber || '',
        insurance_expiry: editingVendor.insuranceExpiry || '',
        rating: editingVendor.rating || 0,
        certifications: editingVendor.certifications || [],
        notes: editingVendor.notes || '',
      })
    } else {
      reset({
        company_name: '', trade: '', contact_email: '', contact_phone: '',
        address: '', license_number: '', insurance_expiry: '', rating: 0,
        certifications: [], notes: '',
      })
    }
  }, [editingVendor, open, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editingVendor ? t('vendors.editVendor') : t('vendors.addVendor')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller name="company_name" control={control} render={({ field }) => (
                <TextField {...field} label={t('vendors.companyName')} required fullWidth size="small"
                  error={!!errors.company_name} helperText={errors.company_name?.message} />
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="trade" control={control} render={({ field }) => (
                <FormControl fullWidth size="small" error={!!errors.trade}>
                  <InputLabel required>{t('vendors.trade')}</InputLabel>
                  <Select {...field} label={t('vendors.trade')} onChange={(e: SelectChangeEvent) => field.onChange(e.target.value)}>
                    {TRADE_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: type.color, display: 'flex' }}>{type.icon}</Box>
                          {t(type.labelKey)}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )} />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller name="contact_email" control={control} render={({ field }) => (
                <TextField {...field} label={t('vendors.contactEmail')} type="email" fullWidth size="small"
                  error={!!errors.contact_email} helperText={errors.contact_email?.message} />
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="contact_phone" control={control} render={({ field }) => (
                <TextField {...field} label={t('vendors.contactPhone')} fullWidth size="small" />
              )} />
            </Grid>
          </Grid>
          <Controller name="address" control={control} render={({ field }) => (
            <TextField {...field} label={t('vendors.address')} fullWidth size="small" multiline rows={2} />
          )} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller name="license_number" control={control} render={({ field }) => (
                <TextField {...field} label={t('vendors.licenseNumber')} fullWidth size="small" />
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="insurance_expiry" control={control} render={({ field }) => (
                <TextField {...field} label={t('vendors.insuranceExpiry')} type="date" fullWidth size="small"
                  InputLabelProps={{ shrink: true }} />
              )} />
            </Grid>
          </Grid>
          <Controller name="certifications" control={control} render={({ field }) => (
            <Autocomplete {...field} multiple freeSolo options={[]} value={field.value || []}
              onChange={(_, data) => field.onChange(data)}
              renderTags={(value, getTagProps) =>
                value.map((cert, index) => (<Chip label={cert} {...getTagProps({ index })} key={index} size="small" />))
              }
              renderInput={(params) => (
                <TextField {...params} label={t('vendors.certifications')} placeholder={t('vendors.certificationsHelp')} size="small" />
              )}
            />
          )} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller name="rating" control={control} render={({ field }) => (
                <TextField {...field} label={t('vendors.rating')} type="number" fullWidth size="small"
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
              )} />
            </Grid>
          </Grid>
          <Controller name="notes" control={control} render={({ field }) => (
            <TextField {...field} label={t('vendors.notes')} fullWidth size="small" multiline rows={3} />
          )} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? t('common.saving') : editingVendor ? t('common.save') : t('vendors.addVendor')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
