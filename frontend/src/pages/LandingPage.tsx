import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import { Hero } from '../components/Hero'

export default function LandingPage() {
  const navigate = useNavigate()

  const trustLogos = [
    {
      name: 'Turner Construction',
      imageUrl: '/src/assets/logos/turner.svg',
      alt: 'Turner Construction logo',
    },
    {
      name: 'Bechtel',
      imageUrl: '/src/assets/logos/bechtel.svg',
      alt: 'Bechtel logo',
    },
    {
      name: 'Fluor',
      imageUrl: '/src/assets/logos/fluor.svg',
      alt: 'Fluor logo',
    },
    {
      name: 'Kiewit',
      imageUrl: '/src/assets/logos/kiewit.svg',
      alt: 'Kiewit logo',
    },
    {
      name: 'Skanska',
      imageUrl: '/src/assets/logos/skanska.svg',
      alt: 'Skanska logo',
    },
  ]

  const handleRequestDemo = () => {
    // TODO: Navigate to demo request page or open contact form
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
        trustLogos={trustLogos}
        showTrustLogos={true}
      />
    </Box>
  )
}
