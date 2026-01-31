import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AssignmentIcon from '@mui/icons-material/Assignment'
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import type { Inspection } from '../types'
import { inspectionsApi } from '../api/inspections'

export default function InspectorDashboard() {
  const [loading, setLoading] = useState(true)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [isOffline] = useState(false)

  // For demo purposes, using a hardcoded project ID
  // In production, this would come from user context or route params
  const projectId = '1'

  useEffect(() => {
    loadTodayInspections()
  }, [])

  const loadTodayInspections = async () => {
    try {
      setLoading(true)
      const allInspections = await inspectionsApi.getProjectInspections(projectId)

      // Filter to show only today's inspections
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayInspections = allInspections.filter(inspection => {
        const scheduledDate = new Date(inspection.scheduledDate)
        return scheduledDate >= today && scheduledDate < tomorrow
      })

      setInspections(todayInspections)
    } catch (error) {
      setInspections([])
    } finally {
      setLoading(false)
    }
  }

  const handleStartInspection = () => {
    // Placeholder for start inspection action
  }

  const handleTakePhoto = () => {
    // Placeholder for take photo action
  }

  const handleReportIssue = () => {
    // Placeholder for report issue action
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: '428px',
          margin: '0 auto',
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={150} height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={100} height={24} />
        </Box>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="rounded" height={60} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={60} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={60} />
        </Box>
        <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={120} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        maxWidth: '428px',
        margin: '0 auto',
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            Field Inspector
          </Typography>
          {isOffline && (
            <Chip
              icon={<SignalWifiOffIcon sx={{ fontSize: 14 }} />}
              label="OFFLINE"
              size="small"
              sx={{
                bgcolor: 'error.main',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 24,
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Typography>
      </Box>

      {/* Quick Action Buttons */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="success"
          fullWidth
          size="large"
          icon={<CheckCircleIcon />}
          onClick={handleStartInspection}
          sx={{
            mb: 1.5,
            py: 1.5,
            fontSize: '0.95rem',
            letterSpacing: '0.5px',
          }}
        >
          START INSPECTION
        </Button>
        <Button
          variant="primary"
          fullWidth
          size="large"
          icon={<CameraAltIcon />}
          onClick={handleTakePhoto}
          sx={{
            mb: 1.5,
            py: 1.5,
            fontSize: '0.95rem',
            letterSpacing: '0.5px',
          }}
        >
          TAKE PHOTO
        </Button>
        <Button
          variant="danger"
          fullWidth
          size="large"
          icon={<ReportProblemIcon />}
          onClick={handleReportIssue}
          sx={{
            py: 1.5,
            fontSize: '0.95rem',
            letterSpacing: '0.5px',
          }}
        >
          REPORT ISSUE
        </Button>
      </Box>

      {/* Today's Schedule */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 2,
          }}
        >
          Today's Schedule
        </Typography>

        {inspections.length === 0 ? (
          <Card>
            <Box sx={{ p: 3 }}>
              <EmptyState
                icon={<AssignmentIcon sx={{ fontSize: 48 }} />}
                title="No inspections scheduled"
                description="You have no inspections scheduled for today"
              />
            </Box>
          </Card>
        ) : (
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {inspections.map((inspection) => (
              <Card key={inspection.id}>
                <ListItem
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    px: 2,
                    py: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mr: 1.5,
                      }}
                    >
                      <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        sx={{
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {inspection.consultantType?.name || 'Inspection'}
                      </Typography>
                      {inspection.consultantType?.nameHe && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          dir="rtl"
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {inspection.consultantType.nameHe}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(inspection.scheduledDate)}
                      </Typography>
                    </Box>
                    {inspection.currentStage && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {inspection.currentStage}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {inspection.notes && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {inspection.notes}
                    </Typography>
                  )}
                </ListItem>
              </Card>
            ))}
          </List>
        )}
      </Box>
    </Box>
  )
}
