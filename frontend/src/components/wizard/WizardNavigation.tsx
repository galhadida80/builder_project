import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { ArrowBackIcon, ArrowForwardIcon, CheckCircleIcon } from '@/icons'
import { Box, useMediaQuery, useTheme } from '@/mui'

interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onFinish: () => void
  loading?: boolean
  canProceed?: boolean
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onFinish,
  loading = false,
  canProceed = true,
}: WizardNavigationProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isRtl = theme.direction === 'rtl'
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1.5,
        p: { xs: 1.5, sm: 2 },
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        zIndex: 10,
      }}
    >
      <Button
        variant="secondary"
        onClick={onBack}
        disabled={isFirstStep || loading}
        icon={isRtl ? <ArrowForwardIcon /> : <ArrowBackIcon />}
        iconPosition="start"
        size={isMobile ? 'small' : 'medium'}
      >
        {t('structureWizard.back')}
      </Button>

      {isLastStep ? (
        <Button
          variant="success"
          onClick={onFinish}
          disabled={!canProceed || loading}
          loading={loading}
          icon={<CheckCircleIcon />}
          iconPosition="end"
          size={isMobile ? 'small' : 'medium'}
        >
          {loading ? t('structureWizard.creating') : t('structureWizard.finish')}
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!canProceed || loading}
          icon={isRtl ? <ArrowBackIcon /> : <ArrowForwardIcon />}
          iconPosition="end"
          size={isMobile ? 'small' : 'medium'}
        >
          {t('structureWizard.next')}
        </Button>
      )}
    </Box>
  )
}
