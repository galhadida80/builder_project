import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import SecurityIcon from '@mui/icons-material/Security'
import CloudSyncIcon from '@mui/icons-material/CloudSync'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { styled } from '@mui/material/styles'

const BentoCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: 280,
  background: theme.palette.background.paper,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 300ms ease-out',
  border: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, transparent 0%, rgba(3, 105, 161, 0.1) 100%)',
    opacity: 0,
    transition: 'opacity 300ms ease-out',
    pointerEvents: 'none',
  },
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
    '&:before': {
      opacity: 1,
    },
  },
}))

const IconContainer = styled(Box)(({ theme }) => ({
  width: 56,
  height: 56,
  borderRadius: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  transition: 'all 300ms ease-out',
}))

interface Feature {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  gradient: string
  fullWidth?: boolean
}

const features: Feature[] = [
  {
    id: 'dashboard',
    title: 'Real-Time Dashboard',
    description: 'Comprehensive project overview with live updates, KPIs, and actionable insights at your fingertips',
    icon: <DashboardIcon sx={{ fontSize: 32, color: 'white' }} />,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fullWidth: false,
  },
  {
    id: 'collaboration',
    title: 'Team Collaboration',
    description: 'Seamless communication and collaboration tools for distributed construction teams',
    icon: <PeopleIcon sx={{ fontSize: 32, color: 'white' }} />,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    fullWidth: false,
  },
  {
    id: 'approvals',
    title: 'Smart Approval Workflows',
    description: 'Streamlined approval processes with customizable workflows and instant notifications',
    icon: <CheckCircleIcon sx={{ fontSize: 32, color: 'white' }} />,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    fullWidth: true,
  },
  {
    id: 'documents',
    title: 'Document Management',
    description: 'Centralized document storage with version control and intelligent search capabilities',
    icon: <DescriptionIcon sx={{ fontSize: 32, color: 'white' }} />,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    fullWidth: false,
  },
  {
    id: 'analytics',
    title: 'Advanced Analytics',
    description: 'Data-driven insights with comprehensive reporting and trend analysis for better decision making',
    icon: <AnalyticsIcon sx={{ fontSize: 32, color: 'white' }} />,
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    fullWidth: false,
  },
  {
    id: 'security',
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, role-based access control, and complete audit trails',
    icon: <SecurityIcon sx={{ fontSize: 32, color: 'white' }} />,
    gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    fullWidth: false,
  },
  {
    id: 'sync',
    title: 'Cloud Synchronization',
    description: 'Automatic sync across all devices with offline functionality and seamless updates',
    icon: <CloudSyncIcon sx={{ fontSize: 32, color: 'white' }} />,
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    fullWidth: false,
  },
  {
    id: 'notifications',
    title: 'Smart Notifications',
    description: 'Intelligent alerts and notifications keep everyone informed without overwhelming them',
    icon: <NotificationsIcon sx={{ fontSize: 32, color: 'white' }} />,
    gradient: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
    fullWidth: false,
  },
]

export default function FeaturesBentoGrid() {
  const { t } = useTranslation()

  return (
    <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: '#f5f5f5' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: '#1e293b',
            }}
          >
            Powerful Features
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#64748b',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Everything you need to manage construction projects efficiently and effectively
          </Typography>
        </Box>

        <Grid
          container
          spacing={3}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          {features.map((feature) => (
            <Grid
              item
              key={feature.id}
              sx={{
                gridColumn: feature.fullWidth ? { md: '1 / -1' } : 'auto',
                xs: 12,
                sm: 6,
                md: feature.fullWidth ? 12 : 4,
              }}
            >
              <BentoCard>
                <Box>
                  <IconContainer sx={{ background: feature.gradient }}>
                    {feature.icon}
                  </IconContainer>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: '#1e293b',
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#64748b',
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#0369a1',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 200ms ease-out',
                      display: 'inline-block',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    Learn more →
                  </Typography>
                </Box>
              </BentoCard>
            </Grid>
          ))}
        </Grid>

        <Box
          sx={{
            mt: 8,
            p: 4,
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
            Ready to transform your construction projects?
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
            Join thousands of construction teams using BuilderOps to streamline operations and increase productivity
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Box
              component="button"
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 1,
                border: 'none',
                background: '#0369a1',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 200ms ease-out',
                '&:hover': {
                  background: '#0284c7',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              Get Started Free
            </Box>
            <Box
              component="button"
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 1,
                border: '2px solid #cbd5e1',
                background: 'transparent',
                color: '#1e293b',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 200ms ease-out',
                '&:hover': {
                  borderColor: '#0369a1',
                  color: '#0369a1',
                },
              }}
            >
              Schedule Demo
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
