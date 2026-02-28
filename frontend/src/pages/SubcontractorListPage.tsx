import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KPICard, Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { SearchField, TextField } from '../components/ui/TextField'
import FilterChips from '../components/ui/FilterChips'
import { FormModal } from '../components/ui/Modal'
import { useToast } from '../components/common/ToastProvider'
import { subcontractorsApi, SubcontractorProfile } from '../api/subcontractors'
import {
  Box,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Fab,
  useTheme,
  useMediaQuery,
} from '@/mui'
import { CheckCircleIcon, PersonIcon, PersonAddIcon } from '@/icons'

const TRADES = [
  'plumbing', 'electrical', 'hvac', 'concrete', 'framing', 'drywall',
  'painting', 'roofing', 'flooring', 'landscaping', 'general',
]

export default function SubcontractorListPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

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
        {!isMobile && (
          <Button
            icon={<PersonAddIcon />}
            onClick={() => setInviteOpen(true)}
            sx={{ whiteSpace: 'nowrap', mt: 1 }}
          >
            {t('subcontractors.invite')}
          </Button>
        )}
      </Box>

      <SearchField
        placeholder={t('subcontractors.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      <FilterChips
        items={[
          { label: t('subcontractors.allTrades'), value: '' },
          ...TRADES.map(tr => ({ label: t(`subcontractors.trades.${tr}`), value: tr })),
        ]}
        value={tradeFilter}
        onChange={setTradeFilter}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3, mt: 2 }}>
        <KPICard title={t('subcontractors.total')} value={profiles.length} color="primary" />
        <KPICard title={t('subcontractors.verified')} value={profiles.filter(p => p.isVerified).length} color="success" />
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
                        <IconButton aria-label={t('subcontractors.toggleVerify')} size="small" onClick={() => handleToggleVerify(profile.id)}>
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

      <FormModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
        title={t('subcontractors.invite')}
        submitLabel={inviteSending ? t('subcontractors.inviteSending') : t('subcontractors.invite')}
        loading={inviteSending}
        submitDisabled={!inviteData.email || !inviteData.trade || !inviteData.company_name}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('subcontractors.inviteEmail')}
            type="email"
            required
            value={inviteData.email}
            onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
          />
          <TextField
            select
            label={t('subcontractors.inviteTrade')}
            required
            value={inviteData.trade}
            onChange={(e) => setInviteData(prev => ({ ...prev, trade: e.target.value }))}
          >
            {TRADES.map(tr => (
              <MenuItem key={tr} value={tr}>{t(`subcontractors.trades.${tr}`)}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('subcontractors.inviteCompany')}
            required
            value={inviteData.company_name}
            onChange={(e) => setInviteData(prev => ({ ...prev, company_name: e.target.value }))}
          />
          <TextField
            label={t('subcontractors.inviteMessage')}
            multiline
            rows={3}
            value={inviteData.message}
            onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
          />
        </Box>
      </FormModal>

      {isMobile && (
        <Fab
          color="primary"
          onClick={() => setInviteOpen(true)}
          sx={{ position: 'fixed', bottom: 80, insetInlineEnd: 16, zIndex: 10 }}
        >
          <PersonAddIcon />
        </Fab>
      )}
    </Box>
  )
}
