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
import { GoogleLogin } from '@react-oauth/google'
import { ConstructionIcon, EmailIcon, LockIcon, PersonIcon, VisibilityIcon, VisibilityOffIcon, ArrowBackIcon, FingerprintIcon } from '@/icons'
import { Box, Typography, Alert, Link, Divider, Fade, IconButton } from '@/mui'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { login, loginWithGoogle, loginWithWebAuthn, register } = useAuth()
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID
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

  const handleGoogleSuccess = useCallback(async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    setGoogleLoading(true)
    setError(null)
    try {
      await loginWithGoogle(credentialResponse.credential)
      await navigateAfterLogin()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || t('googleSignInFailed'))
    } finally {
      setGoogleLoading(false)
    }
  }, [loginWithGoogle, navigateAfterLogin, t])

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
          const projects = await projectsApi.list()
          if (projects.length > 0) {
            navigate(`/projects/${projects[0].id}/overview`)
            return
          }
        } catch { /* ignore */ }
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

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: { xs: 2, sm: 3 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative gradients */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.15,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            insetInlineEnd: '-10%',
            width: '40%',
            height: '40%',
            borderRadius: '50%',
            background: (theme) => `radial-gradient(circle, ${theme.palette.primary.main}33, transparent 70%)`,
            filter: 'blur(120px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-10%',
            insetInlineStart: '-10%',
            width: '40%',
            height: '40%',
            borderRadius: '50%',
            background: (theme) => `radial-gradient(circle, ${theme.palette.primary.main}1A, transparent 70%)`,
            filter: 'blur(120px)',
          }}
        />
      </Box>

      <Fade in timeout={400}>
        <Box sx={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: { xs: 4, sm: 5 } }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1.5,
                borderRadius: 3,
                bgcolor: (theme) => `${theme.palette.primary.main}1A`,
                mb: 2,
              }}
            >
              <ConstructionIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} letterSpacing="-0.02em" color="text.primary">
              BuilderOps
            </Typography>
          </Box>

          {/* Welcome text */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
              {tab === 'signin' ? t('welcomeBack') : t('createAccount')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tab === 'signin' ? t('enterCredentials') : t('fillDetails')}
            </Typography>
          </Box>

          {/* Form Card */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            {/* Tabs */}
            <SegmentedTabs
              items={[
                { label: t('signIn'), value: 'signin' },
                { label: t('signUp'), value: 'signup' },
              ]}
              value={tab}
              onChange={handleTabChange}
            />

            {/* Alerts */}
            <Box sx={{ mt: 3 }}>
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
                        py: 1.75,
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        borderRadius: 2,
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
                          fontSize: '0.75rem',
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
                        py: 1.75,
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        borderRadius: 2,
                      }}
                    >
                      {t('signIn')}
                    </Button>
                  </Box>
                </form>

                {(googleConfigured || (webauthnAvailable && webauthnEmail)) && (
                  <Divider sx={{ my: 3 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ px: 2, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      {t('or')}
                    </Typography>
                  </Divider>
                )}

                {googleConfigured && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: webauthnAvailable && webauthnEmail ? 1.5 : 0, opacity: googleLoading ? 0.6 : 1 }}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError(t('googleSignInFailed'))}
                      size="large"
                      width="352"
                      text="signin_with"
                      shape="rectangular"
                      logo_alignment="center"
                    />
                  </Box>
                )}

                {webauthnAvailable && webauthnEmail && (
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
                )}
                </>
                )
              ) : (
                <>
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
                        py: 1.75,
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        borderRadius: 2,
                      }}
                    >
                      {t('createButton')}
                    </Button>
                  </Box>
                </form>

                {googleConfigured && (
                  <>
                    <Divider sx={{ my: 3 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ px: 2, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        {t('or')}
                      </Typography>
                    </Divider>
                    <Box sx={{ display: 'flex', justifyContent: 'center', opacity: googleLoading ? 0.6 : 1 }}>
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError(t('googleSignInFailed'))}
                        size="large"
                        width="352"
                        text="signup_with"
                        shape="rectangular"
                        logo_alignment="center"
                      />
                    </Box>
                  </>
                )}
                </>
              )}
            </Box>
          </Box>

          {/* Footer link */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {tab === 'signin' ? t('noAccount') : t('haveAccount')}{' '}
              <Link
                component="button"
                type="button"
                onClick={() => handleTabChange(tab === 'signin' ? 'signup' : 'signin')}
                underline="hover"
                sx={{ fontWeight: 700, cursor: 'pointer', color: 'primary.main' }}
              >
                {tab === 'signin' ? t('signUpLink') : t('signInLink')}
              </Link>
            </Typography>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
              {t('terms')}
            </Typography>
          </Box>
        </Box>
      </Fade>
    </Box>
  )
}
