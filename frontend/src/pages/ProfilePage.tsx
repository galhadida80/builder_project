import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/common/ToastProvider'
import { authApi, WebAuthnCredential, WorkSummary } from '../api/auth'
import { profileSchema, validateWithSchema } from '../schemas/validation'
import { SignaturePad } from '../components/checklist/SignaturePad'
import { PersonIcon, EmailIcon, PhoneIcon, BusinessIcon, EditIcon, SaveIcon, FingerprintIcon, DeleteIcon, CameraAltIcon, CreateIcon, LocationOnIcon, AssignmentIcon, ApprovalIcon, TaskAltIcon, WarningAmberIcon, PhoneIphoneIcon, CheckCircleIcon } from '@/icons'
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
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null)

  const [webauthnSupported] = useState(() => !!window.PublicKeyCredential)
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([])
  const [loadingCredentials, setLoadingCredentials] = useState(false)
  const [registering, setRegistering] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null)
  const [savingAvatar, setSavingAvatar] = useState(false)

  const [workSummary, setWorkSummary] = useState<WorkSummary | null>(null)
  const [loadingWork, setLoadingWork] = useState(true)

  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [linkingWhatsApp, setLinkingWhatsApp] = useState(false)
  const [verifyingWhatsApp, setVerifyingWhatsApp] = useState(false)
  const [awaitingVerification, setAwaitingVerification] = useState(false)

  useEffect(() => {
    if (user?.signatureUrl) {
      authApi.getSignatureImage().then(setSignatureImageUrl).catch(() => {})
    } else {
      setSignatureImageUrl(null)
    }
  }, [user?.signatureUrl])

  useEffect(() => {
    if (user?.avatarUrl) {
      authApi.getAvatarImage().then(setAvatarImageUrl).catch(() => {})
    } else {
      setAvatarImageUrl(null)
    }
  }, [user?.avatarUrl])

  useEffect(() => {
    if (webauthnSupported) loadCredentials()
  }, [webauthnSupported])

  useEffect(() => {
    authApi.getWorkSummary()
      .then(setWorkSummary)
      .catch(() => {})
      .finally(() => setLoadingWork(false))
  }, [])

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

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (e.target) e.target.value = ''

    const reader = new FileReader()
    reader.onloadend = async () => {
      const dataUrl = reader.result as string
      setSavingAvatar(true)
      try {
        await authApi.uploadAvatar(dataUrl)
        await refreshUser()
        const imageUrl = await authApi.getAvatarImage()
        setAvatarImageUrl(imageUrl)
        showSuccess(t('profile.avatarSaved'))
      } catch {
        showError(t('profile.avatarSaveFailed'))
      } finally {
        setSavingAvatar(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteAvatar = async () => {
    setSavingAvatar(true)
    try {
      await authApi.deleteAvatar()
      await refreshUser()
      setAvatarImageUrl(null)
      showSuccess(t('profile.avatarSaved'))
    } catch {
      showError(t('profile.avatarSaveFailed'))
    } finally {
      setSavingAvatar(false)
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
      const imageUrl = await authApi.getSignatureImage()
      setSignatureImageUrl(imageUrl)
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
      setSignatureImageUrl(null)
      showSuccess(t('profile.signatureDeleted'))
    } catch {
      showError(t('profile.signatureDeleteFailed'))
    } finally {
      setSavingSignature(false)
    }
  }

  const handleLinkWhatsApp = async () => {
    if (!whatsappNumber.trim()) {
      showError(t('whatsapp.phoneRequired') || 'Phone number required')
      return
    }
    setLinkingWhatsApp(true)
    try {
      await authApi.linkWhatsApp(whatsappNumber.trim())
      setAwaitingVerification(true)
      showSuccess(t('whatsapp.codeSent') || 'Verification code sent via WhatsApp')
    } catch {
      showError(t('whatsapp.linkFailed') || 'Failed to send verification code')
    } finally {
      setLinkingWhatsApp(false)
    }
  }

  const handleVerifyWhatsApp = async () => {
    if (!verificationCode.trim()) {
      showError(t('whatsapp.codeRequired') || 'Verification code required')
      return
    }
    setVerifyingWhatsApp(true)
    try {
      await authApi.verifyWhatsApp(verificationCode.trim())
      await refreshUser()
      setAwaitingVerification(false)
      setWhatsappNumber('')
      setVerificationCode('')
      showSuccess(t('whatsapp.verifySuccess') || 'WhatsApp number linked successfully')
    } catch {
      showError(t('whatsapp.verifyFailed') || 'Invalid verification code')
    } finally {
      setVerifyingWhatsApp(false)
    }
  }

  const handleUnlinkWhatsApp = async () => {
    setLinkingWhatsApp(true)
    try {
      await authApi.unlinkWhatsApp()
      await refreshUser()
      setWhatsappNumber('')
      setVerificationCode('')
      setAwaitingVerification(false)
      showSuccess(t('whatsapp.unlinkSuccess') || 'WhatsApp number removed')
    } catch {
      showError(t('whatsapp.unlinkFailed') || 'Failed to remove WhatsApp number')
    } finally {
      setLinkingWhatsApp(false)
    }
  }

  const workCategories = [
    { icon: <TaskAltIcon sx={{ color: 'primary.main' }} />, label: t('profile.openTasks'), count: workSummary?.openTasks ?? 0 },
    { icon: <AssignmentIcon sx={{ color: '#2196f3' }} />, label: t('profile.openRfis'), count: workSummary?.openRfis ?? 0 },
    { icon: <ApprovalIcon sx={{ color: '#ff9800' }} />, label: t('profile.pendingApprovals'), count: workSummary?.pendingApprovals ?? 0 },
    { icon: <WarningAmberIcon sx={{ color: '#f44336' }} />, label: t('profile.openDefects'), count: workSummary?.openDefects ?? 0 },
  ]

  const statusColor = (status: string) => {
    if (status === 'in_progress' || status === 'waiting_response') return 'warning'
    if (status === 'open' || status === 'not_started' || status === 'pending') return 'info'
    return 'default'
  }

  return (
    <Box sx={{ pb: { xs: 12, sm: 4 } }}>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={handleAvatarSelect}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: { xs: 4, sm: 5 }, pb: 3, px: 2 }}>
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Avatar
            src={avatarImageUrl || undefined}
            sx={{
              width: { xs: 100, sm: 120 },
              height: { xs: 100, sm: 120 },
              bgcolor: 'primary.main',
              fontSize: { xs: '2rem', sm: '2.5rem' },
              border: '3px solid',
              borderColor: 'primary.main',
            }}
          >
            {savingAvatar ? <CircularProgress size={32} sx={{ color: 'white' }} /> : getInitials(user?.fullName || user?.email || '')}
          </Avatar>
          <IconButton
            size="small"
            onClick={() => avatarInputRef.current?.click()}
            disabled={savingAvatar}
            aria-label={t('profile.changeAvatar')}
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
            sx={{ mt: 1, bgcolor: 'rgba(224,120,66,0.15)', color: 'primary.main', fontWeight: 600, fontSize: '0.75rem' }}
          />
        )}
        {user?.company && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{user.company}</Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('profile.memberSince')} {new Date(user?.createdAt || Date.now()).toLocaleDateString(getDateLocale(), { year: 'numeric', month: 'long' })}
        </Typography>
        {avatarImageUrl && (
          <Button size="small" color="error" onClick={handleDeleteAvatar} disabled={savingAvatar} sx={{ mt: 0.5, fontSize: '0.7rem' }}>
            {t('profile.removePhoto')}
          </Button>
        )}
      </Box>

      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, mb: 3 }}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', py: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {loadingWork ? '—' : workSummary?.projectsCount ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">{t('profile.projects')}</Typography>
            </Box>
            <Box sx={{ borderInlineStart: '1px solid', borderInlineEnd: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {loadingWork ? '—' : workSummary?.openTasks ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">{t('profile.openTasks')}</Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {loadingWork ? '—' : workSummary?.pendingApprovals ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">{t('profile.pendingApprovals')}</Typography>
            </Box>
          </Box>
        </Paper>
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
              <Divider />
              <ProfileRow icon={<LocationOnIcon sx={{ color: 'primary.main' }} />} label={t('profile.location')} value={user?.company || '—'} />
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
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, textAlign: 'center' }}>
              {t('profile.myWork')}
            </Typography>
            {loadingWork ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  {workCategories.map((cat) => (
                    <Box key={cat.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {cat.icon}
                        <Typography variant="body2" fontWeight={500}>{cat.label}</Typography>
                      </Box>
                      <Chip label={cat.count} size="small" sx={{ fontWeight: 700, minWidth: 36 }} />
                    </Box>
                  ))}
                </Box>

                {workSummary && workSummary.recentItems.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {t('profile.recentItems')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {workSummary.recentItems.map((item) => (
                        <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" fontWeight={500} noWrap>{item.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.projectName}</Typography>
                          </Box>
                          <Chip label={item.status.replace('_', ' ')} size="small" color={statusColor(item.status)} sx={{ fontSize: '0.65rem', height: 20, ml: 1 }} />
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </>
            )}
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <CreateIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle2" fontWeight={600}>{t('profile.signature')}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t('profile.signatureDescription')}
            </Typography>

            {signatureImageUrl && !signatureDrawerOpen ? (
              <Box>
                <Box sx={{
                  border: '2px solid',
                  borderColor: 'success.main',
                  borderRadius: 3,
                  p: 2,
                  mb: 2,
                  bgcolor: 'background.paper',
                  textAlign: 'center',
                  position: 'relative',
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(46,125,50,0.08) 0%, rgba(224,120,66,0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(46,125,50,0.04) 0%, rgba(224,120,66,0.02) 100%)',
                }}>
                  <Chip
                    label={t('profile.activeStamp')}
                    size="small"
                    color="success"
                    sx={{ position: 'absolute', top: 8, insetInlineEnd: 8, fontWeight: 600, fontSize: '0.65rem' }}
                  />
                  <img src={signatureImageUrl} alt={t('profile.signature')} style={{ maxWidth: '100%', maxHeight: 120, opacity: 0.85 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {t('profile.stampDescription')}
                  </Typography>
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

        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <PhoneIphoneIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle2" fontWeight={600}>
                {t('whatsapp.title') || 'WhatsApp Integration'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t('whatsapp.description') || 'Link your WhatsApp number to receive notifications and interact with AI chat via WhatsApp'}
            </Typography>

            {user?.whatsappVerified ? (
              <Box>
                <Box sx={{
                  border: '2px solid',
                  borderColor: 'success.main',
                  borderRadius: 3,
                  p: 2,
                  mb: 2,
                  bgcolor: 'background.paper',
                  position: 'relative',
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(46,125,50,0.08) 0%, rgba(224,120,66,0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(46,125,50,0.04) 0%, rgba(224,120,66,0.02) 100%)',
                }}>
                  <Chip
                    label={t('whatsapp.linked') || 'Linked'}
                    size="small"
                    color="success"
                    icon={<CheckCircleIcon />}
                    sx={{ position: 'absolute', top: 8, insetInlineEnd: 8, fontWeight: 600, fontSize: '0.65rem' }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PhoneIphoneIcon sx={{ color: 'success.main', fontSize: 32 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {user.whatsappNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('whatsapp.linkedDescription') || 'Receive notifications and chat via WhatsApp'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleUnlinkWhatsApp}
                  disabled={linkingWhatsApp}
                >
                  {linkingWhatsApp ? t('common.loading') : (t('whatsapp.unlinkButton') || 'Unlink WhatsApp')}
                </Button>
              </Box>
            ) : awaitingVerification ? (
              <Box>
                <Typography variant="caption" color="success.main" fontWeight={600} sx={{ display: 'block', mb: 1.5 }}>
                  {t('whatsapp.codeSentMessage') || `Verification code sent to ${whatsappNumber}`}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label={t('whatsapp.verificationCode') || 'Verification Code'}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  inputProps={{ maxLength: 6 }}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setAwaitingVerification(false)
                      setVerificationCode('')
                      setWhatsappNumber('')
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleVerifyWhatsApp}
                    disabled={!verificationCode.trim() || verifyingWhatsApp}
                  >
                    {verifyingWhatsApp ? t('common.loading') : (t('whatsapp.verifyButton') || 'Verify')}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <TextField
                  fullWidth
                  size="small"
                  label={t('whatsapp.phoneNumber') || 'WhatsApp Number'}
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+972501234567"
                  helperText={t('whatsapp.phoneHelp') || 'Enter your WhatsApp number in international format (e.g., +972501234567)'}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="outlined"
                  startIcon={<PhoneIphoneIcon />}
                  onClick={handleLinkWhatsApp}
                  disabled={!whatsappNumber.trim() || linkingWhatsApp}
                >
                  {linkingWhatsApp ? t('common.loading') : (t('whatsapp.linkButton') || 'Link WhatsApp')}
                </Button>
              </Box>
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
      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'end' }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={500}>{value}</Typography>
      </Box>
      {icon}
    </Box>
  )
}
