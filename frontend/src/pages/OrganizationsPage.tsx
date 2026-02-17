import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { organizationsApi } from '../api/organizations'
import type { Organization } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField } from '../components/ui/TextField'
import { FormModal } from '../components/ui/Modal'
import { BusinessIcon, AddIcon, GroupIcon, FolderIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip } from '@/mui'

export default function OrganizationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
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
      showError(t('organizations.failedToLoad', 'Failed to load organizations'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim()) return
    setSaving(true)
    try {
      await organizationsApi.create({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      })
      showSuccess(t('organizations.createSuccess', 'Organization created'))
      setDialogOpen(false)
      setFormData({ name: '', code: '', description: '' })
      loadOrganizations()
    } catch {
      showError(t('organizations.failedToCreate', 'Failed to create organization'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={180} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('organizations.title', 'Organizations')}
        subtitle={t('organizations.subtitle', 'Manage your organizations and teams')}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), href: '/dashboard' },
          { label: t('organizations.title', 'Organizations') },
        ]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            {t('organizations.create', 'Create Organization')}
          </Button>
        }
      />

      {organizations.length === 0 ? (
        <Box sx={{ mt: 4 }}>
          <EmptyState
            variant="no-results"
            title={t('organizations.noOrganizations', 'No organizations yet')}
            description={t('organizations.noOrganizationsDescription', 'Create your first organization to get started')}
            action={{ label: t('organizations.create', 'Create Organization'), onClick: () => setDialogOpen(true) }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {organizations.map((org) => (
            <Card key={org.id} hoverable onClick={() => navigate(`/organizations/${org.id}`)}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <BusinessIcon sx={{ color: 'white', fontSize: 22 }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {org.name}
                    </Typography>
                    <Chip label={org.code} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, mt: 0.25 }} />
                  </Box>
                </Box>

                {org.description && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      overflow: 'hidden',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4,
                      mb: 1.5,
                    }}
                  >
                    {org.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {org.memberCount} {t('organizations.members', 'members')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FolderIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {t('organizations.projects', 'Projects')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      <FormModal
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setFormData({ name: '', code: '', description: '' }) }}
        onSubmit={handleCreate}
        title={t('organizations.create', 'Create Organization')}
        submitLabel={t('organizations.create', 'Create Organization')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('organizations.name', 'Name')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            fullWidth
            label={t('organizations.code', 'Code')}
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            helperText={t('organizations.codeHint', 'Unique identifier (e.g., ACME-CORP)')}
          />
          <TextField
            fullWidth
            label={t('organizations.description', 'Description')}
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
