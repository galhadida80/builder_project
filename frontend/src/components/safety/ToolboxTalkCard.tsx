import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { StatusBadge } from '../ui/StatusBadge'
import { getDateLocale } from '../../utils/dateLocale'
import { Box, Typography, Stack, useTheme } from '@/mui'
import type { ToolboxTalk } from '../../types/safety'

interface ToolboxTalkCardProps {
  talk: ToolboxTalk
  onClick: () => void
}

export function ToolboxTalkCard({ talk, onClick }: ToolboxTalkCardProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const attendedCount = talk.attendees.filter((a) => a.attended).length
  const totalAttendees = talk.attendees.length

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        '&:hover': { boxShadow: theme.shadows[4] },
      }}
    >
      <Stack spacing={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="subtitle1" fontWeight={600}>
            {talk.title}
          </Typography>
          <StatusBadge status={talk.status} />
        </Box>

        <Typography variant="body2" color="text.secondary">
          {talk.topic}
        </Typography>

        <Box display="flex" gap={2} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('toolboxTalks.scheduledDate')}
            </Typography>
            <Typography variant="body2">
              {new Date(talk.scheduledDate).toLocaleDateString(getDateLocale())}
            </Typography>
          </Box>
          {talk.presenter && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('toolboxTalks.presenter')}
              </Typography>
              <Typography variant="body2">{talk.presenter}</Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('toolboxTalks.attendance')}
            </Typography>
            <Typography variant="body2">
              {attendedCount}/{totalAttendees}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Card>
  )
}
