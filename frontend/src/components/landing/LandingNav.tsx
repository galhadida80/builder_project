import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ConstructionIcon, MenuIcon, CloseIcon } from '@/icons'
import { Box, Container, Typography, useMediaQuery, useTheme } from '@/mui'

export default function LandingNav() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  const NAV_ITEMS = [
    { label: t('landing.nav.features'), id: 'features' },
    { label: t('landing.nav.howItWorks'), id: 'how-it-works' },
    { label: t('landing.nav.pricing'), id: 'pricing' },
    { label: t('landing.nav.faq'), id: 'faq' },
  ]

  const textColor = scrolled ? 'text.primary' : 'white'
  const mutedColor = scrolled ? 'text.secondary' : 'rgba(255,255,255,0.75)'

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        py: scrolled ? 1 : 1.5,
        bgcolor: scrolled
          ? (th) => th.palette.mode === 'dark' ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid' : 'none',
        borderColor: 'divider',
        transition: 'all 300ms ease',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box
            onClick={() => scrollTo('hero')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          >
            <Box sx={{ bgcolor: 'primary.main', p: 0.75, borderRadius: 2, display: 'flex', color: 'primary.contrastText' }}>
              <ConstructionIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: textColor, transition: 'color 300ms' }}>
              BuilderOps
            </Typography>
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5 }}>
              {NAV_ITEMS.map((item) => (
                <Typography
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  sx={{
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: mutedColor,
                    transition: 'color 200ms',
                    '&:hover': { color: textColor },
                  }}
                >
                  {item.label}
                </Typography>
              ))}
              <Button variant="primary" onClick={() => navigate('/login')} sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700, fontSize: '0.875rem' }}>
                {t('landing.signIn')}
              </Button>
            </Box>
          )}

          {isMobile && (
            <Box onClick={() => setMenuOpen(!menuOpen)} sx={{ cursor: 'pointer', color: textColor, p: 0.5 }}>
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </Box>
          )}
        </Box>

        {isMobile && menuOpen && (
          <Box sx={{ mt: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map((item) => (
              <Typography
                key={item.id}
                onClick={() => scrollTo(item.id)}
                sx={{ cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem', color: textColor }}
              >
                {item.label}
              </Typography>
            ))}
            <Button variant="primary" onClick={() => navigate('/login')} sx={{ width: '100%', py: 1.5, borderRadius: 2 }}>
              {t('landing.signIn')}
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  )
}
