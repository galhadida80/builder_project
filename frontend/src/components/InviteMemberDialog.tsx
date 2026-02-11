import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { TextField } from './ui/TextField'
import { invitationsApi } from '../api/invitations'
import { ContentCopyIcon } from '@/icons'
import { Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Alert, Box, Typography, IconButton, InputAdornment, TextField as MuiTextField } from '@/mui'

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
}

const ROLES = ['project_admin', 'supervisor', 'consultant', 'contractor', 'inspector']

export default function InviteMemberDialog({ open, onClose, projectId }: InviteMemberDialogProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('contractor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await invitationsApi.create(projectId, { email, role })
      setInviteUrl(result.inviteUrl)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || t('invite.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setEmail('')
    setRole('contractor')
    setError(null)
    setInviteUrl(null)
    setCopied(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('invite.dialogTitle')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {inviteUrl ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>{t('invite.created')}</Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('invite.shareLink')}
            </Typography>
            <MuiTextField
              fullWidth
              value={inviteUrl}
              size="small"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleCopy} size="small">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {copied && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                {t('invite.copied')}
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label={t('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <MuiTextField
              fullWidth
              select
              label={t('invite.role')}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              size="small"
            >
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {t(`roles.${r}`, r.replace('_', ' '))}
                </MenuItem>
              ))}
            </MuiTextField>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="secondary" onClick={handleClose}>{t('close')}</Button>
        {!inviteUrl && (
          <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={!email}>
            {t('invite.sendButton')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
