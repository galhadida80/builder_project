import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { authApi } from '../api/auth'
import { LockIcon, VisibilityIcon, VisibilityOffIcon, ConstructionIcon } from '@/icons'
import { Box, Typography, Alert, Link, Fade, IconButton } from '@/mui'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(t('passwordsMismatch'))
      return
    }
    if (password.length < 8) {
      setError(t('passwordMinLength'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } }
      setError(apiErr.response?.data?.detail || t('invalidResetToken'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Fade in timeout={400}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
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

          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5, textAlign: 'center' }}>
            {t('resetPassword')}
          </Typography>

          <Box sx={{ mt: 3 }}>
            {success ? (
              <Box sx={{ textAlign: 'center' }}>
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                  {t('passwordResetSuccess')}
                </Alert>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  fontWeight={600}
                  onClick={() => navigate('/login')}
                  sx={{ cursor: 'pointer' }}
                >
                  {t('signIn')}
                </Link>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {error && (
                    <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>
                      {error}
                      {error === t('invalidResetToken') && (
                        <Box sx={{ mt: 1 }}>
                          <Link
                            component="button"
                            type="button"
                            variant="caption"
                            fontWeight={600}
                            onClick={() => navigate('/login')}
                            sx={{ cursor: 'pointer' }}
                          >
                            {t('requestNewLink')}
                          </Link>
                        </Box>
                      )}
                    </Alert>
                  )}
                  <TextField
                    fullWidth
                    label={t('newPassword')}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                    helperText={t('atLeast8Chars')}
                    startIcon={<LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                    endIcon={
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: 'text.disabled' }}
                      >
                        {showPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
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
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(3, 105, 161, 0.3)',
                    }}
                  >
                    {t('resetPassword')}
                  </Button>
                </Box>
              </form>
            )}
          </Box>
        </Box>
      </Fade>
    </Box>
  )
}
