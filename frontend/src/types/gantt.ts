export type GanttTaskType = 'task' | 'milestone' | 'project'

export type GanttViewMode = 'Hour' | 'QuarterDay' | 'HalfDay' | 'Day' | 'Week' | 'Month' | 'QuarterYear' | 'Year'

export interface GanttTask {
  id: string
  name: string
  type: GanttTaskType
  start: Date
  end: Date
  progress: number // 0-100
  dependencies?: string[]
  styles?: {
    backgroundColor?: string
    backgroundSelectedColor?: string
    progressColor?: string
    progressSelectedColor?: string
  }
  isDisabled?: boolean
  project?: string
  hideChildren?: boolean
}

export interface GanttChartProps {
  tasks: GanttTask[]
  viewMode?: GanttViewMode
  loading?: boolean
  onViewModeChange?: (viewMode: GanttViewMode) => void
  onDateChange?: (task: GanttTask, start: Date, end: Date) => void
  onProgressChange?: (task: GanttTask, progress: number) => void
  onDelete?: (task: GanttTask) => void
  onExpanderClick?: (task: GanttTask) => void
}

export interface GanttFilterOptions {
  type?: GanttTaskType | 'all'
  showCompleted?: boolean
  searchTerm?: string
}
