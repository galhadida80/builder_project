import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PersonIcon from '@mui/icons-material/Person'
import { styled, alpha } from '@mui/material/styles'
import dayjs, { Dayjs } from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import type { ConsultantAssignment } from '../../types/consultantAssignment'

dayjs.extend(isBetween)

interface AssignmentCalendarProps {
  assignments: ConsultantAssignment[]
  loading?: boolean
  onAssignmentClick?: (assignment: ConsultantAssignment) => void
}

interface TimelineAssignment extends ConsultantAssignment {
  startPos: number
  width: number
}

const CalendarContainer = styled(Paper)(({ theme }) => ({
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
}))

const TimelineHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
}))

const TimelineGrid = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: 400,
  backgroundColor: theme.palette.background.paper,
}))

const DayHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  borderBottom: `2px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
}))

const ConsultantRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  borderBottom: `1px solid ${theme.palette.divider}`,
  minHeight: 60,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}))

const ConsultantLabel = styled(Box)(({ theme }) => ({
  width: 200,
  flexShrink: 0,
  padding: theme.spacing(1.5, 2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}))

const TimelineContent = styled(Box)(() => ({
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
}))

const AssignmentBar = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'statusColor',
})<{ statusColor: string }>(({ theme, statusColor }) => ({
  position: 'absolute',
  height: 40,
  borderRadius: 6,
  backgroundColor: alpha((theme.palette[statusColor as keyof typeof theme.palette] as any).main as string, 0.2),
  border: `2px solid ${(theme.palette[statusColor as keyof typeof theme.palette] as any).main}`,
  padding: theme.spacing(0.5, 1),
  cursor: 'pointer',
  transition: 'all 200ms ease-out',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
    zIndex: 10,
  },
}))

const getStatusColor = (status: string): 'success' | 'warning' | 'primary' | 'error' => {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'completed':
      return 'primary'
    case 'cancelled':
      return 'error'
    default:
      return 'primary'
  }
}

const DAYS_TO_SHOW = 14

export function AssignmentCalendar({
  assignments,
  loading = false,
  onAssignmentClick,
}: AssignmentCalendarProps) {
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf('week'))

  const endDate = useMemo(() => startDate.add(DAYS_TO_SHOW - 1, 'day'), [startDate])

  const handlePrevWeek = () => {
    setStartDate((prev) => prev.subtract(7, 'day'))
  }

  const handleNextWeek = () => {
    setStartDate((prev) => prev.add(7, 'day'))
  }

  const handleToday = () => {
    setStartDate(dayjs().startOf('week'))
  }

  const dateRange = useMemo(() => {
    const dates: Dayjs[] = []
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      dates.push(startDate.add(i, 'day'))
    }
    return dates
  }, [startDate])

  const consultants = useMemo(() => {
    const consultantMap = new Map<string, { id: string; name: string }>()
    assignments.forEach((assignment) => {
      if (assignment.consultant && !consultantMap.has(assignment.consultantId)) {
        consultantMap.set(assignment.consultantId, {
          id: assignment.consultantId,
          name: assignment.consultant.fullName || assignment.consultant.email || 'Unknown Consultant',
        })
      }
    })
    return Array.from(consultantMap.values())
  }, [assignments])

  const calculateAssignmentPosition = (assignment: ConsultantAssignment): TimelineAssignment | null => {
    const assignmentStart = dayjs(assignment.startDate)
    const assignmentEnd = dayjs(assignment.endDate)

    const viewStart = startDate.startOf('day')
    const viewEnd = endDate.endOf('day')

    if (assignmentEnd.isBefore(viewStart) || assignmentStart.isAfter(viewEnd)) {
      return null
    }

    const displayStart = assignmentStart.isBefore(viewStart) ? viewStart : assignmentStart
    const displayEnd = assignmentEnd.isAfter(viewEnd) ? viewEnd : assignmentEnd

    const dayWidth = 100 / DAYS_TO_SHOW
    const startOffset = displayStart.diff(viewStart, 'day', true)
    const duration = displayEnd.diff(displayStart, 'day', true) + 1

    return {
      ...assignment,
      startPos: startOffset * dayWidth,
      width: duration * dayWidth,
    }
  }

  const consultantAssignments = useMemo(() => {
    return consultants.map((consultant) => {
      const consultantAssignments = assignments
        .filter((a) => a.consultantId === consultant.id)
        .map(calculateAssignmentPosition)
        .filter((a): a is TimelineAssignment => a !== null)

      return {
        consultant,
        assignments: consultantAssignments,
      }
    })
  }, [consultants, assignments, startDate, endDate])

  if (loading) {
    return (
      <CalendarContainer elevation={0}>
        <TimelineHeader>
          <Typography variant="h6" fontWeight={600}>
            Loading calendar...
          </Typography>
        </TimelineHeader>
      </CalendarContainer>
    )
  }

  if (consultants.length === 0) {
    return (
      <CalendarContainer elevation={0}>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">No consultant assignments found</Typography>
        </Box>
      </CalendarContainer>
    )
  }

  return (
    <CalendarContainer elevation={0}>
      <TimelineHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Assignment Timeline
          </Typography>
          <Chip
            label="Today"
            size="small"
            onClick={handleToday}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            {startDate.format('MMM D, YYYY')} - {endDate.format('MMM D, YYYY')}
          </Typography>
          <IconButton size="small" onClick={handlePrevWeek} title="Previous week">
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={handleNextWeek} title="Next week">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </TimelineHeader>

      <TimelineGrid>
        <DayHeader>
          <ConsultantLabel>
            <Typography variant="caption" fontWeight={600} textTransform="uppercase">
              Consultant
            </Typography>
          </ConsultantLabel>
          <Box sx={{ flex: 1, display: 'flex' }}>
            {dateRange.map((date) => {
              const isToday = date.isSame(dayjs(), 'day')
              return (
                <Box
                  key={date.format('YYYY-MM-DD')}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 1,
                    borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                    backgroundColor: (theme) =>
                      isToday
                        ? alpha(theme.palette.primary.main, 0.1)
                        : 'transparent',
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color={isToday ? 'primary' : 'text.secondary'}
                  >
                    {date.format('ddd')}
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    color={isToday ? 'primary' : 'text.secondary'}
                  >
                    {date.format('D')}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </DayHeader>

        {consultantAssignments.map(({ consultant, assignments: consultantAssignments }) => (
          <ConsultantRow key={consultant.id}>
            <ConsultantLabel>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PersonIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={500} noWrap>
                  {consultant.name}
                </Typography>
              </Box>
            </ConsultantLabel>
            <TimelineContent>
              {dateRange.map((date) => (
                <Box
                  key={date.format('YYYY-MM-DD')}
                  sx={{
                    position: 'absolute',
                    left: `${(date.diff(startDate, 'day') / DAYS_TO_SHOW) * 100}%`,
                    width: `${100 / DAYS_TO_SHOW}%`,
                    height: '100%',
                    borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                />
              ))}
              {consultantAssignments.map((assignment) => (
                <Tooltip
                  key={assignment.id}
                  title={
                    <Box>
                      <Typography variant="caption" fontWeight={600}>
                        {assignment.project?.name || 'No project'}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {dayjs(assignment.startDate).format('MMM D')} -{' '}
                        {dayjs(assignment.endDate).format('MMM D, YYYY')}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Status: {assignment.status}
                      </Typography>
                    </Box>
                  }
                >
                  <AssignmentBar
                    statusColor={getStatusColor(assignment.status)}
                    onClick={() => onAssignmentClick?.(assignment)}
                    sx={{
                      left: `${assignment.startPos}%`,
                      width: `${assignment.width}%`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{
                        color: `${getStatusColor(assignment.status)}.main`,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {assignment.project?.name || 'No project'}
                    </Typography>
                  </AssignmentBar>
                </Tooltip>
              ))}
            </TimelineContent>
          </ConsultantRow>
        ))}
      </TimelineGrid>
    </CalendarContainer>
  )
}
