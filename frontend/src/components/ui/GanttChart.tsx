import { GanttTask, GanttLink, GanttScale } from '../../types/timeline'
import { Box, Typography, styled } from '@/mui'

interface GanttChartProps {
  tasks: GanttTask[]
  links?: GanttLink[]
  scales?: GanttScale[]
  className?: string
  onTaskClick?: (task: GanttTask) => void
  onTaskDoubleClick?: (task: GanttTask) => void
}

const GanttContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  minHeight: 400,
  borderRadius: 8,
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.action.hover,
}))

export function GanttChart({
  tasks,
  links = [],
  scales,
  className,
  onTaskClick,
  onTaskDoubleClick,
}: GanttChartProps) {
  void links
  void scales
  void onTaskClick
  void onTaskDoubleClick

  return (
    <GanttContainer className={className}>
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Gantt Chart
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tasks.length} tasks loaded
        </Typography>
      </Box>
    </GanttContainer>
  )
}
