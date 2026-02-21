import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { SeverityBadge } from './ui/StatusBadge'
import { Button } from './ui/Button'
import { CloseIcon, PrintIcon, AssignmentIcon, CheckCircleIcon, WarningIcon, ErrorIcon, ScheduleIcon, LocationOnIcon } from '@/icons'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography,
  Divider, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, styled,
  useMediaQuery, useTheme,
} from '@/mui'
import type { Inspection } from '../types'

interface InspectionReportPreviewProps {
  open: boolean
  onClose: () => void
  inspection: Inspection | null
}

const PrintableContent = styled(Box)({
  '@media print': {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
    backgroundColor: '#fff',
    padding: '24px',
    overflow: 'auto',
  },
})

const statusConfig: Record<string, { icon: React.ReactNode; color: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' }> = {
  pending: { icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: 'info' },
  in_progress: { icon: <WarningIcon sx={{ fontSize: 16 }} />, color: 'warning' },
  completed: { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: 'success' },
  failed: { icon: <ErrorIcon sx={{ fontSize: 16 }} />, color: 'error' },
}

export default function InspectionReportPreview({ open, onClose, inspection }: InspectionReportPreviewProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  if (!inspection) return null

  const handlePrint = () => {
    window.print()
  }

  const locale = getDateLocale()
  const scheduledDate = new Date(inspection.scheduledDate).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const scheduledTime = new Date(inspection.scheduledDate).toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit',
  })
  const completedDate = inspection.completedDate
    ? new Date(inspection.completedDate).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : t('inspections.notCompleted')

  const config = statusConfig[inspection.status] || statusConfig.pending
  const findings = inspection.findings || []
  const criticalCount = findings.filter(f => f.severity === 'critical').length
  const highCount = findings.filter(f => f.severity === 'high').length
  const mediumCount = findings.filter(f => f.severity === 'medium').length
  const lowCount = findings.filter(f => f.severity === 'low').length

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': { borderRadius: 3, maxHeight: '90vh' },
        '& .MuiBackdrop-root': { backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' },
        '@media print': {
          '& .MuiDialog-paper': { maxHeight: 'none', boxShadow: 'none', margin: 0, borderRadius: 0 },
          '& .MuiBackdrop-root': { display: 'none' },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssignmentIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            {t('inspections.inspectionReport')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ '@media print': { display: 'none' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <PrintableContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
            <DetailRow label={t('inspections.consultantType')} value={inspection.consultantType?.name || t('inspections.unknown')} />
            <DetailRow label={t('common.status')}>
              <Chip
                size="small"
                icon={config.icon as React.ReactElement}
                label={t(`common.statuses.${inspection.status}`, { defaultValue: inspection.status.replace('_', ' ') })}
                color={config.color}
                sx={{ textTransform: 'capitalize', fontWeight: 500 }}
              />
            </DetailRow>
            <DetailRow label={t('inspections.reportDate')} value={`${scheduledDate} - ${scheduledTime}`} />
            <DetailRow label={t('inspections.completedDate')} value={completedDate} />
            <DetailRow label={t('inspections.currentStage')} value={inspection.currentStage || t('inspections.notStarted')} />
            {inspection.createdBy && (
              <DetailRow label={t('inspections.createdBy')} value={inspection.createdBy.fullName || inspection.createdBy.email} />
            )}
          </Box>

          {inspection.notes && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                {t('common.notes')}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {inspection.notes}
                </Typography>
              </Paper>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t('inspections.findingSummary')} ({findings.length})
            </Typography>
            {findings.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {criticalCount > 0 && <Chip size="small" label={`${criticalCount} Critical`} color="error" />}
                {highCount > 0 && <Chip size="small" label={`${highCount} High`} color="warning" />}
                {mediumCount > 0 && <Chip size="small" label={`${mediumCount} Medium`} color="default" />}
                {lowCount > 0 && <Chip size="small" label={`${lowCount} Low`} color="default" />}
              </Box>
            )}
          </Box>

          {findings.length > 0 ? (
            isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {findings.map((finding, index) => (
                  <Paper key={finding.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight={600}>#{index + 1} {finding.title}</Typography>
                      <SeverityBadge severity={finding.severity} />
                    </Box>
                    {finding.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {finding.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={finding.status === 'resolved' ? t('inspections.resolved') : t('inspections.open')}
                        color={finding.status === 'resolved' ? 'success' : 'warning'}
                        sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                      />
                      {finding.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{finding.location}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('inspections.findings')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('inspections.severity')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('common.status')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('inspections.location')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {findings.map((finding, index) => (
                      <TableRow key={finding.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{finding.title}</Typography>
                          {finding.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {finding.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={finding.severity} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={finding.status === 'resolved' ? t('inspections.resolved') : t('inspections.open')}
                            color={finding.status === 'resolved' ? 'success' : 'warning'}
                            sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          {finding.location ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">{finding.location}</Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.disabled">-</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('inspections.noFindings')}
              </Typography>
            </Paper>
          )}

          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              {t('inspections.generatedOn')} {new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
        </PrintableContent>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', gap: 1, '@media print': { display: 'none' } }}>
        <Button variant="tertiary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" icon={<PrintIcon />} onClick={handlePrint}>
          {t('inspections.printReport')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        {label}
      </Typography>
      {children || (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      )}
    </Box>
  )
}
