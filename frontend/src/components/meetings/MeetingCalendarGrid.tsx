import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/he'
import type { Meeting } from '../../types'
import { colors } from '../../theme/tokens'
import { ChevronLeftIcon, ChevronRightIcon, AddIcon } from '@/icons'
import { Box, Typography, Paper, IconButton, Chip, Tooltip } from '@/mui'
import { styled, alpha } from '@/mui'

interface MeetingCalendarGridProps {
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

const CalendarContainer = styled(Paper)(({ theme }) => ({
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
}))

const CalendarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
}))

const DayCell = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isToday' && prop !== 'isCurrentMonth',
})<{ isToday?: boolean; isCurrentMonth?: boolean }>(({ theme, isToday, isCurrentMonth }) => ({
  minHeight: 110,
  padding: theme.spacing(0.5),
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  opacity: isCurrentMonth ? 1 : 0.4,
  backgroundColor: isToday
    ? alpha(theme.palette.primary.main, 0.06)
    : 'transparent',
  transition: 'background-color 150ms ease-out',
  '&:hover': {
    backgroundColor: isToday
      ? alpha(theme.palette.primary.main, 0.1)
      : theme.palette.action.hover,
  },
  '&:nth-of-type(7n)': {
    borderRight: 'none',
  },
}))

const MeetingChip = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'typeColor',
})<{ typeColor: string }>(({ theme, typeColor }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 6px',
  marginBottom: 2,
  borderRadius: 4,
  borderLeft: `3px solid ${typeColor}`,
  backgroundColor: alpha(typeColor, theme.palette.mode === 'dark' ? 0.15 : 0.08),
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'background-color 150ms ease-out',
  '&:hover': {
    backgroundColor: alpha(typeColor, 0.2),
  },
}))

function getMeetingColor(meetingType?: string): string {
  return MEETING_TYPE_COLORS[meetingType || 'other'] || MEETING_TYPE_COLORS.other
}

export function MeetingCalendarGrid({
  meetings,
  currentMonth,
  onMonthChange,
  onMeetingClick,
  onDayClick,
}: MeetingCalendarGridProps) {
  const { t, i18n } = useTranslation()
  const isHebrew = i18n.language === 'he'

  const calendarDays = useMemo(() => {
    const start = currentMonth.startOf('month').startOf('week')
    const days: Dayjs[] = []
    for (let i = 0; i < 42; i++) {
      days.push(start.add(i, 'day'))
    }
    return days
  }, [currentMonth])

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Meeting[]>()
    meetings.forEach((meeting) => {
      const key = dayjs(meeting.scheduledDate).format('YYYY-MM-DD')
      const existing = map.get(key) || []
      existing.push(meeting)
      map.set(key, existing)
    })
    return map
  }, [meetings])

  const weekDays = useMemo(() => {
    const locale = isHebrew ? 'he' : 'en'
    return Array.from({ length: 7 }, (_, i) =>
      dayjs().locale(locale).day(i).format('ddd')
    )
  }, [isHebrew])

  const monthLabel = useMemo(() => {
    const locale = isHebrew ? 'he' : 'en'
    return currentMonth.locale(locale).format('MMMM YYYY')
  }, [currentMonth, isHebrew])

  const today = dayjs()

  const formatTime = (dateString: string) => {
    return dayjs(dateString).format('HH:mm')
  }

  return (
    <CalendarContainer elevation={0}>
      <CalendarHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
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
          <IconButton size="small" onClick={() => onMonthChange(currentMonth.subtract(1, 'month'))}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={() => onMonthChange(currentMonth.add(1, 'month'))}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </CalendarHeader>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
        }}
      >
        {weekDays.map((day) => (
          <Box key={day} sx={{ py: 1, textAlign: 'center' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {calendarDays.map((day) => {
          const dateKey = day.format('YYYY-MM-DD')
          const dayMeetings = meetingsByDate.get(dateKey) || []
          const isCurrentMonth = day.month() === currentMonth.month()
          const isToday = day.isSame(today, 'day')
          const visibleMeetings = dayMeetings.slice(0, 2)
          const overflow = dayMeetings.length - 2

          return (
            <DayCell
              key={dateKey}
              isToday={isToday}
              isCurrentMonth={isCurrentMonth}
              onClick={() => onDayClick(day)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5, mb: 0.5 }}>
                <Typography
                  variant="caption"
                  fontWeight={isToday ? 700 : 500}
                  sx={{
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    ...(isToday && {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }),
                  }}
                >
                  {day.date()}
                </Typography>
                {isCurrentMonth && dayMeetings.length === 0 && (
                  <IconButton
                    size="small"
                    sx={{ opacity: 0, '.MuiBox-root:hover > .MuiBox-root > &': { opacity: 0.5 }, width: 20, height: 20 }}
                    onClick={(e) => { e.stopPropagation(); onDayClick(day) }}
                  >
                    <AddIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>

              {visibleMeetings.map((meeting) => {
                const color = getMeetingColor(meeting.meetingType)
                return (
                  <Tooltip key={meeting.id} title={meeting.title} placement="top">
                    <MeetingChip
                      typeColor={color}
                      onClick={(e) => { e.stopPropagation(); onMeetingClick(meeting) }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}>
                        {formatTime(meeting.scheduledDate)}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {meeting.title}
                      </Typography>
                    </MeetingChip>
                  </Tooltip>
                )
              })}

              {overflow > 0 && (
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.6rem', fontWeight: 600, color: 'primary.main', px: 0.5, cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); onDayClick(day) }}
                >
                  {t('meetings.calendarMoreMeetings', { count: overflow })}
                </Typography>
              )}
            </DayCell>
          )
        })}
      </Box>
    </CalendarContainer>
  )
}
