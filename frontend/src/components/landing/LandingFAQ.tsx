import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInView } from '@/hooks/useInView'
import { ExpandMoreIcon } from '@/icons'
import { Box, Container, Typography, Collapse } from '@/mui'

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5']

export default function LandingFAQ() {
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const { ref, isVisible } = useInView(0.1)

  return (
    <Box id="faq" ref={ref} sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, md: 6 } }}>
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 } }}>
          <Typography
            component="h2"
            sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'text.primary' }}
          >
            {t('landing.faq.title')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {FAQ_KEYS.map((key, index) => {
            const isOpen = openIndex === index
            return (
              <Box
                key={key}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: isOpen ? 'primary.main' : 'divider',
                  overflow: 'hidden',
                  transition: 'all 300ms ease',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                  transitionDelay: `${index * 60}ms`,
                  bgcolor: 'background.paper',
                  '&:hover': { borderColor: isOpen ? 'primary.main' : 'primary.light' },
                }}
              >
                <Box
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: { xs: 2.5, md: 3 },
                    cursor: 'pointer',
                    gap: 2,
                  }}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', md: '1rem' }, color: 'text.primary', flex: 1 }}>
                    {t(`landing.faq.${key}`)}
                  </Typography>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 22,
                      color: 'text.secondary',
                      transition: 'transform 300ms ease',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      flexShrink: 0,
                    }}
                  />
                </Box>
                <Collapse in={isOpen}>
                  <Box sx={{ px: { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 }, pt: 0 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', lineHeight: 1.8 }}>
                      {t(`landing.faq.a${key.replace('q', '')}`)}
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            )
          })}
        </Box>
      </Container>
    </Box>
  )
}
