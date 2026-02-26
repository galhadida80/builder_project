import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { organizationsApi } from '../api/organizations'
import type { Organization } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField, SearchField } from '../components/ui/TextField'
import { FormModal } from '../components/ui/Modal'
import { BusinessIcon, AddIcon, GroupIcon, ApartmentIcon, ChevronLeftIcon, ChevronRightIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, useTheme } from '@/mui'

export default function OrganizationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isRtl = theme.direction === 'rtl'
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({ name: '', code: '', description: '' })

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const data = await organizationsApi.list()
      setOrganizations(data)
    } catch {
      showError(t('organizations.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      showError(t('organizations.fillRequired', 'Please fill in all required fields'))
      return
    }
    if (formData.name.length > 100 || formData.code.length > 20) {
      showError(t('organizations.fieldTooLong', 'Field exceeds maximum length'))
      return
    }
    if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      showError(t('organizations.invalidCode', 'Code must contain only uppercase letters, numbers, and dashes'))
      return
    }
    setSaving(true)
    try {
      await withMinDuration(organizationsApi.create({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      }))
      showSuccess(t('organizations.createSuccess'))
      setDialogOpen(false)
      setFormData({ name: '', code: '', description: '' })
      loadOrganizations()
    } catch {
      showError(t('organizations.failedToCreate'))
    } finally {
      setSaving(false)
    }
  }

  const filtered = organizations.filter(org =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    org.code.toLowerCase().includes(search.toLowerCase())
  )

  const ChevronIcon = isRtl ? ChevronLeftIcon : ChevronRightIcon

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 600, mx: 'auto' }}>
        <Skeleton variant="text" width={150} height={36} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 3 }} />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3, mb: 2 }} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 10 }}>
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default', px: { xs: 2, sm: 3 }, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: 1, borderColor: 'divider',
      }}>
        <Box>
          <Typography variant="h6" fontWeight={700} letterSpacing='-0.02em'>
            {t('organizations.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {organizations.length} {t('organizations.totalOrgs')}
          </Typography>
        </Box>
        <Button variant="primary" icon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          {t('organizations.addOrganization')}
        </Button>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <SearchField
          placeholder={t('organizations.searchPlaceholder', 'Search organization...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, px: { xs: 2, sm: 3 } }}>
        <Chip label={`${organizations.length} ${t('organizations.totalOrgs')}`} size="small" sx={{ fontWeight: 600 }} />
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 } }}>
        {filtered.length === 0 ? (
          <Box sx={{ mt: 4 }}>
            <EmptyState
              variant="no-results"
              title={t('organizations.noOrganizations')}
              description={t('organizations.noOrganizationsDescription')}
              action={{ label: t('organizations.create'), onClick: () => setDialogOpen(true) }}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map((org, idx) => (
              <Box
                key={org.id}
                onClick={() => navigate(`/organizations/${org.id}`)}
                sx={{
                  bgcolor: 'background.paper',
                  border: idx === 0 ? 2 : 1,
                  borderColor: idx === 0 ? 'primary.main' : 'divider',
                  borderRadius: 3,
                  p: 2, display: 'flex', alignItems: 'flex-start', gap: 2,
                  cursor: 'pointer', transition: 'background-color 150ms',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:active': { bgcolor: 'action.selected' },
                }}
              >
                <Box sx={{
                  width: 56, height: 56, borderRadius: '50%',
                  bgcolor: 'primary.main', opacity: 0.1,
                  position: 'absolute',
                }} />
                <Box sx={{
                  width: 56, height: 56, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, position: 'relative',
                  border: 1, borderColor: 'primary.main',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(224,120,66,0.1)' : 'rgba(224,120,66,0.08)',
                }}>
                  <BusinessIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body1" fontWeight={700} noWrap>
                      {org.name}
                    </Typography>
                    <ChevronIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                    <Chip
                      label={org.code}
                      size="small"
                      sx={{
                        height: 22, fontSize: '0.65rem', fontWeight: 700,
                        bgcolor: 'primary.main', color: 'primary.contrastText',
                        textTransform: 'uppercase',
                      }}
                    />
                  </Box>

                  {org.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 1 }}>
                      {org.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ApartmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {t('organizations.projects')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {org.memberCount} {t('organizations.members')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <FormModal
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setFormData({ name: '', code: '', description: '' }) }}
        onSubmit={handleCreate}
        title={t('organizations.create')}
        submitLabel={t('organizations.create')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('organizations.name')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            fullWidth
            label={t('organizations.code')}
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
            inputProps={{ maxLength: 20 }}
            error={formData.code.length > 0 && !/^[A-Z0-9-]+$/.test(formData.code)}
            helperText={t('organizations.codeHint')}
          />
          <TextField
            fullWidth
            label={t('organizations.description')}
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </Box>
      </FormModal>
    </Box>
  )
}
