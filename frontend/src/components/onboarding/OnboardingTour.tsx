import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Typography, Paper, LinearProgress } from '@/mui'
import { CloseIcon } from '@/icons'
import { IconButton } from '@/mui'

interface TourStep {
  target: string
  titleKey: string
  contentKey: string
  placement: 'bottom' | 'top' | 'left' | 'right'
}

const STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    titleKey: 'onboarding.steps.sidebar.title',
    contentKey: 'onboarding.steps.sidebar.content',
    placement: 'bottom',
  },
  {
    target: '[data-tour="projects"]',
    titleKey: 'onboarding.steps.projects.title',
    contentKey: 'onboarding.steps.projects.content',
    placement: 'bottom',
  },
  {
    target: '[data-tour="equipment"]',
    titleKey: 'onboarding.steps.equipment.title',
    contentKey: 'onboarding.steps.equipment.content',
    placement: 'bottom',
  },
  {
    target: '[data-tour="materials"]',
    titleKey: 'onboarding.steps.materials.title',
    contentKey: 'onboarding.steps.materials.content',
    placement: 'bottom',
  },
  {
    target: '[data-tour="approvals"]',
    titleKey: 'onboarding.steps.approvals.title',
    contentKey: 'onboarding.steps.approvals.content',
    placement: 'bottom',
  },
  {
    target: '[data-tour="chat"]',
    titleKey: 'onboarding.steps.chat.title',
    contentKey: 'onboarding.steps.chat.content',
    placement: 'top',
  },
]

interface OnboardingTourProps {
  open: boolean
  onComplete: () => void
}

export default function OnboardingTour({ open, onComplete }: OnboardingTourProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [visible, setVisible] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const step = STEPS[currentStep]
    if (!step) return

    const el = document.querySelector(step.target)
    if (!el) {
      setVisible(false)
      return
    }

    const rect = el.getBoundingClientRect()
    const isMobileView = window.innerWidth < 768
    const tooltipWidth = isMobileView ? Math.min(300, window.innerWidth - 32) : 320
    let top = 0
    let left = 0

    if (isMobileView) {
      left = (window.innerWidth - tooltipWidth) / 2
      top = step.placement === 'top' ? rect.top - 180 : rect.bottom + 12
    } else {
      switch (step.placement) {
        case 'right':
          top = rect.top + rect.height / 2 - 80
          left = rect.right + 12
          break
        case 'left':
          top = rect.top + rect.height / 2 - 80
          left = rect.left - tooltipWidth - 12
          break
        case 'bottom':
          top = rect.bottom + 12
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'top':
          top = rect.top - 180
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
      }
    }

    top = Math.max(8, Math.min(top, window.innerHeight - 200))
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 16))

    setPosition({ top, left })
    setVisible(true)
  }, [currentStep])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(updatePosition, 300)
    window.addEventListener('resize', updatePosition)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  const findNextVisible = useCallback((from: number, direction: 1 | -1): number | null => {
    let idx = from + direction
    while (idx >= 0 && idx < STEPS.length) {
      if (document.querySelector(STEPS[idx].target)) return idx
      idx += direction
    }
    return null
  }, [])

  const handleNext = useCallback(() => {
    const next = findNextVisible(currentStep, 1)
    if (next !== null) {
      setCurrentStep(next)
    } else {
      onComplete()
    }
  }, [currentStep, findNextVisible, onComplete])

  const handlePrevious = useCallback(() => {
    const prev = findNextVisible(currentStep, -1)
    if (prev !== null) {
      setCurrentStep(prev)
    }
  }, [currentStep, findNextVisible])

  if (!open) return null

  const step = STEPS[currentStep]
  const visibleSteps = STEPS.filter(s => document.querySelector(s.target))
  const visibleIndex = visibleSteps.indexOf(step)
  const visibleTotal = visibleSteps.length
  const progress = visibleTotal > 0 ? ((visibleIndex + 1) / visibleTotal) * 100 : 0
  const hasPrev = findNextVisible(currentStep, -1) !== null
  const hasNext = findNextVisible(currentStep, 1) !== null

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.4)',
          zIndex: 1300,
        }}
        onClick={onComplete}
      />
      <Paper
        ref={popoverRef}
        elevation={8}
        sx={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: { xs: 'calc(100vw - 32px)', sm: 320 },
          maxWidth: 320,
          zIndex: 1301,
          p: 2.5,
          borderRadius: 3,
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms, top 200ms, left 200ms',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t(step.titleKey)}
          </Typography>
          <IconButton size="small" onClick={onComplete} aria-label={t('common.close')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(step.contentKey)}
        </Typography>

        <LinearProgress variant="determinate" value={progress} sx={{ mb: 1.5, borderRadius: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {t('onboarding.stepOf', { current: visibleIndex + 1, total: visibleTotal })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="text" onClick={onComplete}>
              {t('onboarding.skip')}
            </Button>
            {hasPrev && (
              <Button size="small" variant="outlined" onClick={handlePrevious}>
                {t('common.previous')}
              </Button>
            )}
            <Button size="small" variant="contained" onClick={handleNext}>
              {hasNext ? t('common.next') : t('onboarding.finish')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </>
  )
}
