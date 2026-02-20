import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { invitationsApi, InvitationValidation } from '../api/invitations'
import { ConstructionIcon, EmailIcon } from '@/icons'
import { Box, Typography, Alert, CircularProgress, Chip } from '@/mui'

export default function InvitePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState<InvitationValidation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(t('invite.invalidLink'))
      setLoading(false)
      return
    }
    invitationsApi.validate(token)
      .then(setInvitation)
      .catch((err) => {
        setError(err.response?.data?.detail || t('invite.invalidLink'))
      })
      .finally(() => setLoading(false))
  }, [token, t])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    setError(null)
    try {
      const result = await invitationsApi.accept(token)
      setSuccess(true)
      setTimeout(() => navigate(result.projectId ? `/projects/${result.projectId}/overview` : '/dashboard'), 1500)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || t('invite.acceptFailed'))
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          gap: 1,
        }}
      >
        <Box
          sx={{
            bgcolor: 'primary.main',
            p: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.contrastText',
          }}
        >
          <ConstructionIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em', color: 'text.primary' }}>
          BuilderOps
        </Typography>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, px: { xs: 2.5, sm: 4 }, pb: 5, maxWidth: 480, mx: 'auto', width: '100%' }}>
        {/* Invitation Card */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            p: 3,
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.08)',
            mb: 3,
          }}
        >
          {/* Icon + Title */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: (theme) => `${theme.palette.primary.main}1A`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <EmailIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            </Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('invite.title')}
            </Typography>
            {error && !invitation && (
              <Typography variant="body2" color="text.secondary">
                {error}
              </Typography>
            )}
          </Box>

          {error && invitation && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{t('invite.accepted')}</Alert>}

          {invitation && !success && (
            <>
              {/* Project details nested card */}
              <Box
                sx={{
                  bgcolor: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(15,23,42,0.5)'
                    : 'grey.50',
                  borderRadius: 2,
                  p: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <ConstructionIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>
                        {invitation.projectName}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={t(`roles.${invitation.role}`, { defaultValue: invitation.role.replace(/_/g, ' ') })}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      height: 24,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  />
                </Box>
              </Box>

              {/* Invitation email */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                {t('invite.forEmail')}: <strong>{invitation.email}</strong>
              </Typography>

              {/* Actions */}
              {user ? (
                user.email.toLowerCase() === invitation.email.toLowerCase() ? (
                  <Button
                    fullWidth
                    variant="primary"
                    onClick={handleAccept}
                    loading={accepting}
                    sx={{
                      py: 2,
                      fontWeight: 700,
                      borderRadius: 3,
                      fontSize: '1rem',
                    }}
                  >
                    {t('invite.acceptButton')}
                  </Button>
                ) : (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    {t('invite.emailMismatch')}
                  </Alert>
                )
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="primary"
                    onClick={() => navigate(`/login?invite=${token}&tab=signin`)}
                    sx={{ py: 2, fontWeight: 700, borderRadius: 3 }}
                  >
                    {t('signIn')}
                  </Button>
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => navigate(`/login?invite=${token}&tab=signup`)}
                    sx={{ py: 2, fontWeight: 700, borderRadius: 3 }}
                  >
                    {t('signUp')}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
