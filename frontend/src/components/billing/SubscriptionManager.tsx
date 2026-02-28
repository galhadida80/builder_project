import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, Button, Chip, LinearProgress, CircularProgress, Divider, useTheme, Grid, alpha } from '@/mui'
import { CheckCircleIcon, WarningIcon, CancelIcon, TrendingUpIcon, InfoIcon } from '@/icons'
import { subscriptionsApi } from '@/api/subscriptions'
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '@/types/subscription'
import { useToast } from '../common/ToastProvider'
import { getDateLocale } from '../../utils/dateLocale'

interface UsageStats {
  currentUsers: number
  currentProjects: number
  currentStorageGb: number
}

interface SubscriptionManagerProps {
  organizationId?: string
  usageStats?: UsageStats
  onUpgrade?: () => void
  onCancel?: () => void
}

export function SubscriptionManager({
  organizationId,
  usageStats = { currentUsers: 0, currentProjects: 0, currentStorageGb: 0 },
  onUpgrade,
  onCancel,
}: SubscriptionManagerProps) {
  const navigate = useNavigate()
  const theme = useTheme()
  const { showSuccess, showError } = useToast()
  const isRtl = theme.direction === 'rtl'

  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [cancelLoading, setCancelLoading] = useState(false)

  useEffect(() => {
    loadSubscription()
  }, [organizationId])

  const loadSubscription = async () => {
    try {
      setLoading(true)
      const [currentSub, availablePlans] = await Promise.all([
        subscriptionsApi.getCurrentSubscription(),
        subscriptionsApi.getPlans(),
      ])
      setSubscription(currentSub)
      setPlans(availablePlans)
    } catch (error) {
      showError('שגיאה בטעינת פרטי המנוי')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך לבטל את המנוי? הביטול ייכנס לתוקף בסוף תקופת החיוב הנוכחית.')) {
      return
    }

    try {
      setCancelLoading(true)
      await subscriptionsApi.cancel({ immediate: false })
      showSuccess('המנוי בוטל בהצלחה')
      await loadSubscription()
      onCancel?.()
    } catch (error) {
      showError('שגיאה בביטול המנוי')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleUpgradeClick = () => {
    onUpgrade?.()
    navigate('/pricing')
  }

  const getStatusColor = (status: SubscriptionStatus): 'success' | 'warning' | 'error' | 'info' => {
    if (status === 'active') return 'success'
    if (status === 'trial') return 'info'
    if (status === 'past_due') return 'warning'
    return 'error'
  }

  const getStatusLabel = (status: SubscriptionStatus): string => {
    if (status === 'active') return 'פעיל'
    if (status === 'trial') return 'תקופת ניסיון'
    if (status === 'past_due') return 'תשלום ממתין'
    return 'מבוטל'
  }

  const getStatusIcon = (status: SubscriptionStatus) => {
    if (status === 'active') return <CheckCircleIcon sx={{ fontSize: '1rem' }} />
    if (status === 'trial') return <InfoIcon sx={{ fontSize: '1rem' }} />
    if (status === 'past_due') return <WarningIcon sx={{ fontSize: '1rem' }} />
    return <CancelIcon sx={{ fontSize: '1rem' }} />
  }

  const calculateTrialDaysRemaining = (): number | null => {
    if (!subscription?.trialEndsAt) return null
    const now = new Date()
    const trialEnd = new Date(subscription.trialEndsAt)
    const diff = trialEnd.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const calculateUsagePercentage = (current: number, max?: number): number => {
    if (!max) return 0
    return Math.min((current / max) * 100, 100)
  }

  const getUsageColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage < 75) return 'success'
    if (percentage < 90) return 'warning'
    return 'error'
  }

  const currentPlan = plans.find(p => p.id === subscription?.planId)
  const trialDaysRemaining = calculateTrialDaysRemaining()
  const isTrial = subscription?.status === 'trial'
  const isCanceled = subscription?.status === 'canceled'
  const canUpgrade = !isCanceled && currentPlan?.tier !== 'enterprise'
  const canCancel = !isCanceled && subscription?.status !== 'past_due'

  const usersPercentage = calculateUsagePercentage(usageStats.currentUsers, currentPlan?.maxUsers)
  const projectsPercentage = calculateUsagePercentage(usageStats.currentProjects, currentPlan?.maxProjects)
  const storagePercentage = calculateUsagePercentage(usageStats.currentStorageGb, currentPlan?.maxStorageGb)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!subscription || !currentPlan) {
    return (
      <Paper sx={{ borderRadius: 3, p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          אין מנוי פעיל
        </Typography>
        <Button variant="contained" onClick={() => navigate('/pricing')}>
          בחר תוכנית
        </Button>
      </Paper>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Current Plan Card */}
      <Paper
        sx={{
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          border: 2,
          borderColor: subscription.status === 'active' ? 'success.main' : 'divider',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {currentPlan.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentPlan.description}
            </Typography>
          </Box>
          <Chip
            icon={getStatusIcon(subscription.status)}
            label={getStatusLabel(subscription.status)}
            color={getStatusColor(subscription.status)}
            sx={{ fontWeight: 600 }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              מחיר חודשי
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              ₪{subscription.billingCycle === 'monthly' ? currentPlan.monthlyPrice : Math.round(currentPlan.annualPrice / 12)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subscription.billingCycle === 'monthly' ? 'חיוב חודשי' : 'חיוב שנתי'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              תקופת חיוב נוכחית
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {new Date(subscription.currentPeriodStart).toLocaleDateString(getDateLocale())}
              {' - '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString(getDateLocale())}
            </Typography>
          </Grid>
        </Grid>

        {/* Trial Period Countdown */}
        {isTrial && trialDaysRemaining !== null && (
          <Box
            sx={{
              bgcolor: alpha(theme.palette.info.main, 0.1),
              border: 1,
              borderColor: 'info.main',
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <InfoIcon sx={{ color: 'info.main', fontSize: '1.25rem' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.main' }}>
                תקופת ניסיון
              </Typography>
            </Box>
            <Typography variant="body2" color="text.primary">
              נותרו {trialDaysRemaining} ימים בתקופת הניסיון החינמית
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              לאחר תום תקופת הניסיון, תחויב בהתאם לתוכנית שבחרת
            </Typography>
          </Box>
        )}

        {/* Canceled Notice */}
        {isCanceled && subscription.canceledAt && (
          <Box
            sx={{
              bgcolor: alpha(theme.palette.error.main, 0.1),
              border: 1,
              borderColor: 'error.main',
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CancelIcon sx={{ color: 'error.main', fontSize: '1.25rem' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main' }}>
                המנוי בוטל
              </Typography>
            </Box>
            <Typography variant="body2" color="text.primary">
              המנוי יסתיים ב-{new Date(subscription.currentPeriodEnd).toLocaleDateString(getDateLocale())}
            </Typography>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {canUpgrade && (
            <Button
              variant="contained"
              onClick={handleUpgradeClick}
              startIcon={<TrendingUpIcon />}
              sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
            >
              שדרג תוכנית
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancel}
              disabled={cancelLoading}
              sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
            >
              {cancelLoading ? 'מבטל...' : 'בטל מנוי'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Usage Stats Card */}
      <Paper sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          שימוש נוכחי
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Users Usage */}
          {currentPlan.maxUsers && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  משתמשים
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {usageStats.currentUsers} / {currentPlan.maxUsers}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={usersPercentage}
                color={getUsageColor(usersPercentage)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* Projects Usage */}
          {currentPlan.maxProjects && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  פרויקטים
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {usageStats.currentProjects} / {currentPlan.maxProjects}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={projectsPercentage}
                color={getUsageColor(projectsPercentage)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* Storage Usage */}
          {currentPlan.maxStorageGb && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  אחסון
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {usageStats.currentStorageGb.toFixed(1)} / {currentPlan.maxStorageGb} GB
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={storagePercentage}
                color={getUsageColor(storagePercentage)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </Box>

        {(usersPercentage >= 90 || projectsPercentage >= 90 || storagePercentage >= 90) && (
          <Box
            sx={{
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              border: 1,
              borderColor: 'warning.main',
              borderRadius: 2,
              p: 2,
              mt: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon sx={{ color: 'warning.main', fontSize: '1.25rem' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                אתה מתקרב למגבלת התוכנית שלך
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              שקול לשדרג לתוכנית גבוהה יותר
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
