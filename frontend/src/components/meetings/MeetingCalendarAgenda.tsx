import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/he'
import type { Meeting } from '../../types'
import { colors } from '../../theme/tokens'
import { ChevronLeftIcon, ChevronRightIcon, AddIcon, SyncIcon } from '@/icons'
import { Box, Typography, Paper, IconButton, Chip, Tooltip } from '@/mui'
import { styled } from '@/mui'

interface MeetingCalendarAgendaProps {
  meetings: Meeting[]
  currentMonth: Dayjs
  onMonthChange: (month: Dayjs) => void
  onMeetingClick: (meeting: Meeting) => void
  onDayClick: (date: Dayjs) => void
}

const MEETING_TYPE_COLORS: Record<string, string> = {
  site_inspection: colors.teal[500],
  approval_meeting: colors.accent.primary,
  coordination: colors.info.main,
  safety_review: colors.orange[500],
  other: '#9E9E9E',
}

const AgendaContainer = styled(Paper)(({ theme }) => ({
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
}))

const AgendaHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
}))

export function MeetingCalendarAgenda({
  meetings,
  currentMonth,
  onMonthChange,
  onMeetingClick,
  onDayClick,
}: MeetingCalendarAgendaProps) {
  const { t, i18n } = useTranslation()
  const isHebrew = i18n.language === 'he'

  const monthLabel = useMemo(() => {
    const locale = isHebrew ? 'he' : 'en'
    return currentMonth.locale(locale).format('MMMM YYYY')
  }, [currentMonth, isHebrew])

  const groupedMeetings = useMemo(() => {
    const monthStart = currentMonth.startOf('month')
    const monthEnd = currentMonth.endOf('month')
    const filtered = meetings.filter((m) => {
      const d = dayjs(m.scheduledDate)
      return d.isAfter(monthStart.subtract(1, 'day')) && d.isBefore(monthEnd.add(1, 'day'))
    })
    filtered.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())

    const groups = new Map<string, Meeting[]>()
    filtered.forEach((meeting) => {
      const key = dayjs(meeting.scheduledDate).format('YYYY-MM-DD')
      const existing = groups.get(key) || []
      existing.push(meeting)
      groups.set(key, existing)
    })
    return groups
  }, [meetings, currentMonth])

  const locale = isHebrew ? 'he' : 'en'

  return (
    <AgendaContainer elevation={0}>
      <AgendaHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" fontWeight={600} sx={{ textTransform: 'capitalize', fontSize: '1.1rem' }}>
            {monthLabel}
          </Typography>
          <Chip
            label={t('meetings.calendarToday')}
            size="small"
            onClick={() => onMonthChange(dayjs())}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" aria-label={t('common.previous')} onClick={() => onMonthChange(currentMonth.subtract(1, 'month'))}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" aria-label={t('common.next')} onClick={() => onMonthChange(currentMonth.add(1, 'month'))}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </AgendaHeader>

      <Box sx={{ p: 1.5 }}>
        {groupedMeetings.size === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              {t('meetings.noMeetingsFound')}
            </Typography>
          </Box>
        ) : (
          Array.from(groupedMeetings.entries()).map(([dateKey, dayMeetings]) => {
            const date = dayjs(dateKey)
            const isToday = date.isSame(dayjs(), 'day')
            return (
              <Box key={dateKey} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{
                        ...(isToday && { color: 'primary.main' }),
                      }}
                    >
                      {date.locale(locale).format('dddd, D MMMM')}
                    </Typography>
                    {isToday && (
                      <Chip label={t('meetings.calendarToday')} size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <IconButton size="small" aria-label={t('meetings.addMeeting')} onClick={() => onDayClick(date)}>
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>

                {dayMeetings.map((meeting) => {
                  const color = MEETING_TYPE_COLORS[meeting.meetingType || 'other'] || MEETING_TYPE_COLORS.other
                  return (
                    <Box
                      key={meeting.id}
                      onClick={() => onMeetingClick(meeting)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1,
                        px: 1.5,
                        mb: 0.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ flexShrink: 0 }}>
                        {dayjs(meeting.scheduledDate).format('HH:mm')}
                      </Typography>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {meeting.title}
                      </Typography>
                      {meeting.calendarSynced && (
                        <Tooltip title={t('meetings.calendar.synced')}>
                          <SyncIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
                        </Tooltip>
                      )}
                    </Box>
                  )
                })}
              </Box>
            )
          })
        )}
      </Box>
    </AgendaContainer>
  )
}
