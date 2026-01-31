import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Gantt } from '@svar-ui/react-gantt'
import '@svar-ui/react-gantt/index.css'
import { GanttTask, GanttLink, GanttScale } from '../../types/timeline'

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
  borderRadius: 8,
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
  '& .gantt': {
    fontFamily: theme.typography.fontFamily,
  },
  '& .gantt-task': {
    cursor: 'pointer',
    transition: 'opacity 200ms ease-out',
    '&:hover': {
      opacity: 0.8,
    },
  },
  '& .gantt-milestone': {
    fill: theme.palette.warning.main,
    stroke: theme.palette.warning.dark,
  },
  '& .gantt-link-arrow': {
    stroke: theme.palette.text.secondary,
  },
  '& .gantt-today': {
    stroke: theme.palette.error.main,
    strokeWidth: 2,
  },
}))

export function GanttChart({
  tasks,
  links = [],
  scales,
  className,
  onTaskClick,
  onTaskDoubleClick,
}: GanttChartProps) {
  // Default scales if not provided
  const defaultScales: GanttScale[] = [
    { unit: 'month', format: 'MMM YYYY' },
    { unit: 'day', format: 'D' },
  ]

  const ganttScales = scales || defaultScales

  return (
    <GanttContainer className={className}>
      <Gantt
        tasks={tasks}
        links={links}
        scales={ganttScales}
        cellWidth={40}
        cellHeight={40}
        scaleHeight={50}
        start={null}
        end={null}
      />
    </GanttContainer>
  )
}
