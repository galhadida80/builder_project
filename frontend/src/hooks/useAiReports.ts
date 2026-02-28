import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reportsApi } from '../api/reports'
import { useToast } from '../components/common/ToastProvider'
import { ReportConfig } from '../components/ReportGenerationWizard'

export function useAiReports(projectId: string | undefined) {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [currentReportConfig, setCurrentReportConfig] = useState<ReportConfig | null>(null)

  const handleGenerateAiReport = async (config: ReportConfig) => {
    if (!projectId) return

    try {
      setCurrentReportConfig(config)

      if (config.reportType === 'weekly-ai' && config.dateFrom && config.dateTo) {
        const html = await reportsApi.previewWeeklyReport(
          projectId,
          config.dateFrom,
          config.dateTo,
          config.language
        )
        setPreviewHtml(html)
        setPreviewTitle(t('reports.weeklyProgressReport', 'Weekly Progress Report'))
        setPreviewOpen(true)
      } else if (config.reportType === 'inspection-summary-ai' && config.dateFrom && config.dateTo) {
        const blob = await reportsApi.generateInspectionSummary(
          projectId,
          config.dateFrom,
          config.dateTo,
          config.language
        )
        const url = URL.createObjectURL(blob)
        const a = window.document.createElement('a')
        a.href = url
        a.download = `inspection-summary-ai-${config.dateFrom}-${config.dateTo}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      showError(t('reports.failedToGenerate', 'Failed to generate report'))
    }
  }

  const handleDownloadPdf = async () => {
    if (!projectId || !currentReportConfig) return

    try {
      const blob = await reportsApi.generateWeeklyReport(
        projectId,
        currentReportConfig.dateFrom || '',
        currentReportConfig.dateTo || '',
        currentReportConfig.language
      )
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `weekly-report-${currentReportConfig.dateFrom}-${currentReportConfig.dateTo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showError(t('reports.downloadFailed', 'Failed to download PDF'))
      throw new Error('Download failed')
    }
  }

  return {
    wizardOpen,
    setWizardOpen,
    previewOpen,
    setPreviewOpen,
    previewHtml,
    previewTitle,
    handleGenerateAiReport,
    handleDownloadPdf,
  }
}
