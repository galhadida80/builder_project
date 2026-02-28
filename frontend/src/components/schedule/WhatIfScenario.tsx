import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FormModal } from '../ui/Modal'
import { useToast } from '../common/ToastProvider'
import { scheduleRiskApi } from '../../api/scheduleRisk'
import { tasksApi } from '../../api/tasks'
import type { Task } from '../../types'
import type { WhatIfScenarioResponse } from '../../types/scheduleRisk'
import { TimelineIcon, CalendarTodayIcon, WarningIcon } from '@/icons'
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Skeleton,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  alpha,
} from '@/mui'

interface WhatIfScenarioProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export function WhatIfScenario({ open, onClose, projectId }: WhatIfScenarioProps) {
  const { t } = useTranslation()
  const { showError } = useToast()

  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [delayDays, setDelayDays] = useState<number>(1)
  const [result, setResult] = useState<WhatIfScenarioResponse | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (open && projectId) {
      loadTasks()
    }
  }, [open, projectId])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const taskList = await tasksApi.list(projectId)
      setTasks(taskList.filter(t => t.status !== 'completed' && t.status !== 'cancelled'))
    } catch {
      showError(t('scheduleRisk.whatIf.loadTasksFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRunScenario = async () => {
    if (!selectedTask || !projectId) return
    setRunning(true)
    try {
      const response = await scheduleRiskApi.runWhatIfScenario(projectId, {
        taskId: selectedTask.id,
        delayDays,
      })
      setResult(response)
    } catch {
      showError(t('scheduleRisk.whatIf.runFailed'))
    } finally {
      setRunning(false)
    }
  }

  const handleClose = () => {
    setSelectedTask(null)
    setDelayDays(1)
    setResult(null)
    onClose()
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      onSubmit={handleRunScenario}
      title={t('scheduleRisk.whatIf.title')}
      submitLabel={t('scheduleRisk.whatIf.runScenario')}
      submitDisabled={!selectedTask || running}
      loading={running}
      maxWidth="md"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Input Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading ? (
            <Skeleton variant="rectangular" height={56} />
          ) : (
            <Autocomplete
              options={tasks}
              getOptionLabel={(task) => `${task.taskNumber} - ${task.title}`}
              value={selectedTask}
              onChange={(_, newValue) => setSelectedTask(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('scheduleRisk.whatIf.selectTask')}
                  placeholder={t('scheduleRisk.whatIf.selectTaskPlaceholder')}
                  required
                />
              )}
              renderOption={(props, task) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body2" fontWeight={500}>
                      {task.taskNumber} - {task.title}
                    </Typography>
                    {task.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        {t('scheduleRisk.whatIf.dueDate')}: {formatDate(task.dueDate)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              noOptionsText={t('scheduleRisk.whatIf.noTasksAvailable')}
            />
          )}

          <TextField
            type="number"
            label={t('scheduleRisk.whatIf.delayDays')}
            value={delayDays}
            onChange={(e) => setDelayDays(Math.max(1, parseInt(e.target.value) || 1))}
            inputProps={{ min: 1, max: 365 }}
            helperText={t('scheduleRisk.whatIf.delayDaysHelper')}
            required
          />
        </Box>

        {/* Results Section */}
        {result && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                {t('scheduleRisk.whatIf.resultsTitle')}
              </Typography>

              {/* Project Impact Summary */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1),
                  border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('scheduleRisk.whatIf.projectImpact')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('scheduleRisk.whatIf.originalEndDate')}:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatDate(result.originalProjectEndDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('scheduleRisk.whatIf.newEndDate')}:
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="warning.main">
                      {formatDate(result.newProjectEndDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('scheduleRisk.whatIf.totalDelay')}:
                    </Typography>
                    <Chip
                      label={t('scheduleRisk.whatIf.daysDelayed', { days: result.totalProjectDelayDays })}
                      size="small"
                      sx={{
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.15),
                        color: 'error.main',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Affected Tasks List */}
              {result.affectedTasks.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                    {t('scheduleRisk.whatIf.affectedTasks')} ({result.affectedTasks.length})
                  </Typography>
                  <List
                    sx={{
                      maxHeight: 280,
                      overflowY: 'auto',
                      bgcolor: 'background.paper',
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                    }}
                  >
                    {result.affectedTasks.map((affectedTask, index) => (
                      <ListItem
                        key={affectedTask.taskId}
                        divider={index < result.affectedTasks.length - 1}
                        sx={{ py: 1.5 }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={500}>
                              {affectedTask.taskTitle}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(affectedTask.originalDueDate)} →{' '}
                                  <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>
                                    {formatDate(affectedTask.newDueDate)}
                                  </Box>
                                </Typography>
                              </Box>
                              <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 500 }}>
                                +{affectedTask.delayImpactDays}{' '}
                                {t('scheduleRisk.whatIf.daysDelayed', { days: affectedTask.delayImpactDays })}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {result.affectedTasks.length === 0 && (
                <Alert severity="info" icon={<TimelineIcon />}>
                  {t('scheduleRisk.whatIf.noImpact')}
                </Alert>
              )}
            </Box>
          </>
        )}
      </Box>
    </FormModal>
  )
}
