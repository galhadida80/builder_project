import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

interface WorkloadCalendarProps {
  startDate: Dayjs
  endDate: Dayjs
  onChange: (startDate: Dayjs, endDate: Dayjs) => void
  minDate?: Dayjs
  maxDate?: Dayjs
}

type DateRangePreset = 'this-week' | 'this-month' | 'custom'

export function WorkloadCalendar({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate
}: WorkloadCalendarProps) {
  const { t } = useTranslation()
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('this-week')
  const [customMode, setCustomMode] = useState(false)

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset)
    setCustomMode(preset === 'custom')

    const today = dayjs()
    let newStartDate: Dayjs
    let newEndDate: Dayjs

    switch (preset) {
      case 'this-week':
        newStartDate = today.startOf('week')
        newEndDate = today.endOf('week')
        break
      case 'this-month':
        newStartDate = today.startOf('month')
        newEndDate = today.endOf('month')
        break
      case 'custom':
        return
      default:
        newStartDate = startDate
        newEndDate = endDate
    }

    onChange(newStartDate, newEndDate)
  }

  const handlePreviousPeriod = () => {
    if (selectedPreset === 'this-week') {
      const newStart = startDate.subtract(1, 'week').startOf('week')
      const newEnd = startDate.subtract(1, 'week').endOf('week')
      onChange(newStart, newEnd)
    } else if (selectedPreset === 'this-month') {
      const newStart = startDate.subtract(1, 'month').startOf('month')
      const newEnd = startDate.subtract(1, 'month').endOf('month')
      onChange(newStart, newEnd)
    } else {
      const diff = endDate.diff(startDate, 'day')
      const newStart = startDate.subtract(diff + 1, 'day')
      const newEnd = startDate.subtract(1, 'day')
      onChange(newStart, newEnd)
    }
  }

  const handleNextPeriod = () => {
    if (selectedPreset === 'this-week') {
      const newStart = startDate.add(1, 'week').startOf('week')
      const newEnd = startDate.add(1, 'week').endOf('week')
      onChange(newStart, newEnd)
    } else if (selectedPreset === 'this-month') {
      const newStart = startDate.add(1, 'month').startOf('month')
      const newEnd = startDate.add(1, 'month').endOf('month')
      onChange(newStart, newEnd)
    } else {
      const diff = endDate.diff(startDate, 'day')
      const newStart = endDate.add(1, 'day')
      const newEnd = endDate.add(diff + 1, 'day')
      onChange(newStart, newEnd)
    }
  }

  const formatDateRange = () => {
    const start = startDate.format('MMM D, YYYY')
    const end = endDate.format('MMM D, YYYY')
    return `${start} - ${end}`
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CalendarTodayIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>
              {t('workloadCalendar.title')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Button
              variant={selectedPreset === 'this-week' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handlePresetChange('this-week')}
            >
              {t('workloadCalendar.thisWeek')}
            </Button>
            <Button
              variant={selectedPreset === 'this-month' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handlePresetChange('this-month')}
            >
              {t('workloadCalendar.thisMonth')}
            </Button>
            <Button
              variant={selectedPreset === 'custom' ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handlePresetChange('custom')}
            >
              {t('workloadCalendar.customRange')}
            </Button>
          </Box>

          {customMode ? (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
              <DatePicker
                label={t('workloadCalendar.startDate')}
                value={startDate}
                onChange={(newValue) => {
                  if (newValue) {
                    onChange(newValue, endDate.isBefore(newValue) ? newValue : endDate)
                  }
                }}
                minDate={minDate}
                maxDate={endDate}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                  },
                }}
              />
              <DatePicker
                label={t('workloadCalendar.endDate')}
                value={endDate}
                onChange={(newValue) => {
                  if (newValue) {
                    onChange(startDate.isAfter(newValue) ? newValue : startDate, newValue)
                  }
                }}
                minDate={startDate}
                maxDate={maxDate}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                  },
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'action.hover',
                borderRadius: 2,
                p: 2,
                mb: 2,
              }}
            >
              <IconButton
                size="small"
                onClick={handlePreviousPeriod}
                sx={{
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>

              <Typography variant="body1" fontWeight={600}>
                {formatDateRange()}
              </Typography>

              <IconButton
                size="small"
                onClick={handleNextPeriod}
                sx={{
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              bgcolor: 'primary.lighter',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'primary.light',
            }}
          >
            <CalendarTodayIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="caption" color="text.secondary">
              {t('workloadCalendar.daysSelected', { count: endDate.diff(startDate, 'day') + 1 })}
            </Typography>
          </Box>
        </Box>
      </Card>
    </LocalizationProvider>
  )
}
