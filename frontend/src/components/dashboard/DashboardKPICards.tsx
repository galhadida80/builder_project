import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { BusinessIcon, CheckCircleIcon, ErrorOutlineIcon } from '@/icons'
import { Box, Typography, Paper, LinearProgress, alpha, Chip } from '@/mui'
import type { ApprovalRequest, Project } from '../../types'

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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 2.5 }, maxWidth: { md: 600 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'primary.contrastText',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minHeight: { xs: 'auto', md: 72 },
          }}
        >
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BusinessIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem', display: 'block' }}>
              {t('dashboard.activeProjects')}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {activeProjects.length}
            </Typography>
            {activeProjects.length > 0 && (
              <Chip
                label={`+${activeProjects.length} ${t('dashboard.newThisMonth')}`}
                size="small"
                sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', mt: 0.5 }}
              />
            )}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
            color: 'warning.contrastText',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            minHeight: { xs: 'auto', md: 72 },
          }}
          onClick={() => selectedProjectId ? onNavigate(`/projects/${selectedProjectId}/tasks`) : onNavigate('/dashboard')}
        >
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircleIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem', display: 'block' }}>
              {t('dashboard.pendingApprovals')}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {pendingApprovals.length}
            </Typography>
          </Box>
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
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            maxWidth: { md: 600 },
          }}
          onClick={() => onNavigate(`/projects/${selectedProjectId}`)}
        >
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              position: 'relative',
              zIndex: 1,
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="overline" sx={{ opacity: 0.8, fontSize: '0.65rem', letterSpacing: 1.5 }}>
              {t('dashboard.featuredProject')}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {selectedProject.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={projectProgress}
                  sx={{
                    height: 5,
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
