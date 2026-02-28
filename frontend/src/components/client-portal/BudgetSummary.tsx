import { useTranslation } from 'react-i18next'
import { Box, Typography, Paper, Skeleton, Divider, alpha } from '@/mui'
import {
  AttachMoneyIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AssessmentIcon,
  SwapHorizIcon,
} from '@/icons'
import type { ClientPortalBudgetSummary } from '@/api/clientPortal'

interface BudgetSummaryProps {
  budget: ClientPortalBudgetSummary | null
  loading?: boolean
  canView?: boolean
}

export function BudgetSummary({ budget, loading = false, canView = true }: BudgetSummaryProps) {
  const { t } = useTranslation()

  if (!canView) {
    return (
      <Paper
        sx={{
          borderRadius: 3,
          p: { xs: 2.5, sm: 3 },
          textAlign: 'center',
          bgcolor: 'action.hover',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            py: 3,
            color: 'text.secondary',
          }}
        >
          <AttachMoneyIcon sx={{ fontSize: '3rem', opacity: 0.3 }} />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {t('clientPortal.budgetNotVisible')}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
            {t('clientPortal.contactProjectManager')}
          </Typography>
        </Box>
      </Paper>
    )
  }

  if (loading || !budget) {
    return (
      <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Paper>
    )
  }

  const varianceIsPositive = budget.variancePercentage < 0
  const varianceColor = varianceIsPositive ? 'success.main' : 'error.main'

  return (
    <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 2.5,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.2)}, ${alpha(theme.palette.success.main, 0.08)})`,
            color: 'success.main',
            flexShrink: 0,
          }}
        >
          <AttachMoneyIcon sx={{ fontSize: '1.3rem' }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          {t('clientPortal.budgetSummary')}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2.5 }}>
        <BudgetCard
          label={t('clientPortal.budgeted')}
          value={budget.totalBudgeted}
          icon={<AssessmentIcon />}
          color="primary.main"
        />
        <BudgetCard
          label={t('clientPortal.actualSpent')}
          value={budget.totalActual}
          icon={<AttachMoneyIcon />}
          color="info.main"
        />
      </Box>

      <Divider sx={{ my: 2.5 }} />

      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem' }}>
            {t('clientPortal.variance')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {varianceIsPositive ? (
              <TrendingDownIcon sx={{ fontSize: '1.1rem', color: varianceColor }} />
            ) : (
              <TrendingUpIcon sx={{ fontSize: '1.1rem', color: varianceColor }} />
            )}
            <Typography variant="h6" sx={{ fontWeight: 700, color: varianceColor, fontSize: '1.1rem' }}>
              {budget.totalVariance}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: varianceColor,
                fontSize: '0.85rem',
              }}
            >
              ({varianceIsPositive ? '' : '+'}
              {Math.abs(budget.variancePercentage).toFixed(1)}%)
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: (theme) => alpha(varianceColor, 0.08),
            border: 1,
            borderColor: (theme) => alpha(varianceColor, 0.2),
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem', lineHeight: 1.5 }}>
            {varianceIsPositive
              ? t('clientPortal.underBudget')
              : t('clientPortal.overBudget')}
          </Typography>
        </Box>
      </Box>

      {budget.approvedChangeOrders > 0 && (
        <>
          <Divider sx={{ my: 2.5 }} />
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <SwapHorizIcon sx={{ fontSize: '1.1rem', color: 'warning.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {t('clientPortal.changeOrders')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                {budget.approvedChangeOrders}{' '}
                {budget.approvedChangeOrders === 1
                  ? t('clientPortal.changeOrder')
                  : t('clientPortal.changeOrdersPlural')}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {budget.totalChangeOrderAmount}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Paper>
  )
}

interface BudgetCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}

function BudgetCard({ label, value, icon, color }: BudgetCardProps) {
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: (theme) => alpha(color, 0.15),
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            '& svg': { fontSize: '1rem' },
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          fontSize: { xs: '1.5rem', sm: '1.75rem' },
          color: 'text.primary',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}
