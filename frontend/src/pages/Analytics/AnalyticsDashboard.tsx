import { useState } from 'react'
import { Box, Typography, Grid } from '@mui/material'
import dayjs, { Dayjs } from 'dayjs'
import DateRangeSelector from './components/DateRangeSelector'
import AnalyticsKPICard from './components/KPICard'
import ProjectMetricsChart from './components/ProjectMetricsChart'
import AssessmentIcon from '@mui/icons-material/Assessment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

export default function AnalyticsDashboard() {
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(30, 'day'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())

  const handleDateChange = (newStartDate: Dayjs | null, newEndDate: Dayjs | null) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive analytics and insights for your projects
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Date Range
        </Typography>
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Key Metrics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <AnalyticsKPICard
              title="Total Projects"
              value={24}
              trend={12.5}
              trendLabel="vs last month"
              icon={<AssessmentIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AnalyticsKPICard
              title="Active Inspections"
              value={156}
              trend={8.2}
              trendLabel="vs last month"
              icon={<CheckCircleIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AnalyticsKPICard
              title="Pending RFIs"
              value={42}
              trend={-5.3}
              trendLabel="vs last month"
              icon={<PendingActionsIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AnalyticsKPICard
              title="Approval Rate"
              value="94.5%"
              trend={2.1}
              trendLabel="vs last month"
              icon={<TrendingUpIcon />}
              color="info"
            />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Project Metrics Over Time
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ProjectMetricsChart
              title="Inspections & RFIs"
              data={[
                {
                  label: 'Inspections Completed',
                  values: [12, 19, 15, 22, 18, 25, 28],
                },
                {
                  label: 'RFIs Submitted',
                  values: [8, 12, 10, 15, 13, 18, 20],
                },
              ]}
              xAxisLabels={['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7']}
              height={350}
            />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Selected Range: {startDate?.format('MMM DD, YYYY')} - {endDate?.format('MMM DD, YYYY')}
        </Typography>
      </Box>
    </Box>
  )
}
