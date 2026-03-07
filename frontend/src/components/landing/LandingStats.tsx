import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GroupsIcon, AssignmentTurnedInIcon, SpeedIcon, StarIcon } from '@/icons'
import { Box, Container, Typography } from '@/mui'

function useCountUp(target: number, duration = 2000, startCounting: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!startCounting) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, startCounting])

  return count
}

export default function LandingStats() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const teams = useCountUp(500, 2000, visible)
  const projects = useCountUp(2400, 2000, visible)
  const satisfaction = useCountUp(98, 2000, visible)
  const hours = useCountUp(15, 1500, visible)

  const STATS = [
    { value: `${teams}+`, label: t('landing.stats.constructionTeams'), icon: <GroupsIcon sx={{ fontSize: 28 }} /> },
    { value: projects.toLocaleString() + '+', label: t('landing.stats.activeProjects'), icon: <AssignmentTurnedInIcon sx={{ fontSize: 28 }} /> },
    { value: `${satisfaction}%`, label: t('landing.stats.satisfactionRate'), icon: <StarIcon sx={{ fontSize: 28 }} /> },
    { value: `${hours}h`, label: t('landing.stats.timeSaved'), icon: <SpeedIcon sx={{ fontSize: 28 }} /> },
  ]

  return (
    <Box
      ref={ref}
      sx={{
        bgcolor: '#0f172a',
        py: { xs: 5, md: 7 },
        px: { xs: 2, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 4 } }}>
          {STATS.map((stat) => (
            <Box
              key={stat.label}
              sx={{
                textAlign: 'center',
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 300ms ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', transform: 'translateY(-2px)' },
              }}
            >
              <Box sx={{ color: '#C75B20', mb: 1.5 }}>{stat.icon}</Box>
              <Typography sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {stat.value}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#94a3b8', mt: 0.75, fontWeight: 500 }}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}
