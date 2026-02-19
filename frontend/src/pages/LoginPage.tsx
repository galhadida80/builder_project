import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { SegmentedTabs } from '../components/ui/Tabs'
import { useAuth } from '../contexts/AuthContext'
import { invitationsApi } from '../api/invitations'
import { authApi } from '../api/auth'
import { projectsApi } from '../api/projects'
import { passwordSchema } from '../schemas/validation'
import { ConstructionIcon, EmailIcon, LockIcon, PersonIcon, VisibilityIcon, VisibilityOffIcon, CheckCircleOutlineIcon, SecurityIcon, SpeedIcon, GroupsIcon, ArrowBackIcon, FingerprintIcon } from '@/icons'
import { Box, Typography, Alert, Link, Divider, Fade, IconButton } from '@/mui'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { login, loginWithWebAuthn, register } = useAuth()
  const inviteToken = searchParams.get('invite')
  const initialTab = searchParams.get('tab') || 'signin'
  const [tab, setTab] = useState(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const submittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [webauthnAvailable, setWebauthnAvailable] = useState(false)
  const [webauthnEmail, setWebauthnEmail] = useState<string | null>(null)
  const biometricAttempted = useRef(false)

  useEffect(() => {
    const available = !!window.PublicKeyCredential
    setWebauthnAvailable(available)
    if (available) {
      const savedEmail = localStorage.getItem('webauthn_email')
      if (savedEmail) setWebauthnEmail(savedEmail)
    }
  }, [])

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setConfirmPassword('')
    setError(null)
    setErrorCode(null)
    setSuccess(null)
    setPasswordErrors([])
  }

  const handleTabChange = (value: string, preserveEmail = false) => {
    setTab(value)
    const currentEmail = email
    resetForm()
    if (preserveEmail) setEmail(currentEmail)
  }

  const navigateAfterLogin = async () => {
    if (inviteToken) {
      try {
        const result = await invitationsApi.accept(inviteToken)
        if (result.projectId) {
          navigate(`/projects/${result.projectId}/overview`)
          return
        }
      } catch { /* ignore */ }
    }
    try {
      const projects = await projectsApi.list()
      navigate(projects.length === 0 ? '/projects?new=true' : '/dashboard')
    } catch {
      navigate('/dashboard')
    }
  }

  const handleBiometricLogin = useCallback(async (biometricEmail: string) => {
    setBiometricLoading(true)
    setError(null)
    try {
      await loginWithWebAuthn(biometricEmail)
      await navigateAfterLogin()
    } catch {
      // silently fail — user can use password
    } finally {
      setBiometricLoading(false)
    }
  }, [loginWithWebAuthn, navigateAfterLogin])

  useEffect(() => {
    if (webauthnAvailable && webauthnEmail && tab === 'signin' && !biometricAttempted.current) {
      biometricAttempted.current = true
      handleBiometricLogin(webauthnEmail)
    }
  }, [webauthnAvailable, webauthnEmail, tab, handleBiometricLogin])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError(null)

    try {
      await login(email, password)
      await navigateAfterLogin()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || t('invalidCredentials'))
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError(t('passwordsMismatch'))
      setLoading(false)
      submittingRef.current = false
      return
    }

    const pwResult = passwordSchema.safeParse(password)
    if (!pwResult.success) {
      setPasswordErrors(pwResult.error.issues.map((i) => i.message))
      setLoading(false)
      submittingRef.current = false
      return
    }
    setPasswordErrors([])

    try {
      await register(email, password, fullName, inviteToken || undefined)
      if (inviteToken) {
        try {
          const result = await invitationsApi.accept(inviteToken)
          if (result.projectId) {
            navigate(`/projects/${result.projectId}/overview`)
            return
          }
        } catch { /* ignore invite accept errors */ }
      }
      navigate('/projects?new=true')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string | { message?: string; code?: string } } } }
      const detail = error.response?.data?.detail
      if (typeof detail === 'object' && detail?.code === 'EMAIL_ALREADY_REGISTERED') {
        setErrorCode('EMAIL_ALREADY_REGISTERED')
        setError(detail.message || t('emailAlreadyRegistered'))
      } else {
        const message = typeof detail === 'string' ? detail : detail?.message
        setError(message || t('registrationFailed'))
      }
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  const features = [
    { icon: <SpeedIcon sx={{ fontSize: 20 }} />, text: t('realTimeTracking') },
    { icon: <ConstructionIcon sx={{ fontSize: 20 }} />, text: t('equipmentManagement') },
    { icon: <SecurityIcon sx={{ fontSize: 20 }} />, text: t('inspectionSystem') },
    { icon: <GroupsIcon sx={{ fontSize: 20 }} />, text: t('approvalWorkflows') },
  ]

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      {/* Left Panel - Branding & Features */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { md: 6, lg: 8 },
          background: 'linear-gradient(160deg, #075985 0%, #0369A1 40%, #0284C7 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background pattern */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.06,
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Decorative glow */}
        <Box
          sx={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-15%',
            left: '-5%',
            width: '40%',
            height: '40%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
          }}
        />

        <Fade in timeout={600}>
          <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <ConstructionIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em">
                  BuilderOps
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                  {t('platformSubtitle')}
                </Typography>
              </Box>
            </Box>

            {/* Hero text */}
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{
                mb: 2,
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                fontSize: { md: '1.75rem', lg: '2.125rem' },
              }}
            >
              {t('buildSmarterTitle')}
              <br />
              {t('inspectFasterTitle')}
              <br />
              {t('deliverExcellenceTitle')}
            </Typography>

            <Typography
              variant="body2"
              sx={{ mb: 5, opacity: 0.75, lineHeight: 1.7, maxWidth: 380 }}
            >
              {t('platformDescription')}
            </Typography>

            {/* Features */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {features.map((feature, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 200ms ease-out',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.12)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="body2" fontWeight={500}>
                    {feature.text}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Trust badge */}
            <Box sx={{ mt: 5, pt: 4, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, opacity: 0.6 }} />
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  {t('trustBadge')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Box>

      {/* Right Panel - Auth Form */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 520px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, sm: 4, md: 6 },
          position: 'relative',
        }}
      >
        <Fade in timeout={400}>
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            {/* Mobile logo */}
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                gap: 1.5,
                mb: 4,
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <ConstructionIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                BuilderOps
              </Typography>
            </Box>

            {/* Header */}
            <Box sx={{ mb: 3.5, textAlign: { xs: 'center', md: 'start' } }}>
              <Typography
                variant="h4"
                fontWeight={700}
                color="text.primary"
                sx={{ mb: 0.5, letterSpacing: '-0.01em' }}
              >
                {tab === 'signin' ? t('welcomeBack') : t('createAccount')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tab === 'signin' ? t('enterCredentials') : t('fillDetails')}
              </Typography>
            </Box>

            {/* Tabs */}
            <SegmentedTabs
              items={[
                { label: t('signIn'), value: 'signin' },
                { label: t('signUp'), value: 'signup' },
              ]}
              value={tab}
              onChange={handleTabChange}
            />

            {/* Form */}
            <Box sx={{ mt: 3.5 }}>
              {error && errorCode === 'EMAIL_ALREADY_REGISTERED' ? (
                <Alert
                  severity="warning"
                  sx={{ mb: 2.5, borderRadius: 2 }}
                  onClose={() => { setError(null); setErrorCode(null) }}
                >
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                    {t('emailAlreadyRegistered')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {t('emailAlreadyRegisteredHint')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Link
                      component="button"
                      type="button"
                      variant="caption"
                      fontWeight={600}
                      onClick={() => handleTabChange('signin', true)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {t('signInInstead')}
                    </Link>
                    <Link
                      component="button"
                      type="button"
                      variant="caption"
                      fontWeight={600}
                      onClick={() => {
                        setForgotPasswordMode(true)
                        setForgotPasswordEmail(email)
                        handleTabChange('signin', true)
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      {t('resetYourPassword')}
                    </Link>
                  </Box>
                </Alert>
              ) : error ? (
                <Alert
                  severity="error"
                  sx={{ mb: 2.5, borderRadius: 2 }}
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              ) : null}

              {success && (
                <Alert
                  severity="success"
                  sx={{ mb: 2.5, borderRadius: 2 }}
                  onClose={() => setSuccess(null)}
                >
                  {success}
                </Alert>
              )}

              {tab === 'signin' ? (
                forgotPasswordMode ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    if (!forgotPasswordEmail) return
                    setLoading(true)
                    setError(null)
                    try {
                      await authApi.forgotPassword(forgotPasswordEmail)
                      setSuccess(t('resetLinkSent'))
                    } catch {
                      setSuccess(t('resetLinkSent'))
                    } finally {
                      setLoading(false)
                    }
                  }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('forgotPasswordDescription')}
                    </Typography>
                    <TextField
                      fullWidth
                      label={t('email')}
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      startIcon={<EmailIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                    />
                    <Button
                      fullWidth
                      type="submit"
                      variant="primary"
                      loading={loading}
                      sx={{
                        py: 1.5,
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(3, 105, 161, 0.3)',
                      }}
                    >
                      {t('sendResetLink')}
                    </Button>
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={() => {
                        setForgotPasswordMode(false)
                        setError(null)
                        setSuccess(null)
                      }}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                    >
                      <ArrowBackIcon sx={{ fontSize: 16 }} />
                      {t('backToSignIn')}
                    </Link>
                  </Box>
                  </form>
                ) : (
                <>
                <form onSubmit={handleLogin}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                      fullWidth
                      label={t('email')}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      startIcon={<EmailIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                    />
                    <TextField
                      fullWidth
                      label={t('password')}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      startIcon={<LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                      endIcon={
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                          sx={{ color: 'text.disabled' }}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon sx={{ fontSize: 20 }} />
                          ) : (
                            <VisibilityIcon sx={{ fontSize: 20 }} />
                          )}
                        </IconButton>
                      }
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
                      <Link
                        component="button"
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(true)
                          setForgotPasswordEmail(email)
                          setError(null)
                          setSuccess(null)
                        }}
                        underline="hover"
                        sx={{
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          color: 'primary.main',
                          cursor: 'pointer',
                        }}
                      >
                        {t('forgotPassword')}
                      </Link>
                    </Box>

                    <Button
                      fullWidth
                      type="submit"
                      variant="primary"
                      loading={loading}
                      sx={{
                        py: 1.5,
                        mt: 0.5,
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(3, 105, 161, 0.3)',
                        '&:hover': {
                          boxShadow: '0 4px 16px rgba(3, 105, 161, 0.4)',
                        },
                      }}
                    >
                      {t('signIn')}
                    </Button>
                  </Box>
                </form>

                {webauthnAvailable && webauthnEmail && (
                  <>
                    <Divider sx={{ my: 2.5 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
                        {t('or')}
                      </Typography>
                    </Divider>

                    <Button
                      fullWidth
                      variant="secondary"
                      icon={<FingerprintIcon />}
                      loading={biometricLoading}
                      onClick={() => handleBiometricLogin(webauthnEmail)}
                      sx={{
                        py: 1.5,
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        borderRadius: 2,
                      }}
                    >
                      {t('webauthn.loginButton')}
                    </Button>
                  </>
                )}
                </>
                )
              ) : (
                <form onSubmit={handleRegister}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                      fullWidth
                      label={t('fullName')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      autoFocus
                      startIcon={<PersonIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                    />
                    <TextField
                      fullWidth
                      label={t('email')}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      startIcon={<EmailIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                    />
                    <TextField
                      fullWidth
                      label={t('password')}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      error={passwordErrors.length > 0}
                      helperText={passwordErrors.length > 0 ? passwordErrors[0] : t('atLeast8Chars')}
                      startIcon={<LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                      endIcon={
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                          sx={{ color: 'text.disabled' }}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon sx={{ fontSize: 20 }} />
                          ) : (
                            <VisibilityIcon sx={{ fontSize: 20 }} />
                          )}
                        </IconButton>
                      }
                    />
                    <TextField
                      fullWidth
                      label={t('confirmPassword')}
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      startIcon={<LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                    />

                    <Button
                      fullWidth
                      type="submit"
                      variant="primary"
                      loading={loading}
                      sx={{
                        py: 1.5,
                        mt: 0.5,
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(3, 105, 161, 0.3)',
                        '&:hover': {
                          boxShadow: '0 4px 16px rgba(3, 105, 161, 0.4)',
                        },
                      }}
                    >
                      {t('createButton')}
                    </Button>
                  </Box>
                </form>
              )}

              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
                  {t('or')}
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {tab === 'signin' ? t('noAccount') : t('haveAccount')}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => handleTabChange(tab === 'signin' ? 'signup' : 'signin')}
                    underline="hover"
                    sx={{ fontWeight: 600, ml: 0.5, cursor: 'pointer' }}
                  >
                    {tab === 'signin' ? t('signUpLink') : t('signInLink')}
                  </Link>
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                {t('terms')}
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Box>
    </Box>
  )
}
