import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import { Hero } from '../components/Hero'

export default function LandingPage() {
  const navigate = useNavigate()

  const handleRequestDemo = () => {
    // TODO: Navigate to demo request page or open contact form
    console.log('Request demo clicked')
  }

  const handleLogin = () => {
    navigate('/login')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Hero
        title="Build Smarter Inspect Faster Deliver Excellence"
        subtitle="Streamline your construction management with our comprehensive platform. From project planning to final inspection, we've got you covered."
        ctaPrimaryText="Request Demo"
        ctaPrimaryAction={handleRequestDemo}
        ctaSecondaryText="Login"
        ctaSecondaryAction={handleLogin}
        showTrustLogos={false}
      />
    </Box>
  )
}
