import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import ConstructionIcon from '@mui/icons-material/Construction'
import SpeedIcon from '@mui/icons-material/Speed'
import SecurityIcon from '@mui/icons-material/Security'
import GroupsIcon from '@mui/icons-material/Groups'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import BarChartIcon from '@mui/icons-material/BarChart'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Hero } from '../components/Hero'
import { Button } from '../components/ui/Button'
import turnerLogo from '../assets/logos/turner.svg'
import bechtelLogo from '../assets/logos/bechtel.svg'
import fluorLogo from '../assets/logos/fluor.svg'
import kiewitLogo from '../assets/logos/kiewit.svg'
import skanskaLogo from '../assets/logos/skanska.svg'

const FEATURES = [
  {
    icon: <SpeedIcon sx={{ fontSize: 28 }} />,
    title: 'Real-time Tracking',
    description: 'Monitor project progress, equipment status, and team activities with live dashboards and instant notifications.',
  },
  {
    icon: <ConstructionIcon sx={{ fontSize: 28 }} />,
    title: 'Equipment Management',
    description: 'Track equipment approvals, submissions, and compliance documents across all your active projects.',
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 28 }} />,
    title: 'Inspection System',
    description: 'Schedule inspections, assign consultants, and manage compliance checklists with full audit trails.',
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 28 }} />,
    title: 'Team Collaboration',
    description: 'Coordinate between project managers, inspectors, and contractors with role-based access control.',
  },
  {
    icon: <AssignmentTurnedInIcon sx={{ fontSize: 28 }} />,
    title: 'Approval Workflows',
    description: 'Streamline multi-step approval processes for equipment, materials, and RFIs with automated routing.',
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 28 }} />,
    title: 'Analytics & Reports',
    description: 'Generate insights with project analytics, workload tracking, and exportable reports for stakeholders.',
  },
]

const STATS = [
  { value: '500+', label: 'Construction Teams' },
  { value: '12K+', label: 'Projects Managed' },
  { value: '98%', label: 'On-time Delivery' },
  { value: '3.2M', label: 'Inspections Completed' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  const trustLogos = [
    { name: 'Turner Construction', imageUrl: turnerLogo, alt: 'Turner Construction logo' },
    { name: 'Bechtel', imageUrl: bechtelLogo, alt: 'Bechtel logo' },
    { name: 'Fluor', imageUrl: fluorLogo, alt: 'Fluor logo' },
    { name: 'Kiewit', imageUrl: kiewitLogo, alt: 'Kiewit logo' },
    { name: 'Skanska', imageUrl: skanskaLogo, alt: 'Skanska logo' },
  ]

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Floating Nav */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          py: 2.5,
          px: { xs: 2, md: 4 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <ConstructionIcon sx={{ fontSize: 22 }} />
              </Box>
              <Typography
                sx={{ color: 'white', fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.01em' }}
              >
                BuilderOps
              </Typography>
            </Box>
            <Button
              variant="secondary"
              onClick={() => navigate('/login')}
              sx={{
                borderColor: 'rgba(255,255,255,0.4)',
                color: 'white',
                px: 3,
                borderRadius: 2,
                backdropFilter: 'blur(4px)',
                bgcolor: 'rgba(255,255,255,0.08)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                },
              }}
            >
              Sign In
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Hero
        title={'Build Smarter\nInspect Faster\nDeliver Excellence'}
        subtitle="Streamline your construction management with our comprehensive platform. From project planning to final inspection, we've got you covered."
        ctaPrimaryText="Get Started Free"
        ctaPrimaryAction={() => navigate('/login')}
        ctaSecondaryText="Request Demo"
        ctaSecondaryAction={() => {}}
        trustLogos={trustLogos}
        showTrustLogos={true}
      />

      {/* Stats Section */}
      <Box sx={{ bgcolor: '#075985', py: { xs: 5, md: 6 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {STATS.map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '2rem', md: '2.5rem' },
                      fontWeight: 700,
                      color: 'white',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: '0.8rem', md: '0.875rem' },
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: 500,
                      mt: 0.5,
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'background.default', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 }, maxWidth: 600, mx: 'auto' }}>
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'primary.main',
                mb: 1.5,
              }}
            >
              Features
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                mb: 2,
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              Everything you need to manage construction projects
            </Typography>
            <Typography variant="body1" color="text.secondary">
              From equipment tracking to inspection management, BuilderOps provides the tools your team needs to deliver projects on time and on budget.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {FEATURES.map((feature) => (
              <Grid item xs={12} sm={6} md={4} key={feature.title}>
                <Box
                  sx={{
                    p: 3.5,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    height: '100%',
                    transition: 'all 200ms ease-out',
                    cursor: 'default',
                    '&:hover': {
                      borderColor: 'primary.light',
                      boxShadow: '0 8px 24px rgba(3, 105, 161, 0.08)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2.5,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, mb: 1, color: 'text.primary', fontSize: '1rem' }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Bottom CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(160deg, #075985 0%, #0369A1 50%, #0284C7 100%)',
          py: { xs: 8, md: 10 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: 'white',
                mb: 2,
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.5rem', md: '2.25rem' },
              }}
            >
              Ready to streamline your construction operations?
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.8)',
                mb: 4,
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              Join 500+ construction teams already using BuilderOps to deliver projects on time.
            </Typography>
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: 5,
                py: 1.75,
                fontSize: '1.05rem',
                bgcolor: 'white',
                color: '#0369A1',
                fontWeight: 700,
                borderRadius: 2.5,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.92)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                },
              }}
              icon={<ArrowForwardIcon />}
              iconPosition="end"
            >
              Get Started Free
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#0F172A', py: 4 }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ConstructionIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                BuilderOps
              </Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
              &copy; {new Date().getFullYear()} BuilderOps. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
