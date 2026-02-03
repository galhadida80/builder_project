import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Rating from '@mui/material/Rating'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { styled } from '@mui/material/styles'

const TestimonialCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  minHeight: 300,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'all 300ms ease-out',
  cursor: 'grab',
  '&:active': {
    cursor: 'grabbing',
  },
}))

const CarouselContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  overflow: 'hidden',
}))

interface Testimonial {
  id: string
  name: string
  title: string
  company: string
  content: string
  rating: number
  avatar: string
  color: string
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    title: 'Project Manager',
    company: 'BuildTech Solutions',
    content:
      'BuilderOps has transformed how we manage our construction projects. The intuitive interface and real-time collaboration features have increased our team productivity by 40%.',
    rating: 5,
    avatar: 'SJ',
    color: '#667eea',
  },
  {
    id: '2',
    name: 'Michael Chen',
    title: 'Construction Director',
    company: 'Premier Builders Inc',
    content:
      'The approval workflows have saved us countless hours. What used to take days now takes minutes. The mobile app is a game-changer for on-site teams.',
    rating: 5,
    avatar: 'MC',
    color: '#f093fb',
  },
  {
    id: '3',
    name: 'Emma Rodriguez',
    title: 'Operations Lead',
    company: 'GreenBuild Enterprises',
    content:
      'The dashboard gives us visibility into every aspect of our projects. We can now identify bottlenecks and risks before they become problems.',
    rating: 5,
    avatar: 'ER',
    color: '#4facfe',
  },
  {
    id: '4',
    name: 'James Patterson',
    title: 'Site Manager',
    company: 'Metropolitan Construction',
    content:
      'Implementing BuilderOps was the best decision we made this year. Team collaboration, document management, and approval tracking are all seamless now.',
    rating: 5,
    avatar: 'JP',
    color: '#43e97b',
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    title: 'Chief Operations Officer',
    company: 'Horizon Builders Group',
    content:
      'The ROI on BuilderOps was immediate. We reduced approval times by 60% and improved team communication across all project sites.',
    rating: 5,
    avatar: 'LT',
    color: '#fa709a',
  },
]

interface CarouselProps {
  autoPlay?: boolean
  autoPlayInterval?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export default function TestimonialsCarousel({
  autoPlay = true,
  autoPlayInterval = 5000,
}: CarouselProps) {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false)

  useEffect(() => {
    if (!autoPlay || isAutoPlayPaused) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))
    }, autoPlayInterval)

    return () => clearInterval(timer)
  }, [autoPlay, autoPlayInterval, isAutoPlayPaused])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))
    setIsAutoPlayPaused(true)
    setTimeout(() => setIsAutoPlayPaused(false), autoPlayInterval)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))
    setIsAutoPlayPaused(true)
    setTimeout(() => setIsAutoPlayPaused(false), autoPlayInterval)
  }

  const getVisibleTestimonials = () => {
    const visibleCount = 3
    const result = []
    for (let i = 0; i < visibleCount; i++) {
      result.push(testimonials[(currentIndex + i) % testimonials.length])
    }
    return result
  }

  const visibleTestimonials = getVisibleTestimonials()

  return (
    <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: '#ffffff' }}>
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
            What Our Clients Say
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#64748b',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Trusted by leading construction companies and project managers worldwide
          </Typography>
        </Box>

        <CarouselContainer>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
              mb: 4,
            }}
          >
            {visibleTestimonials.map((testimonial, idx) => (
              <TestimonialCard
                key={testimonial.id}
                sx={{
                  animation: `slideIn 300ms ease-out`,
                  '@keyframes slideIn': {
                    from: {
                      opacity: 0,
                      transform: 'translateX(20px)',
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateX(0)',
                    },
                  },
                }}
              >
                <CardContent sx={{ p: 3, pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        background: testimonial.color,
                        color: 'white',
                        fontWeight: 600,
                      }}
                    >
                      {testimonial.avatar}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {testimonial.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {testimonial.title}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Rating value={testimonial.rating} readOnly size="small" />
                  </Box>

                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <FormatQuoteIcon
                      sx={{
                        color: 'primary.main',
                        opacity: 0.3,
                        fontSize: 28,
                        mt: -0.5,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#475569',
                        fontStyle: 'italic',
                        lineHeight: 1.6,
                      }}
                    >
                      "{testimonial.content}"
                    </Typography>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: '#94a3b8',
                      fontWeight: 500,
                    }}
                  >
                    {testimonial.company}
                  </Typography>
                </CardContent>
              </TestimonialCard>
            ))}
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
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

            <Box sx={{ display: 'flex', gap: 1 }}>
              {testimonials.map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: idx === currentIndex ? '#0369a1' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 200ms ease-out',
                    '&:hover': {
                      bgcolor: idx === currentIndex ? '#0284c7' : '#a1aab5',
                    },
                  }}
                  onClick={() => {
                    setCurrentIndex(idx)
                    setIsAutoPlayPaused(true)
                    setTimeout(() => setIsAutoPlayPaused(false), autoPlayInterval)
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

          <Box
            sx={{
              textAlign: 'center',
              mt: 3,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#94a3b8',
              }}
            >
              Showing {currentIndex + 1} - {currentIndex + Math.min(3, testimonials.length)} of {testimonials.length} testimonials
            </Typography>
          </Box>
        </CarouselContainer>
      </Container>
    </Box>
  )
}
