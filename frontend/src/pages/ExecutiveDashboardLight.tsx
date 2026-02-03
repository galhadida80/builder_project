import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { styled } from '@mui/material/styles'
import { KPICard } from '../components/ui/Card'

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  background: theme.palette.background.paper,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 200ms ease-out',
  '&:hover': {
    boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
  },
}))

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  background: theme.palette.background.paper,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  minHeight: 300,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
}))

interface KPIData {
  title: string
  value: number
  trend: number
  trendLabel: string
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'error' | 'info'
}

export default function ExecutiveDashboardLight() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [kpiData, setKpiData] = useState<KPIData[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setKpiData([
        {
          title: 'Total Projects',
          value: 24,
          trend: 12,
          trendLabel: 'vs last month',
          icon: <DashboardIcon fontSize="small" />,
          color: 'primary',
        },
        {
          title: 'Active Teams',
          value: 156,
          trend: 8,
          trendLabel: 'vs last month',
          icon: <PeopleIcon fontSize="small" />,
          color: 'info',
        },
        {
          title: 'Completed Tasks',
          value: 1243,
          trend: 15,
          trendLabel: 'vs last month',
          icon: <CheckCircleIcon fontSize="small" />,
          color: 'success',
        },
        {
          title: 'Pending Approvals',
          value: 42,
          trend: -22,
          trendLabel: 'vs last month',
          icon: <AssignmentIcon fontSize="small" />,
          color: 'warning',
        },
      ])
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          {[...Array(2)].map((_, i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
          Executive Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Key performance indicators and project overview
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiData.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <KPICard
              title={kpi.title}
              value={kpi.value}
              trend={kpi.trend}
              trendLabel={kpi.trendLabel}
              icon={kpi.icon}
              color={kpi.color}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ChartContainer>
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Project Progress Overview
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  width: '100%',
                  alignItems: 'stretch',
                }}
              >
                {['Project A', 'Project B', 'Project C'].map((project, idx) => {
                  const progress = [75, 60, 85][idx]
                  return (
                    <Box key={project}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {project}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {progress}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 8,
                          bgcolor: '#e2e8f0',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${progress}%`,
                            bgcolor: '#0369a1',
                            transition: 'width 300ms ease-out',
                          }}
                        />
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          </ChartContainer>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartContainer>
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Team Performance
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  width: '100%',
                }}
              >
                {[
                  { label: 'On Time', value: 92, color: '#22c55e' },
                  { label: 'At Risk', value: 8, color: '#eab308' },
                  { label: 'Quality Score', value: 94, color: '#0369a1' },
                  { label: 'Efficiency', value: 87, color: '#8b5cf6' },
                ].map((metric) => (
                  <StyledPaper key={metric.label}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                      {metric.label}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: metric.color,
                      }}
                    >
                      {metric.value}%
                    </Typography>
                  </StyledPaper>
                ))}
              </Box>
            </Box>
          </ChartContainer>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <ChartContainer>
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1e293b' }}>
                Monthly Trend
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'flex-end',
                  gap: 2,
                  height: 200,
                  width: '100%',
                }}
              >
                {[65, 78, 72, 85, 92, 88, 95, 102].map((height, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: `${(height / 120) * 100}%`,
                      bgcolor: '#0369a1',
                      borderRadius: '4px 4px 0 0',
                      opacity: 0.7 + (height / 150) * 0.3,
                      transition: 'all 200ms ease-out',
                      '&:hover': {
                        opacity: 1,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((month) => (
                  <Typography key={month} variant="caption" sx={{ color: '#64748b' }}>
                    {month}
                  </Typography>
                ))}
              </Box>
            </Box>
          </ChartContainer>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartContainer>
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Resource Allocation
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: 'Engineering', value: 45 },
                  { label: 'Design', value: 25 },
                  { label: 'QA', value: 20 },
                  { label: 'Other', value: 10 },
                ].map((item) => (
                  <Box key={item.label}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">{item.label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.value}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        bgcolor: '#e2e8f0',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${item.value}%`,
                          bgcolor: '#0369a1',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </ChartContainer>
        </Grid>
      </Grid>
    </Box>
  )
}
