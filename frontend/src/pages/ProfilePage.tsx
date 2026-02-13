import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/common/ToastProvider'
import { authApi } from '../api/auth'
import { profileSchema, validateWithSchema } from '../schemas/validation'
import { PersonIcon, EmailIcon, PhoneIcon, BusinessIcon, EditIcon, SaveIcon } from '@/icons'
import { Box, Typography, Paper, Avatar, TextField, Button, Divider, Chip } from '@/mui'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const { showSuccess, showError } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    company: user?.company || '',
  })

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleSave = async () => {
    const result = validateWithSchema(profileSchema, formData)
    if (!result.valid) {
      setErrors(result.errors || {})
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await authApi.updateProfile({
        full_name: formData.fullName || undefined,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
      })
      await refreshUser()
      setEditing(false)
      showSuccess(t('profile.updateSuccess'))
    } catch {
      showError(t('profile.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          {t('profile.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('profile.subtitle')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
              {getInitials(user?.fullName || user?.email || '')}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>{user?.fullName || user?.email}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              {user?.role && <Chip label={user.role} size="small" sx={{ mt: 0.5 }} />}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PersonIcon sx={{ color: 'text.secondary' }} />
              {editing ? (
                <TextField
                  fullWidth
                  size="small"
                  label={t('profile.fullName')}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  error={!!errors.fullName}
                  helperText={errors.fullName}
                />
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('profile.fullName')}</Typography>
                  <Typography variant="body1">{user?.fullName || '—'}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <EmailIcon sx={{ color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">{t('profile.email')}</Typography>
                <Typography variant="body1">{user?.email}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PhoneIcon sx={{ color: 'text.secondary' }} />
              {editing ? (
                <TextField
                  fullWidth
                  size="small"
                  label={t('profile.phone')}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={!!errors.phone}
                  helperText={errors.phone}
                />
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('profile.phone')}</Typography>
                  <Typography variant="body1">{user?.phone || '—'}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <BusinessIcon sx={{ color: 'text.secondary' }} />
              {editing ? (
                <TextField
                  fullWidth
                  size="small"
                  label={t('profile.company')}
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  error={!!errors.company}
                  helperText={errors.company}
                />
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('profile.company')}</Typography>
                  <Typography variant="body1">{user?.company || '—'}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            {editing ? (
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
                {t('profile.editProfile')}
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
