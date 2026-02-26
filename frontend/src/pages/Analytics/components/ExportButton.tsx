import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { DownloadIcon } from '@/icons'
import { Button, CircularProgress } from '@/mui'

export interface ExportButtonProps {
  targetId?: string
  filename?: string
  variant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
}

export default function ExportButton({
  targetId = 'dashboard-content',
  filename = 'analytics-dashboard',
  variant = 'contained',
  size = 'medium',
}: ExportButtonProps) {
  const { t } = useTranslation()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const element = document.getElementById(targetId)

      if (!element) {
        return
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const scaledWidth = pdfWidth
      const scaledHeight = (imgHeight * pdfWidth) / imgWidth

      let heightLeft = scaledHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, scaledWidth, scaledHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position -= pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, scaledWidth, scaledHeight)
        heightLeft -= pdfHeight
      }

      const timestamp = new Date().toISOString().split('T')[0]
      pdf.save(`${filename}-${timestamp}.pdf`)
    } catch (error) {
      // Error occurred during export
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      startIcon={
        isExporting ? (
          <CircularProgress size={18} color="inherit" />
        ) : (
          <DownloadIcon />
        )
      }
      sx={{
        fontWeight: 600,
        transition: 'all 200ms ease-out',
        '&:hover': {
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
        '&.Mui-disabled': {
          transform: 'none',
        },
      }}
    >
      {isExporting ? t('analytics.exporting') : t('analytics.exportPdf')}
    </Button>
  )
}
