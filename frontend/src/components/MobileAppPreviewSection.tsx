import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import TouchAppIcon from '@mui/icons-material/TouchApp'
import CameraIcon from '@mui/icons-material/CameraAlt'
import ShareIcon from '@mui/icons-material/Share'
import { styled } from '@mui/material/styles'

const MobileFrame = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: 320,
  aspectRatio: '9/19',
  borderRadius: theme.spacing(3),
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  background: '#000',
  border: '12px solid #1e293b',
  transition: 'all 300ms ease-out',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
  },
}))

const ScreenContent = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(3),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
}))

const FeatureHighlight = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  background: theme.palette.background.paper,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  transition: 'all 200ms ease-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
  },
}))

interface Feature {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}

const features: Feature[] = [
  {
    id: 'touchscreen',
    icon: <TouchAppIcon sx={{ fontSize: 24 }} />,
    title: 'Touch-Optimized Interface',
    description: 'Intuitive gestures and responsive touch controls for seamless mobile experience',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'camera',
    icon: <CameraIcon sx={{ fontSize: 24 }} />,
    title: 'Photo Capture',
    description: 'Built-in camera functionality for documentation and quick uploads',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'sharing',
    icon: <ShareIcon sx={{ fontSize: 24 }} />,
    title: 'Instant Sharing',
    description: 'Share updates, documents, and approvals with team members in real-time',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
]

interface ScreenState {
  id: string
  title: string
  content: React.ReactNode
  gradient: string
}

export default function MobileAppPreviewSection() {
  const { t } = useTranslation()
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0)

  const screens: ScreenState[] = [
    {
      id: 'dashboard',
      title: 'Dashboard View',
      content: (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Dashboard
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">24 Active Projects</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">156 Team Members</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">42 Pending Tasks</Typography>
            </Box>
          </Box>
        </Box>
      ),
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: 'approvals',
      title: 'Approvals',
      content: (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Approvals
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">Pending: 5</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">Approved: 23</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">Rejected: 2</Typography>
            </Box>
          </Box>
        </Box>
      ),
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: 'settings',
      title: 'Settings',
      content: (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Settings
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">Notifications</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">Preferences</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
              <Typography variant="body2">Account</Typography>
            </Box>
          </Box>
        </Box>
      ),
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  ]

  const currentScreen = screens[currentScreenIndex]

  const handlePrevious = () => {
    setCurrentScreenIndex((prev) => (prev === 0 ? screens.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentScreenIndex((prev) => (prev === screens.length - 1 ? 0 : prev + 1))
  }

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
            Mobile App Preview
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#64748b',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Experience the full power of BuilderOps on your mobile device with intuitive design and seamless functionality
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ mb: 6, alignItems: 'center' }}>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ position: 'relative', width: '100%', maxWidth: 320 }}>
              <MobileFrame>
                <ScreenContent sx={{ background: currentScreen.gradient }}>
                  {currentScreen.content}
                </ScreenContent>
              </MobileFrame>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 2,
                  mt: 3,
                }}
              >
                <IconButton
                  onClick={handlePrevious}
                  sx={{
                    bgcolor: '#e2e8f0',
                    '&:hover': { bgcolor: '#cbd5e1' },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {screens.map((_, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: idx === currentScreenIndex ? '#0369a1' : '#cbd5e1',
                        transition: 'all 200ms ease-out',
                      }}
                    />
                  ))}
                </Box>
                <IconButton
                  onClick={handleNext}
                  sx={{
                    bgcolor: '#e2e8f0',
                    '&:hover': { bgcolor: '#cbd5e1' },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                  {currentScreen.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Navigate through different app sections to explore all features and capabilities
                </Typography>
              </Box>

              {features.map((feature) => (
                <FeatureHighlight key={feature.id}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: feature.gradient,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: '#1e293b' }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {feature.description}
                    </Typography>
                  </Box>
                </FeatureHighlight>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
