import { useTranslation } from 'react-i18next'
import { getDateLocale } from '@/utils/dateLocale'
import { Card } from '@/components/ui/Card'
import type { Task } from '@/types'
import { CheckCircleIcon, WarningIcon, AccessTimeIcon } from '@/icons'
import { Box, Typography, Chip } from '@/mui'

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#F1F5F9', text: '#64748B' },
  medium: { bg: '#DBEAFE', text: '#2563EB' },
  high: { bg: '#FFEDD5', text: '#EA580C' },
  urgent: { bg: '#FEE2E2', text: '#DC2626' },
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isOverdue(task: Task) {
  return task.dueDate && task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.dueDate) < new Date()
}

interface TaskCardProps {
  task: Task
  onClick?: (task: Task) => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { t } = useTranslation()
  const c = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low
  const overdue = isOverdue(task)
  const isComplete = task.status === 'completed'
  const borderColor = overdue ? '#DC2626' : task.priority === 'urgent' ? '#DC2626' : task.priority === 'high' ? '#e07842' : task.priority === 'medium' ? '#2563EB' : '#64748B'
  const dueTime = task.dueDate ? new Date(task.dueDate).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <Card
      hoverable
      onClick={() => onClick?.(task)}
      sx={{
        borderInlineStart: '4px solid',
        borderInlineStartColor: borderColor,
        opacity: isComplete ? 0.6 : 1,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              flexShrink: 0,
              mt: 0.25,
              border: '2px solid',
              borderColor: isComplete ? 'success.main' : 'divider',
              bgcolor: isComplete ? 'success.main' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isComplete && <CheckCircleIcon sx={{ fontSize: 16, color: 'white' }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                lineHeight: 1.3,
                mb: 0.75,
                ...(isComplete && { textDecoration: 'line-through', color: 'text.disabled' }),
              }}
            >
              {task.title}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1, fontSize: '0.65rem' }}>
              <Chip
                label={`#${task.taskNumber}`}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.text }} />
                <Typography variant="caption" sx={{ color: c.text, fontWeight: 700, fontSize: '0.65rem' }}>
                  {t(`tasks.priorities.${task.priority}`, { defaultValue: task.priority })}
                </Typography>
              </Box>
              {task.dueDate && (
                <Typography
                  variant="caption"
                  sx={{
                    color: overdue ? 'error.main' : 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                  }}
                >
                  {overdue && <WarningIcon sx={{ fontSize: 12 }} />}
                  <AccessTimeIcon sx={{ fontSize: 12 }} />
                  {isToday(task.dueDate) && dueTime ? `${t('tasks.today')} ${dueTime}` : new Date(task.dueDate).toLocaleDateString(getDateLocale())}
                </Typography>
              )}
            </Box>
            {task.description && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.description}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {task.assignee ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.55rem',
                      fontWeight: 700,
                    }}
                  >
                    {task.assignee.fullName?.charAt(0) || '?'}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {task.assignee.fullName}
                  </Typography>
                </Box>
              ) : <Box />}
              <Chip
                label={t(`tasks.statuses.${task.status}`, { defaultValue: task.status })}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: isComplete ? 'success.light' : 'action.hover',
                  color: isComplete ? 'success.dark' : 'text.secondary',
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Card>
  )
}
