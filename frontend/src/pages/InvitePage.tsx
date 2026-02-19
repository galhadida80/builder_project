import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { invitationsApi, InvitationValidation } from '../api/invitations'
import { ConstructionIcon, GroupAddIcon } from '@/icons'
import { Box, Typography, Alert, CircularProgress, Card, CardContent, Chip } from '@/mui'

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: 2, bgcolor: 'primary.main',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', mb: 2,
              }}
            >
              <GroupAddIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {t('invite.title')}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{t('invite.accepted')}</Alert>}

          {invitation && !success && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                <ConstructionIcon color="primary" />
                <Typography variant="h6">{invitation.projectName}</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('invite.invitedAs')}
              </Typography>
              <Chip label={t(`roles.${invitation.role}`, { defaultValue: invitation.role.replace(/_/g, ' ') })} color="primary" sx={{ mb: 2, textTransform: 'capitalize' }} />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('invite.forEmail')}: <strong>{invitation.email}</strong>
              </Typography>

              {user ? (
                user.email.toLowerCase() === invitation.email.toLowerCase() ? (
                  <Button
                    fullWidth
                    variant="primary"
                    onClick={handleAccept}
                    loading={accepting}
                    sx={{ py: 1.5 }}
                  >
                    {t('invite.acceptButton')}
                  </Button>
                ) : (
                  <Alert severity="warning">
                    {t('invite.emailMismatch')}
                  </Alert>
                )
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="primary"
                    onClick={() => navigate(`/login?invite=${token}&tab=signin`)}
                    sx={{ py: 1.5 }}
                  >
                    {t('signIn')}
                  </Button>
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => navigate(`/login?invite=${token}&tab=signup`)}
                    sx={{ py: 1.5 }}
                  >
                    {t('signUp')}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
