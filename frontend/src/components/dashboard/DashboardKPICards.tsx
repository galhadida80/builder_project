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
              theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
            color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : 'text.primary',
            border: (theme) => theme.palette.mode === 'light' ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minHeight: { xs: 'auto', md: 72 },
          }}
        >
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : alpha(theme.palette.primary.main, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'primary.main' }}>
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
                sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : alpha(theme.palette.primary.main, 0.12), color: 'inherit', mt: 0.5 }}
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
              theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.12)} 0%, ${alpha(theme.palette.warning.main, 0.06)} 100%)`,
            color: (theme) => theme.palette.mode === 'dark' ? 'warning.contrastText' : 'text.primary',
            border: (theme) => theme.palette.mode === 'light' ? `1px solid ${alpha(theme.palette.warning.main, 0.2)}` : 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            minHeight: { xs: 'auto', md: 72 },
          }}
          onClick={() => selectedProjectId ? onNavigate(`/projects/${selectedProjectId}/tasks`) : onNavigate('/dashboard')}
        >
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : alpha(theme.palette.warning.main, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'warning.dark' }}>
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
              theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: (theme) => theme.palette.mode === 'light' ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
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
              color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : 'text.primary',
            }}
          >
            <Typography variant="overline" sx={{ opacity: 0.8, fontSize: '0.65rem', letterSpacing: 1.5, color: (theme) => theme.palette.mode === 'dark' ? 'inherit' : 'primary.main' }}>
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
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : alpha(theme.palette.primary.main, 0.15),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'primary.main',
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
