import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/common/ToastProvider'
import { authApi, WebAuthnCredential } from '../api/auth'
import { profileSchema, validateWithSchema } from '../schemas/validation'
import { PersonIcon, EmailIcon, PhoneIcon, BusinessIcon, EditIcon, SaveIcon, FingerprintIcon, DeleteIcon } from '@/icons'
import { Box, Typography, Paper, Avatar, TextField, Button, Divider, Chip, IconButton, CircularProgress } from '@/mui'

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

  const [webauthnSupported] = useState(() => !!window.PublicKeyCredential)
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([])
  const [loadingCredentials, setLoadingCredentials] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    if (webauthnSupported) loadCredentials()
  }, [webauthnSupported])

  const loadCredentials = async () => {
    setLoadingCredentials(true)
    try {
      const creds = await authApi.webauthnListCredentials()
      setCredentials(creds)
    } catch {
      // ignore
    } finally {
      setLoadingCredentials(false)
    }
  }

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

  const handleRegisterBiometric = async () => {
    setRegistering(true)
    try {
      const { options } = await authApi.webauthnRegisterBegin()
      const credential = await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential
      if (!credential) throw new Error('No credential')
      await authApi.webauthnRegisterComplete(credential)
      localStorage.setItem('webauthn_email', user?.email || '')
      showSuccess(t('webauthn.registerSuccess'))
      loadCredentials()
    } catch {
      showError(t('webauthn.registerFailed'))
    } finally {
      setRegistering(false)
    }
  }

  const handleDeleteCredential = async (id: string) => {
    try {
      await authApi.webauthnDeleteCredential(id)
      showSuccess(t('webauthn.deleteSuccess'))
      const updated = credentials.filter(c => c.id !== id)
      setCredentials(updated)
      if (updated.length === 0) {
        localStorage.removeItem('webauthn_email')
      }
    } catch {
      showError(t('webauthn.deleteFailed'))
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

        {webauthnSupported && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <FingerprintIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                {t('webauthn.setupTitle')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {t('webauthn.setupDescription')}
            </Typography>

            {loadingCredentials ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                {credentials.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5 }}>
                    {credentials.map((cred) => (
                      <Box
                        key={cred.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {cred.deviceName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('webauthn.registeredOn')}: {new Date(cred.createdAt).toLocaleDateString(getDateLocale())}
                          </Typography>
                        </Box>
                        <IconButton
                          aria-label={t('webauthn.deleteDevice')}
                          size="small"
                          color="error"
                          onClick={() => handleDeleteCredential(cred.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}

                <Button
                  variant="outlined"
                  startIcon={<FingerprintIcon />}
                  onClick={handleRegisterBiometric}
                  disabled={registering}
                >
                  {registering ? t('webauthn.registering') : t('webauthn.setupButton')}
                </Button>
              </>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  )
}
