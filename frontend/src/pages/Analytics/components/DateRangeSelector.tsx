import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'

interface DateRangeSelectorProps {
  startDate: Dayjs | null
  endDate: Dayjs | null
  onDateChange: (startDate: Dayjs | null, endDate: Dayjs | null) => void
}

export default function DateRangeSelector({ startDate, endDate, onDateChange }: DateRangeSelectorProps) {
  const { t } = useTranslation()
  const [localStartDate, setLocalStartDate] = useState<Dayjs | null>(startDate)
  const [localEndDate, setLocalEndDate] = useState<Dayjs | null>(endDate)
  const [endDateError, setEndDateError] = useState<string | null>(null)

  useEffect(() => {
    setLocalStartDate(startDate)
  }, [startDate])

  useEffect(() => {
    setLocalEndDate(endDate)
  }, [endDate])

  const handleStartDateChange = (newValue: Dayjs | null) => {
    setLocalStartDate(newValue)

    if (newValue && localEndDate && newValue.isAfter(localEndDate)) {
      setEndDateError(t('analytics.endDateError'))
    } else {
      setEndDateError(null)
      onDateChange(newValue, localEndDate)
    }
  }

  const handleEndDateChange = (newValue: Dayjs | null) => {
    setLocalEndDate(newValue)

    if (localStartDate && newValue && newValue.isBefore(localStartDate)) {
      setEndDateError(t('analytics.endDateError'))
    } else {
      setEndDateError(null)
      onDateChange(localStartDate, newValue)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '200px' } }}>
          <DatePicker
            label={t('analytics.startDate')}
            value={localStartDate}
            onChange={handleStartDateChange}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
              },
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '200px' } }}>
          <DatePicker
            label={t('analytics.endDate')}
            value={localEndDate}
            onChange={handleEndDateChange}
            minDate={localStartDate || undefined}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                error: !!endDateError,
                helperText: endDateError,
              },
            }}
          />
        </Box>
      </Box>

      {endDateError && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 0.5, display: 'block' }}
        >
          {endDateError}
        </Typography>
      )}
    </LocalizationProvider>
  )
}
