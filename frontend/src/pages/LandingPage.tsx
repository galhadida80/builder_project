import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import { Hero } from '../components/Hero'
// Import logo assets so Vite can bundle them correctly
import turnerLogo from '../assets/logos/turner.svg'
import bechtelLogo from '../assets/logos/bechtel.svg'
import fluorLogo from '../assets/logos/fluor.svg'
import kiewitLogo from '../assets/logos/kiewit.svg'
import skanskaLogo from '../assets/logos/skanska.svg'

export default function LandingPage() {
  const navigate = useNavigate()

  const trustLogos = [
    {
      name: 'Turner Construction',
      imageUrl: turnerLogo,
      alt: 'Turner Construction logo',
    },
    {
      name: 'Bechtel',
      imageUrl: bechtelLogo,
      alt: 'Bechtel logo',
    },
    {
      name: 'Fluor',
      imageUrl: fluorLogo,
      alt: 'Fluor logo',
    },
    {
      name: 'Kiewit',
      imageUrl: kiewitLogo,
      alt: 'Kiewit logo',
    },
    {
      name: 'Skanska',
      imageUrl: skanskaLogo,
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
