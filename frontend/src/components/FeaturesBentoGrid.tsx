import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import DescriptionIcon from '@mui/icons-material/Description'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import SecurityIcon from '@mui/icons-material/Security'
import CloudSyncIcon from '@mui/icons-material/CloudSync'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { styled } from '@mui/material'
import { Button } from './ui/Button'

const BentoCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: 280,
  background: theme.palette.background.paper,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'box-shadow 300ms ease-out, transform 300ms ease-out',
  border: `1px solid ${theme.palette.divider}`,
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
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
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
    <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
            }}
          >
            Powerful Features
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Everything you need to manage construction projects efficiently and effectively
          </Typography>
        </Box>

        <Box
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
            <Box
              key={feature.id}
              sx={{
                gridColumn: feature.fullWidth ? { md: '1 / -1' } : 'auto',
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
                      color: 'text.primary',
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
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
                    borderTop: '1px solid',
                    borderTopColor: 'divider',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'color 200ms ease-out',
                      display: 'inline-block',
                      '&:hover': {
                        color: 'primary.dark',
                      },
                    }}
                  >
                    Learn more →
                  </Typography>
                </Box>
              </BentoCard>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            mt: 8,
            p: 4,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
            Ready to transform your construction projects?
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Join thousands of construction teams using BuilderOps to streamline operations and increase productivity
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary">
              Get Started Free
            </Button>
            <Button variant="secondary">
              Schedule Demo
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
