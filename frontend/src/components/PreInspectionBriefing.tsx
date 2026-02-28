import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { riskScoresApi } from '../api/riskScores'
import type { InspectionRiskBriefing } from '../types/riskScore'
import { useToast } from './common/ToastProvider'
import { getDateLocale } from '../utils/dateLocale'
import {
  WarningAmberIcon,
  InfoOutlinedIcon,
  CheckCircleIcon,
  ErrorIcon,
  LocationOnIcon,
} from '@/icons'
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
  styled,
} from '@/mui'

interface PreInspectionBriefingProps {
  inspectionId: string
}

const BriefingContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  marginBottom: theme.spacing(2),
}))

const RiskAreaCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 8,
  marginBottom: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 200ms ease-out',
  '&:hover': {
    boxShadow: theme.shadows[2],
  },
}))

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'critical':
      return 'error'
    case 'high':
      return 'warning'
    case 'medium':
      return 'info'
    case 'low':
      return 'success'
    default:
      return 'default'
  }
}

const getRiskLevelIcon = (level: string) => {
  switch (level) {
    case 'critical':
    case 'high':
      return <ErrorIcon fontSize="small" />
    case 'medium':
      return <WarningAmberIcon fontSize="small" />
    case 'low':
      return <CheckCircleIcon fontSize="small" />
    default:
      return <InfoOutlinedIcon fontSize="small" />
  }
}

export default function PreInspectionBriefing({ inspectionId }: PreInspectionBriefingProps) {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [briefing, setBriefing] = useState<InspectionRiskBriefing | null>(null)

  useEffect(() => {
    const loadBriefing = async () => {
      try {
        setLoading(true)
        const data = await riskScoresApi.getInspectionBriefing(inspectionId)
        setBriefing(data)
      } catch {
        showError(t('riskPrediction.briefing.failedToLoad'))
      } finally {
        setLoading(false)
      }
    }

    loadBriefing()
  }, [inspectionId, showError, t])

  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
      </Box>
    )
  }

  if (!briefing || briefing.highRiskAreas.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            {t('riskPrediction.briefing.noRiskAreas')}
          </Typography>
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 10 }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          bgcolor: 'background.default',
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 24 }} />
          <Typography variant="h6" fontWeight={700} letterSpacing="-0.02em">
            {t('riskPrediction.briefing.title')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('riskPrediction.briefing.subtitle')}
        </Typography>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
        <BriefingContainer>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              {t('riskPrediction.briefing.overallRisk')}
            </Typography>
            <Chip
              label={t(`riskPrediction.riskLevel.${briefing.overallRiskLevel}`)}
              color={getRiskLevelColor(briefing.overallRiskLevel) as any}
              icon={getRiskLevelIcon(briefing.overallRiskLevel)}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('riskPrediction.briefing.areasAnalyzed', { count: briefing.totalAreasAnalyzed })}
          </Typography>
        </BriefingContainer>

        <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('riskPrediction.briefing.highRiskAreas')}
        </Typography>

        {briefing.highRiskAreas.map((area) => (
          <RiskAreaCard key={area.areaId}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <LocationOnIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {area.areaName}
                  </Typography>
                  {area.areaCode && (
                    <Typography variant="caption" color="text.secondary">
                      {area.areaCode}
                      {area.floorNumber !== undefined && ` • ${t('riskPrediction.briefing.floor')} ${area.floorNumber}`}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Chip
                label={t(`riskPrediction.riskLevel.${area.riskLevel}`)}
                color={getRiskLevelColor(area.riskLevel) as any}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {t('riskPrediction.briefing.riskScore')}
              </Typography>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {area.riskScore.toFixed(1)}
              </Typography>
            </Box>

            {area.predictedDefectTypes.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  {t('riskPrediction.briefing.predictedDefects')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {area.predictedDefectTypes.map((defectType, idx) => (
                    <Chip
                      key={idx}
                      label={defectType}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        height: 24,
                        borderColor: 'divider',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t('riskPrediction.briefing.historicalDefects', { count: area.defectCount })}
              </Typography>
            </Box>
          </RiskAreaCard>
        ))}

        {briefing.recommendations && briefing.recommendations.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5 }}>
              {t('riskPrediction.briefing.recommendations')}
            </Typography>
            <BriefingContainer>
              <List sx={{ py: 0 }}>
                {briefing.recommendations.map((rec, idx) => (
                  <ListItem key={idx} sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={rec}
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: 'text.primary',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </BriefingContainer>
          </Box>
        )}

        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t('riskPrediction.briefing.generatedAt')}: {new Date(briefing.generatedAt).toLocaleString(getDateLocale())}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
