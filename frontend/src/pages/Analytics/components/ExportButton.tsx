import { useState } from 'react'
import { Button } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { CircularProgress } from '@mui/material'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const element = document.getElementById(targetId)

      if (!element) {
        console.error(`Element with id "${targetId}" not found`)
        return
      }

      // Capture the element as canvas with high quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')

      // Create PDF in landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // Calculate dimensions to fit the canvas into the PDF
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)

      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 0

      pdf.addImage(
        imgData,
        'PNG',
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      )

      // Add timestamp to filename
      const timestamp = new Date().toISOString().split('T')[0]
      pdf.save(`${filename}-${timestamp}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
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
      {isExporting ? 'Exporting...' : 'Export PDF'}
    </Button>
  )
}
