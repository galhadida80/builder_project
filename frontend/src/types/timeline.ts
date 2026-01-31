// Timeline data structures for Gantt chart visualization

/**
 * Task type determines how the task is rendered on the timeline
 * - task: Standard task bar
 * - project: Top-level project/phase (collapsible group)
 * - milestone: Point-in-time marker (rendered as diamond)
 */
export type GanttTaskType = 'task' | 'project' | 'milestone'

/**
 * Link type defines the dependency relationship between tasks
 * - e2e: End-to-End (finish of source to finish of target)
 * - e2s: End-to-Start (finish of source to start of target) - most common
 * - s2e: Start-to-End (start of source to finish of target)
 * - s2s: Start-to-Start (start of source to start of target)
 */
export type GanttLinkType = 'e2e' | 'e2s' | 's2e' | 's2s'

/**
 * Represents a task, project phase, or milestone on the timeline
 */
export interface GanttTask {
  id: string
  text: string
  start: string // ISO date string (YYYY-MM-DD)
  end?: string // ISO date string (YYYY-MM-DD) - optional for milestones
  duration?: number // Duration in days
  parent?: string // ID of parent task/project (for hierarchical nesting)
  type?: GanttTaskType // Defaults to 'task' if not specified
  progress?: number // Completion percentage (0-100)
  open?: boolean // Whether the task is expanded (for project type)
  details?: string // Additional task details/description
}

/**
 * Represents a dependency relationship between two tasks
 */
export interface GanttLink {
  id: string
  source: string // ID of the source task
  target: string // ID of the target task
  type: GanttLinkType // Type of dependency relationship
}

/**
 * Configuration for a single timeline scale unit (e.g., day, week, month)
 */
export interface GanttScale {
  unit: 'day' | 'week' | 'month' | 'quarter' | 'year'
  step?: number // Number of units per grid cell (default: 1)
  format?: string // Date format string for labels
}

/**
 * Complete timeline data structure passed to Gantt component
 */
export interface TimelineData {
  tasks: GanttTask[]
  links: GanttLink[]
  scales?: GanttScale[] // Timeline scale configuration (defaults to month/day if not provided)
}

/**
 * Filter options for timeline view
 */
export interface TimelineFilter {
  phase?: string // Filter by project phase (Foundation, Framing, etc.)
  status?: 'not_started' | 'in_progress' | 'completed' | 'delayed'
  assignee?: string // Filter by assigned user ID
  showMilestones?: boolean // Toggle milestone visibility
  showDependencies?: boolean // Toggle dependency arrow visibility
}

/**
 * Zoom level configuration for timeline scaling
 */
export interface TimelineZoomLevel {
  level: number // Zoom level (0 = most zoomed out, higher = more zoomed in)
  scales: GanttScale[] // Scale configuration for this zoom level
  label: string // Human-readable label (e.g., "Month", "Week", "Day")
}
