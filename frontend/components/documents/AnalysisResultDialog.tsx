'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { filesApi, FileRecord, DocumentAnalysis } from '@/lib/api/files'

interface AnalysisResultDialogProps {
  open: boolean
  file: FileRecord | null
  projectId: string
  onClose: () => void
}

export default function AnalysisResultDialog({ open, file, projectId, onClose }: AnalysisResultDialogProps) {
  const t = useTranslations()
  const [analysisType, setAnalysisType] = useState<string>('ocr')
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(0)

  const handleAnalyze = async () => {
    if (!file) return
    try {
      setLoading(true)
      setError('')
      setAnalysis(null)
      const result = await filesApi.analyze(projectId, file.id, analysisType)
      setAnalysis(result)
      if (result.status === 'failed') {
        setError(result.errorMessage || 'Analysis failed')
      }
    } catch {
      setError('Failed to analyze document')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setAnalysis(null)
    setError('')
    setTab(0)
    onClose()
  }

  const result = analysis?.result as Record<string, unknown> | null

  const extractedText = result?.extracted_text as string
    || result?.summary as string
    || ''

  const keyFindings = (result?.key_findings as string[])
    || (result?.extracted_data ? Object.entries(result.extracted_data as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`) : [])
    || []

  const metadata = (result?.metadata as Record<string, unknown>) || {}

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>{t('documents.analysisResult')}</Typography>
          {analysis && (
            <Chip
              label={`${analysis.processingTimeMs}ms`}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        {file && (
          <Typography variant="body2" color="text.secondary">{file.filename}</Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {!analysis && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 3 }}>
            <Typography variant="body1" fontWeight={500}>{t('documents.selectAnalysisType')}</Typography>
            <ToggleButtonGroup
              value={analysisType}
              exclusive
              onChange={(_, val) => val && setAnalysisType(val)}
              size="small"
            >
              <ToggleButton value="ocr">{t('documents.ocr')}</ToggleButton>
              <ToggleButton value="summary">{t('documents.summary')}</ToggleButton>
              <ToggleButton value="extraction">{t('documents.extraction')}</ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" onClick={handleAnalyze} disabled={loading}>
              {t('documents.analyze')}
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">{t('documents.analyzing')}</Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {analysis && analysis.status === 'completed' && (
          <Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label={t('documents.extractedText')} />
              <Tab label={t('documents.keyFindings')} />
              <Tab label="Metadata" />
            </Tabs>

            {tab === 0 && (
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {extractedText || 'No text extracted'}
                </Typography>
              </Box>
            )}

            {tab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {keyFindings.length > 0 ? (
                  keyFindings.map((finding, i) => (
                    <Box key={i} sx={{ bgcolor: 'action.hover', borderRadius: 1.5, p: 1.5 }}>
                      <Typography variant="body2">{finding}</Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No key findings</Typography>
                )}
              </Box>
            )}

            {tab === 2 && (
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {JSON.stringify(metadata, null, 2)}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {analysis && (
          <Button onClick={() => { setAnalysis(null); setError('') }}>
            {t('documents.newAnalysis')}
          </Button>
        )}
        <Button onClick={handleClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
