import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ConstructionIcon, ArrowForwardIcon } from '@/icons'
import { Box, Container, Typography, Divider } from '@/mui'

export default function LandingFooter() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const COLUMNS = [
    {
      title: t('landing.footer.product'),
      links: [
        { label: t('landing.footer.features'), action: () => scrollTo('features') },
        { label: t('landing.footer.pricing'), action: () => scrollTo('pricing') },
        { label: t('landing.footer.integrations'), action: () => {} },
      ],
    },
    {
      title: t('landing.footer.company'),
      links: [
        { label: t('landing.footer.about'), action: () => {} },
        { label: t('landing.footer.blog'), action: () => {} },
        { label: t('landing.footer.careers'), action: () => {} },
      ],
    },
    {
      title: t('landing.footer.support'),
      links: [
        { label: t('landing.footer.helpCenter'), action: () => {} },
        { label: t('landing.footer.docs'), action: () => {} },
        { label: t('landing.footer.contact'), action: () => {} },
      ],
    },
  ]

  return (
    <>
      {/* CTA Banner */}
      <Box
        sx={{
          background: 'linear-gradient(160deg, #8B3A14 0%, #C75B20 40%, #E07842 70%, #E89060 100%)',
          py: { xs: 7, md: 10 },
          px: { xs: 2, md: 6 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: 'white', mb: 2, fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2 }}>
              {t('landing.ctaTitle')}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', mb: 4, fontSize: '1.05rem', maxWidth: 500, mx: 'auto', lineHeight: 1.7 }}>
              {t('landing.ctaSubtitle')}
            </Typography>
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/login')}
              icon={<ArrowForwardIcon />}
              iconPosition="end"
              sx={{
                px: 5,
                py: 2,
                fontSize: '1.05rem',
                bgcolor: 'white',
                color: '#a85020',
                fontWeight: 700,
                borderRadius: 3,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
              }}
            >
              {t('landing.getStarted')}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: (th) => th.palette.mode === 'dark' ? '#0f172a' : 'background.paper', borderTop: '1px solid', borderColor: 'divider', py: { xs: 6, md: 8 }, px: { xs: 2, md: 6 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' }, gap: { xs: 4, md: 6 } }}>
            {/* Brand column */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ bgcolor: '#C75B20', p: 0.75, borderRadius: 2, display: 'flex', color: 'white' }}>
                  <ConstructionIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'text.primary' }}>
                  BuilderOps
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.7, maxWidth: 260 }}>
                {t('landing.footer.description')}
              </Typography>
            </Box>

            {/* Link columns */}
            {COLUMNS.map((col) => (
              <Box key={col.title}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col.title}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {col.links.map((link) => (
                    <Typography
                      key={link.label}
                      onClick={link.action}
                      sx={{
                        fontSize: '0.85rem',
                        color: 'text.secondary',
                        cursor: 'pointer',
                        transition: 'color 200ms',
                        '&:hover': { color: 'text.primary' },
                      }}
                    >
                      {link.label}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
              &copy; {new Date().getFullYear()} BuilderOps. {t('landing.allRightsReserved')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}>
                {t('landing.footer.terms')}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}>
                {t('landing.footer.privacy')}
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  )
}
