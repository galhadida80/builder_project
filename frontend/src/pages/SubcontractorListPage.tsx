import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/common/ToastProvider'
import { subcontractorsApi, SubcontractorProfile } from '../api/subcontractors'
import {
  Box,
  Typography,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
  TextField as MuiTextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@/mui'
import { CheckCircleIcon, SearchIcon, PersonIcon, PersonAddIcon } from '@/icons'

const TRADES = [
  'plumbing', 'electrical', 'hvac', 'concrete', 'framing', 'drywall',
  'painting', 'roofing', 'flooring', 'landscaping', 'general',
]

export default function SubcontractorListPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()

  const [profiles, setProfiles] = useState<SubcontractorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [tradeFilter, setTradeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteData, setInviteData] = useState({ email: '', trade: '', company_name: '', message: '' })
  const [inviteSending, setInviteSending] = useState(false)

  const loadData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await subcontractorsApi.list(projectId, tradeFilter || undefined)
      setProfiles(data)
    } catch {
      showError(t('subcontractors.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [projectId, tradeFilter, showError, t])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleVerify = async (profileId: string) => {
    try {
      await subcontractorsApi.toggleVerify(profileId)
      showSuccess(t('subcontractors.verifyToggled'))
      loadData()
    } catch {
      showError(t('subcontractors.verifyFailed'))
    }
  }

  const handleInvite = async () => {
    if (!projectId || !inviteData.email || !inviteData.trade || !inviteData.company_name) return
    setInviteSending(true)
    try {
      await subcontractorsApi.invite(projectId, {
        email: inviteData.email,
        trade: inviteData.trade,
        company_name: inviteData.company_name,
        message: inviteData.message || undefined,
      })
      showSuccess(t('subcontractors.inviteSuccess'))
      setInviteOpen(false)
      setInviteData({ email: '', trade: '', company_name: '', message: '' })
    } catch {
      showError(t('subcontractors.inviteFailed'))
    } finally {
      setInviteSending(false)
    }
  }

  const filtered = profiles.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.companyName.toLowerCase().includes(q) || p.trade.toLowerCase().includes(q)
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <PageHeader title={t('subcontractors.title')} subtitle={t('subcontractors.subtitle')} />
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteOpen(true)}
          sx={{ whiteSpace: 'nowrap', mt: 1 }}
        >
          {t('subcontractors.invite')}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <MuiTextField
          size="small"
          placeholder={t('subcontractors.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ flex: 1 }}
        />
        <MuiTextField
          select
          size="small"
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          sx={{ minWidth: 160 }}
          label={t('subcontractors.trade')}
        >
          <MenuItem value="">{t('subcontractors.allTrades')}</MenuItem>
          {TRADES.map(tr => (
            <MenuItem key={tr} value={tr}>{t(`subcontractors.trades.${tr}`)}</MenuItem>
          ))}
        </MuiTextField>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card sx={{ flex: 1, p: 2, textAlign: 'center' }}>
          <Typography variant="h4">{profiles.length}</Typography>
          <Typography variant="body2" color="text.secondary">{t('subcontractors.total')}</Typography>
        </Card>
        <Card sx={{ flex: 1, p: 2, textAlign: 'center' }}>
          <Typography variant="h4">{profiles.filter(p => p.isVerified).length}</Typography>
          <Typography variant="body2" color="text.secondary">{t('subcontractors.verified')}</Typography>
        </Card>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={60} />)}
        </Box>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<PersonIcon />} title={t('subcontractors.noSubcontractors')} description={t('subcontractors.noSubcontractorsDescription')} />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('subcontractors.companyName')}</TableCell>
                  <TableCell>{t('subcontractors.trade')}</TableCell>
                  <TableCell>{t('subcontractors.contactEmail')}</TableCell>
                  <TableCell>{t('subcontractors.contactPhone')}</TableCell>
                  <TableCell>{t('subcontractors.status')}</TableCell>
                  <TableCell align="right">{t('subcontractors.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(profile => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <Typography fontWeight={500}>{profile.companyName}</Typography>
                      {profile.user && (
                        <Typography variant="caption" color="text.secondary">
                          {profile.user.fullName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={t(`subcontractors.trades.${profile.trade}`, profile.trade)} size="small" />
                    </TableCell>
                    <TableCell>{profile.contactEmail || '-'}</TableCell>
                    <TableCell>{profile.contactPhone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={profile.isVerified ? t('subcontractors.verified') : t('subcontractors.unverified')}
                        color={profile.isVerified ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('subcontractors.toggleVerify')}>
                        <IconButton size="small" onClick={() => handleToggleVerify(profile.id)}>
                          <CheckCircleIcon color={profile.isVerified ? 'success' : 'disabled'} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('subcontractors.invite')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <MuiTextField
            label={t('subcontractors.inviteEmail')}
            type="email"
            required
            size="small"
            value={inviteData.email}
            onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
          />
          <MuiTextField
            select
            label={t('subcontractors.inviteTrade')}
            required
            size="small"
            value={inviteData.trade}
            onChange={(e) => setInviteData(prev => ({ ...prev, trade: e.target.value }))}
          >
            {TRADES.map(tr => (
              <MenuItem key={tr} value={tr}>{t(`subcontractors.trades.${tr}`)}</MenuItem>
            ))}
          </MuiTextField>
          <MuiTextField
            label={t('subcontractors.inviteCompany')}
            required
            size="small"
            value={inviteData.company_name}
            onChange={(e) => setInviteData(prev => ({ ...prev, company_name: e.target.value }))}
          />
          <MuiTextField
            label={t('subcontractors.inviteMessage')}
            size="small"
            multiline
            rows={3}
            value={inviteData.message}
            onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInviteOpen(false)} disabled={inviteSending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={inviteSending || !inviteData.email || !inviteData.trade || !inviteData.company_name}
          >
            {inviteSending ? t('subcontractors.inviteSending') : t('subcontractors.invite')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
