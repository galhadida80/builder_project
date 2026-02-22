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
} from '@/mui'
import { CheckCircleIcon, SearchIcon, PersonIcon } from '@/icons'

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

  const filtered = profiles.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.companyName.toLowerCase().includes(q) || p.trade.toLowerCase().includes(q)
  })

  return (
    <Box>
      <PageHeader title={t('subcontractors.title')} subtitle={t('subcontractors.subtitle')} />

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
    </Box>
  )
}
