import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Typography,
  useTheme,
  useMediaQuery,
} from '@/mui'
import { Button } from './ui/Button'
import { TextField } from './ui/TextField'
import FilterChips from './ui/FilterChips'
import { ArrowForwardIcon, ArrowBackIcon, CheckCircleIcon } from '@/icons'

interface Props {
  open: boolean
  onClose: () => void
  onGenerate: (config: ReportConfig) => Promise<void>
}

export interface ReportConfig {
  reportType: string
  dateFrom?: string
  dateTo?: string
  language: string
}

const REPORT_TYPES = [
  { value: 'weekly-ai', label: 'Weekly Progress Report (AI)', requiresDateRange: true },
  { value: 'inspection-summary-ai', label: 'Inspection Summary (AI)', requiresDateRange: true },
  { value: 'executive-summary-ai', label: 'Executive Summary (AI)', requiresDateRange: false },
]

const STEPS = ['Select Report Type', 'Configure Parameters', 'Generate']

export default function ReportGenerationWizard({ open, onClose, onGenerate }: Props) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [activeStep, setActiveStep] = useState(0)
  const [reportType, setReportType] = useState('weekly-ai')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [language, setLanguage] = useState('he')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setActiveStep(0)
      setReportType('weekly-ai')
      setDateFrom('')
      setDateTo('')
      setLanguage('he')
      setLoading(false)

      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      setDateFrom(weekAgo.toISOString().slice(0, 10))
      setDateTo(now.toISOString().slice(0, 10))
    }
  }, [open])

  const selectedReportType = REPORT_TYPES.find((rt) => rt.value === reportType)
  const requiresDateRange = selectedReportType?.requiresDateRange ?? true

  const canProceedToStep2 = reportType !== ''
  const canProceedToStep3 = !requiresDateRange || (dateFrom && dateTo)

  const handleNext = () => {
    if (activeStep === 0 && canProceedToStep2) {
      setActiveStep(1)
    } else if (activeStep === 1 && canProceedToStep3) {
      setActiveStep(2)
    } else if (activeStep === 2) {
      handleGenerate()
    }
  }

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const config: ReportConfig = {
        reportType,
        language,
      }
      if (requiresDateRange) {
        config.dateFrom = dateFrom
        config.dateTo = dateTo
      }
      await onGenerate(config)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 2 }}>
              {t('reports.selectReportType', 'Select Report Type')}
            </Typography>
            <FilterChips
              items={REPORT_TYPES.map((rt) => ({ label: rt.label, value: rt.value }))}
              value={reportType}
              onChange={(v) => setReportType(v)}
            />
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {reportType === 'weekly-ai' && t('reports.weeklyAiDescription', 'AI-generated weekly progress report with narrative summary, charts, and key metrics.')}
                {reportType === 'inspection-summary-ai' && t('reports.inspectionAiDescription', 'AI-powered inspection summary with findings analysis, photos, and recommendations.')}
                {reportType === 'executive-summary-ai' && t('reports.executiveAiDescription', 'High-level executive summary with project health indicators and critical items.')}
              </Typography>
            </Box>
          </Box>
        )

      case 1:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 2 }}>
              {t('reports.configureParameters', 'Configure Parameters')}
            </Typography>

            {requiresDateRange && (
              <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 1.5, mb: 2 }}>
                <TextField
                  fullWidth
                  type="date"
                  label={t('reports.dateFrom', 'Date From')}
                  InputLabelProps={{ shrink: true }}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <TextField
                  fullWidth
                  type="date"
                  label={t('reports.dateTo', 'Date To')}
                  InputLabelProps={{ shrink: true }}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Box>
            )}

            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
              {t('reports.language', 'Language')}
            </Typography>
            <FilterChips
              items={[
                { label: t('language.hebrew', 'עברית'), value: 'he' },
                { label: t('language.english', 'English'), value: 'en' },
              ]}
              value={language}
              onChange={(v) => setLanguage(v)}
            />
          </Box>
        )

      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 2 }}>
              {t('reports.reviewConfiguration', 'Review Configuration')}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('reports.reportType', 'Report Type')}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedReportType?.label}
                </Typography>
              </Box>

              {requiresDateRange && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('reports.dateRange', 'Date Range')}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {dateFrom} — {dateTo}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('reports.language', 'Language')}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {language === 'he' ? t('language.hebrew', 'עברית') : t('language.english', 'English')}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 18, color: 'info.main' }} />
              <Typography variant="caption" color="info.dark">
                {t('reports.readyToGenerate', 'Ready to generate your AI-powered report. This may take a few moments.')}
              </Typography>
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        {t('reports.generateReport', 'Generate Report')}
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          variant="secondary"
          onClick={activeStep === 0 ? onClose : handleBack}
          disabled={loading}
        >
          {activeStep === 0 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
        </Button>
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={
            loading ||
            (activeStep === 0 && !canProceedToStep2) ||
            (activeStep === 1 && !canProceedToStep3)
          }
          icon={activeStep === 2 ? undefined : <ArrowForwardIcon />}
        >
          {loading
            ? t('common.generating', 'Generating...')
            : activeStep === 2
            ? t('reports.generate', 'Generate')
            : t('common.next', 'Next')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
