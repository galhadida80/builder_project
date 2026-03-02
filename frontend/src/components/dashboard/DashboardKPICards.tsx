import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { BusinessIcon, CheckCircleIcon, ErrorOutlineIcon } from '@/icons'
import { Box, Typography, Paper, LinearProgress, alpha, Chip } from '@/mui'
import type { ApprovalRequest, Project } from '../../types'
import type { DashboardStats } from '../../api/dashboardStats'

interface DashboardKPICardsProps {
  activeProjects: Project[]
  pendingApprovals: ApprovalRequest[]
  criticalDefectsCount: number
  selectedProjectId: string | undefined
  selectedProject: Project | null
  projectProgress: number
  onNavigate: (path: string) => void
}

export default function DashboardKPICards({
  activeProjects,
  pendingApprovals,
  criticalDefectsCount,
  selectedProjectId,
  selectedProject,
  projectProgress,
  onNavigate,
}: DashboardKPICardsProps) {
  const { t } = useTranslation()

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 2.5 } }}>
        {/* Active Projects */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'primary.contrastText',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              opacity: 0.15,
            }}
          >
            <BusinessIcon sx={{ fontSize: 72 }} />
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem' }}>
            {t('dashboard.activeProjects')}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {activeProjects.length}
          </Typography>
          {activeProjects.length > 0 && (
            <Chip
              label={`+${activeProjects.length} ${t('dashboard.newThisMonth')}`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
                alignSelf: 'flex-start',
              }}
            />
          )}
        </Paper>

        {/* Pending Approvals */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
            color: 'warning.contrastText',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            cursor: 'pointer',
          }}
          onClick={() => selectedProjectId ? onNavigate(`/projects/${selectedProjectId}/tasks`) : onNavigate('/dashboard')}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              opacity: 0.15,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 72 }} />
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem' }}>
            {t('dashboard.pendingApprovals')}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {pendingApprovals.length}
          </Typography>
        </Paper>
      </Box>

      {/* Critical Alert Banner */}
      {criticalDefectsCount > 0 && selectedProjectId && (
        <Paper
          elevation={0}
          sx={{
            mb: { xs: 2, md: 2.5 },
            p: 2,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
            borderInlineStart: 4,
            borderColor: 'error.main',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 24 }} />
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ color: 'error.main' }}>
                {t('dashboard.criticalDefects')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'error.main', opacity: 0.85 }}>
                {t('dashboard.requiresImmediate', { count: criticalDefectsCount })}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="primary"
            size="small"
            sx={{
              bgcolor: 'error.main',
              color: 'error.contrastText',
              '&:hover': { bgcolor: 'error.dark' },
              flexShrink: 0,
            }}
            onClick={() => onNavigate(`/projects/${selectedProjectId}/defects?severity=critical`)}
          >
            {t('dashboard.view')}
          </Button>
        </Paper>
      )}

      {/* Featured Project Banner */}
      {selectedProject && (
        <Paper
          elevation={0}
          sx={{
            mb: { xs: 2, md: 2.5 },
            p: 0,
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            minHeight: 120,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
          onClick={() => onNavigate(`/projects/${selectedProjectId}`)}
        >
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              position: 'relative',
              zIndex: 1,
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="overline" sx={{ opacity: 0.8, fontSize: '0.65rem', letterSpacing: 1.5 }}>
              {t('dashboard.featuredProject')}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              {selectedProject.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={projectProgress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'rgba(255,255,255,0.9)',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9 }}>
                {projectProgress}% {t('dashboard.completed')}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </>
  )
}
