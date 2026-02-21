import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/common/ToastProvider'
import { authApi, WebAuthnCredential } from '../api/auth'
import { profileSchema, validateWithSchema } from '../schemas/validation'
import { SignaturePad } from '../components/checklist/SignaturePad'
import { PersonIcon, EmailIcon, PhoneIcon, BusinessIcon, EditIcon, SaveIcon, FingerprintIcon, DeleteIcon, CameraAltIcon, CreateIcon } from '@/icons'
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

  const [signatureDrawerOpen, setSignatureDrawerOpen] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [savingSignature, setSavingSignature] = useState(false)

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
      await withMinDuration(authApi.updateProfile({
        full_name: formData.fullName || undefined,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
      }))
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

  const handleSaveSignature = async () => {
    if (!signatureData) return
    setSavingSignature(true)
    try {
      await authApi.uploadSignature(signatureData)
      await refreshUser()
      setSignatureDrawerOpen(false)
      setSignatureData(null)
      showSuccess(t('profile.signatureSaved'))
    } catch {
      showError(t('profile.signatureSaveFailed'))
    } finally {
      setSavingSignature(false)
    }
  }

  const handleDeleteSignature = async () => {
    setSavingSignature(true)
    try {
      await authApi.deleteSignature()
      await refreshUser()
      showSuccess(t('profile.signatureDeleted'))
    } catch {
      showError(t('profile.signatureDeleteFailed'))
    } finally {
      setSavingSignature(false)
    }
  }

  return (
    <Box sx={{ pb: { xs: 12, sm: 4 } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: { xs: 4, sm: 5 }, pb: 3, px: 2 }}>
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Avatar
            sx={{
              width: { xs: 100, sm: 120 },
              height: { xs: 100, sm: 120 },
              bgcolor: 'primary.main',
              fontSize: { xs: '2rem', sm: '2.5rem' },
              border: '3px solid',
              borderColor: 'primary.main',
            }}
          >
            {getInitials(user?.fullName || user?.email || '')}
          </Avatar>
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              bottom: 0,
              insetInlineStart: 0,
              bgcolor: 'primary.main',
              color: 'white',
              border: '2px solid',
              borderColor: 'background.default',
              '&:hover': { bgcolor: 'primary.dark' },
              width: 32,
              height: 32,
            }}
          >
            <CameraAltIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Typography variant="h5" fontWeight={700}>{user?.fullName || user?.email}</Typography>
        {user?.role && (
          <Chip
            label={user.role}
            size="small"
            sx={{ mt: 1, bgcolor: 'rgba(242,140,38,0.15)', color: 'primary.main', fontWeight: 600, fontSize: '0.75rem' }}
          />
        )}
        {user?.company && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{user.company}</Typography>
        )}
      </Box>

      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2 }}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          {editing ? (
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PersonIcon sx={{ color: 'primary.main' }} />
                <TextField
                  fullWidth size="small" label={t('profile.fullName')} value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  error={!!errors.fullName} helperText={errors.fullName}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PhoneIcon sx={{ color: 'primary.main' }} />
                <TextField
                  fullWidth size="small" label={t('profile.phone')} value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={!!errors.phone} helperText={errors.phone}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <BusinessIcon sx={{ color: 'primary.main' }} />
                <TextField
                  fullWidth size="small" label={t('profile.company')} value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  error={!!errors.company} helperText={errors.company}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button variant="outlined" size="small" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
                <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
                  {saving ? t('common.loading') : t('common.save')}
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              <ProfileRow icon={<EmailIcon sx={{ color: 'primary.main' }} />} label={t('profile.email')} value={user?.email || '—'} />
              <Divider />
              <ProfileRow icon={<PhoneIcon sx={{ color: 'primary.main' }} />} label={t('profile.phone')} value={user?.phone || '—'} />
              <Divider />
              <ProfileRow icon={<PersonIcon sx={{ color: 'primary.main' }} />} label={t('profile.fullName')} value={user?.fullName || '—'} />
              <Divider />
              <ProfileRow icon={<BusinessIcon sx={{ color: 'primary.main' }} />} label={t('profile.company')} value={user?.company || '—'} />
            </>
          )}
        </Paper>

        {!editing && (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<EditIcon />}
            onClick={() => setEditing(true)}
            sx={{ mb: 3, borderRadius: 3, py: 1.25, fontWeight: 700, borderWidth: 2, borderColor: 'primary.main', color: 'primary.main' }}
          >
            {t('profile.editProfile')}
          </Button>
        )}

        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <CreateIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle2" fontWeight={600}>{t('profile.signature')}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t('profile.signatureDescription')}
            </Typography>

            {user?.signatureUrl && !signatureDrawerOpen ? (
              <Box>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2, bgcolor: '#fff', textAlign: 'center' }}>
                  <img src={user.signatureUrl} alt={t('profile.signature')} style={{ maxWidth: '100%', maxHeight: 120 }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setSignatureDrawerOpen(true)}>
                    {t('profile.changeSignature')}
                  </Button>
                  <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteSignature} disabled={savingSignature}>
                    {t('profile.deleteSignature')}
                  </Button>
                </Box>
              </Box>
            ) : signatureDrawerOpen ? (
              <Box>
                <SignaturePad onSignatureChange={setSignatureData} label={t('profile.signature')} />
                <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" size="small" onClick={() => { setSignatureDrawerOpen(false); setSignatureData(null) }}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSaveSignature} disabled={!signatureData || savingSignature}>
                    {savingSignature ? t('common.loading') : t('common.save')}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Button variant="outlined" startIcon={<CreateIcon />} onClick={() => setSignatureDrawerOpen(true)}>
                {t('profile.drawSignature')}
              </Button>
            )}
          </Box>
        </Paper>

        {webauthnSupported && (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <FingerprintIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={600}>{t('webauthn.setupTitle')}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {t('webauthn.setupDescription')}
              </Typography>

              {loadingCredentials ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  {credentials.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                      {credentials.map((cred) => (
                        <Box
                          key={cred.id}
                          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight={500}>{cred.deviceName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t('webauthn.registeredOn')}: {new Date(cred.createdAt).toLocaleDateString(getDateLocale())}
                            </Typography>
                          </Box>
                          <IconButton aria-label={t('webauthn.deleteDevice')} size="small" color="error" onClick={() => handleDeleteCredential(cred.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                  <Button variant="outlined" startIcon={<FingerprintIcon />} onClick={handleRegisterBiometric} disabled={registering}>
                    {registering ? t('webauthn.registering') : t('webauthn.setupButton')}
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  )
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={500}>{value}</Typography>
      </Box>
    </Box>
  )
}
