import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { ConstructionIcon, EmailIcon, LockIcon } from '@/icons'
import { Box, Typography, Alert, Fade } from '@/mui'

export default function ClientPortalLoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(false)
  const submittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // TODO: Implement client portal authentication
      // await clientPortalApi.authenticate({ email, accessToken })

      // For now, placeholder navigation
      console.log('Client portal login:', { email, accessToken })

      // Navigate to client portal dashboard
      // navigate('/client-portal/dashboard')

      setError('Authentication not yet implemented - please check back soon')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || t('auth.invalidCredentials', 'Invalid credentials'))
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
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('clientPortal.title', 'Client Portal')}
            </Typography>
          </Box>

          {/* Welcome text */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
              {t('clientPortal.welcomeTitle', 'Welcome')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('clientPortal.welcomeSubtitle', 'Access your project progress and updates')}
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
            {/* Alerts */}
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2.5, borderRadius: 2 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth
                  label={t('clientPortal.email', 'Email')}
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
                  label={t('clientPortal.accessToken', 'Access Token')}
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  required
                  autoComplete="off"
                  helperText={t('clientPortal.accessTokenHelp', 'Enter the access token provided by your project manager')}
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
                  {t('clientPortal.signIn', 'Access Portal')}
                </Button>
              </Box>
            </form>

            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                {t('clientPortal.helpText', 'Need help? Contact your project manager for access credentials.')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
              {t('clientPortal.footer', 'Protected portal for authorized clients only')}
            </Typography>
          </Box>
        </Box>
      </Fade>
    </Box>
  )
}
