import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../ui/EmptyState'
import { TeamMemberCard, type TeamMember } from '../TeamMemberCard'
import { teamMembersApi } from '../../api/teamMembers'
import { subscriptionsApi } from '../../api/subscriptions'
import { billingApi } from '../../api/billing'
import { useToast } from '../common/ToastProvider'
import { GroupIcon, PersonAddIcon, DeleteIcon } from '@/icons'
import {
  Box,
  Typography,
  Skeleton,
  Grid,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  Chip,
} from '@/mui'
import type { Subscription } from '../../types'

export function SeatManager() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [members, currentSub] = await Promise.all([
        teamMembersApi.list(),
        subscriptionsApi.getCurrentSubscription(),
      ])
      setTeamMembers(members)
      setSubscription(currentSub)
    } catch (error) {
      showError(t('billing.seats.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddSeat = async () => {
    try {
      showSuccess(t('billing.seats.addedSuccessfully'))
      await loadData()
    } catch (error) {
      showError(t('billing.seats.failedToAdd'))
    }
  }

  const handleRemoveSeat = async () => {
    if (!selectedMember) return

    try {
      setRemoving(true)
      await billingApi.removeSeat(selectedMember.id)
      showSuccess(t('billing.seats.removedSuccessfully'))
      setRemoveDialogOpen(false)
      setSelectedMember(null)
      await loadData()
    } catch (error) {
      showError(t('billing.seats.failedToRemove'))
    } finally {
      setRemoving(false)
    }
  }

  const openRemoveDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setRemoveDialogOpen(true)
  }

  const closeRemoveDialog = () => {
    setRemoveDialogOpen(false)
    setSelectedMember(null)
  }

  const currentSeats = teamMembers.length
  const maxSeats = subscription?.plan?.maxUsers
  const isAtLimit = maxSeats !== undefined && currentSeats >= maxSeats
  const usagePercentage = maxSeats ? (currentSeats / maxSeats) * 100 : 0

  const getProgressColor = () => {
    if (usagePercentage >= 90) return 'error'
    if (usagePercentage >= 75) return 'warning'
    return 'primary'
  }

  const getSeatCost = () => {
    if (!subscription?.plan) return 0
    const basePrice =
      subscription.billingCycle === 'monthly'
        ? subscription.plan.monthlyPrice
        : subscription.plan.annualPrice / 12
    return Math.round(basePrice * 0.2)
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 3, borderRadius: 3 }} />
        <Grid container spacing={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          {t('billing.seats.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('billing.seats.subtitle')}
        </Typography>
      </Box>

      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {t('billing.seats.usageTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {maxSeats
                  ? t('billing.seats.usageCount', { current: currentSeats, max: maxSeats })
                  : t('billing.seats.unlimitedSeats', { current: currentSeats })}
              </Typography>
            </Box>
            {isAtLimit && (
              <Chip
                label={t('billing.seats.limitReached')}
                color="error"
                size="small"
                sx={{ fontWeight: 500 }}
              />
            )}
          </Box>

          {maxSeats && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(usagePercentage, 100)}
                color={getProgressColor()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'action.hover',
                }}
              />
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
            }}
          >
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleAddSeat}
              disabled={isAtLimit}
              sx={{ flex: { xs: 1, sm: 'initial' } }}
            >
              {t('billing.seats.addSeat')}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
              {t('billing.seats.costPerSeat', {
                amount: getSeatCost(),
                currency: subscription?.billingCycle === 'monthly' ? 'month' : 'year',
              })}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {teamMembers.length > 0 ? (
        <Grid container spacing={3}>
          {teamMembers.map((member) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
              <Box sx={{ position: 'relative' }}>
                <TeamMemberCard member={member} />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                >
                  <Button
                    size="small"
                    color="error"
                    onClick={() => openRemoveDialog(member)}
                    sx={{
                      minWidth: 'auto',
                      p: 1,
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'white',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState
          title={t('billing.seats.noSeats')}
          description={t('billing.seats.noSeatsDescription')}
          icon={<GroupIcon sx={{ color: 'text.secondary' }} />}
          action={{
            label: t('billing.seats.addFirstSeat'),
            onClick: handleAddSeat,
          }}
        />
      )}

      <Dialog open={removeDialogOpen} onClose={closeRemoveDialog}>
        <DialogTitle>{t('billing.seats.removeDialogTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('billing.seats.removeDialogMessage', { name: selectedMember?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRemoveDialog} disabled={removing}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleRemoveSeat} color="error" variant="contained" disabled={removing}>
            {removing ? t('common.removing') : t('common.remove')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
