import { TeamMember, WorkloadAssignment } from '../types'

// Constants for workload calculation
export const WORKLOAD_CONSTANTS = {
  DEFAULT_AVAILABLE_HOURS_PER_WEEK: 40,
  MEETING_HOURS_ESTIMATE: 1.5, // Average 1-2 hours
  INSPECTION_HOURS_ESTIMATE: 3, // Average 2-4 hours
  APPROVAL_HOURS_ESTIMATE: 0.75, // Average 0.5-1 hour
  TASK_HOURS_DEFAULT: 4, // Default for tasks without estimate
}

// Color coding thresholds
export const WORKLOAD_THRESHOLDS = {
  UNDER_UTILIZED: 60, // 0-60% green
  OPTIMAL: 90, // 61-90% yellow
  HIGH: 100, // 91-100% orange
  // > 100% red (over-allocated)
}

export type WorkloadLevel = 'under-utilized' | 'optimal' | 'high' | 'over-allocated'
export type WorkloadColor = 'success' | 'warning' | 'error'

/**
 * Calculate estimated hours for an assignment based on its type
 */
export const estimateAssignmentHours = (assignment: WorkloadAssignment): number => {
  // If assignment already has estimated hours, use that
  if (assignment.estimatedHours && assignment.estimatedHours > 0) {
    return assignment.estimatedHours
  }

  // Otherwise, use default estimates based on type
  switch (assignment.type) {
    case 'meeting':
      return WORKLOAD_CONSTANTS.MEETING_HOURS_ESTIMATE
    case 'inspection':
      return WORKLOAD_CONSTANTS.INSPECTION_HOURS_ESTIMATE
    case 'approval':
      return WORKLOAD_CONSTANTS.APPROVAL_HOURS_ESTIMATE
    case 'task':
      return WORKLOAD_CONSTANTS.TASK_HOURS_DEFAULT
    default:
      return 0
  }
}

/**
 * Calculate total assigned hours from a list of assignments
 */
export const calculateTotalAssignedHours = (assignments: WorkloadAssignment[]): number => {
  if (!assignments || assignments.length === 0) {
    return 0
  }

  return assignments.reduce((total, assignment) => {
    return total + estimateAssignmentHours(assignment)
  }, 0)
}

/**
 * Calculate workload percentage
 * @param assignedHours - Total hours assigned to the team member
 * @param availableHours - Available hours for the team member
 * @returns Workload percentage (can exceed 100%)
 */
export const calculateWorkloadPercentage = (
  assignedHours: number,
  availableHours: number
): number => {
  if (availableHours <= 0) {
    return 0
  }

  const percentage = (assignedHours / availableHours) * 100
  return Math.round(percentage * 10) / 10 // Round to 1 decimal place
}

/**
 * Determine workload level based on percentage
 */
export const getWorkloadLevel = (workloadPercent: number): WorkloadLevel => {
  if (workloadPercent <= WORKLOAD_THRESHOLDS.UNDER_UTILIZED) {
    return 'under-utilized'
  }
  if (workloadPercent <= WORKLOAD_THRESHOLDS.OPTIMAL) {
    return 'optimal'
  }
  if (workloadPercent <= WORKLOAD_THRESHOLDS.HIGH) {
    return 'high'
  }
  return 'over-allocated'
}

/**
 * Get color for workload visualization based on percentage
 */
export const getWorkloadColor = (workloadPercent: number): WorkloadColor => {
  if (workloadPercent <= WORKLOAD_THRESHOLDS.OPTIMAL) {
    return 'success' // Green (under-utilized and optimal)
  }
  if (workloadPercent <= WORKLOAD_THRESHOLDS.HIGH) {
    return 'warning' // Orange (high)
  }
  return 'error' // Red (over-allocated)
}

/**
 * Get descriptive label for workload level
 */
export const getWorkloadLabel = (workloadPercent: number): string => {
  const level = getWorkloadLevel(workloadPercent)

  switch (level) {
    case 'under-utilized':
      return 'Under-utilized'
    case 'optimal':
      return 'Optimal'
    case 'high':
      return 'High'
    case 'over-allocated':
      return 'Over-allocated'
    default:
      return 'Unknown'
  }
}

/**
 * Calculate workload for a team member
 * @param member - Team member with assignments
 * @param availableHours - Optional override for available hours
 * @returns Updated team member with calculated workload
 */
export const calculateTeamMemberWorkload = (
  member: TeamMember,
  availableHours?: number
): TeamMember => {
  const available = availableHours ?? member.availableHours ?? WORKLOAD_CONSTANTS.DEFAULT_AVAILABLE_HOURS_PER_WEEK
  const assigned = member.assignments ? calculateTotalAssignedHours(member.assignments) : member.assignedHours ?? 0
  const workloadPercent = calculateWorkloadPercentage(assigned, available)

  return {
    ...member,
    availableHours: available,
    assignedHours: assigned,
    workloadPercent,
  }
}

/**
 * Calculate aggregate workload statistics for a team
 */
export const calculateTeamWorkloadStats = (members: TeamMember[]): {
  totalMembers: number
  totalAvailableHours: number
  totalAssignedHours: number
  averageWorkloadPercent: number
  underUtilizedCount: number
  optimalCount: number
  highCount: number
  overAllocatedCount: number
} => {
  if (!members || members.length === 0) {
    return {
      totalMembers: 0,
      totalAvailableHours: 0,
      totalAssignedHours: 0,
      averageWorkloadPercent: 0,
      underUtilizedCount: 0,
      optimalCount: 0,
      highCount: 0,
      overAllocatedCount: 0,
    }
  }

  const stats = members.reduce(
    (acc, member) => {
      const available = member.availableHours ?? WORKLOAD_CONSTANTS.DEFAULT_AVAILABLE_HOURS_PER_WEEK
      const assigned = member.assignedHours ?? 0
      const level = getWorkloadLevel(member.workloadPercent ?? 0)

      acc.totalAvailableHours += available
      acc.totalAssignedHours += assigned

      switch (level) {
        case 'under-utilized':
          acc.underUtilizedCount++
          break
        case 'optimal':
          acc.optimalCount++
          break
        case 'high':
          acc.highCount++
          break
        case 'over-allocated':
          acc.overAllocatedCount++
          break
      }

      return acc
    },
    {
      totalMembers: members.length,
      totalAvailableHours: 0,
      totalAssignedHours: 0,
      averageWorkloadPercent: 0,
      underUtilizedCount: 0,
      optimalCount: 0,
      highCount: 0,
      overAllocatedCount: 0,
    }
  )

  // Calculate average workload percentage
  stats.averageWorkloadPercent = calculateWorkloadPercentage(
    stats.totalAssignedHours,
    stats.totalAvailableHours
  )

  return stats
}

/**
 * Filter assignments by date range
 */
export const filterAssignmentsByDateRange = (
  assignments: WorkloadAssignment[],
  startDate: Date | string,
  endDate: Date | string
): WorkloadAssignment[] => {
  if (!assignments || assignments.length === 0) {
    return []
  }

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  return assignments.filter((assignment) => {
    if (!assignment.scheduledDate) {
      return true // Include assignments without scheduled date
    }

    const scheduledDate = new Date(assignment.scheduledDate)
    return scheduledDate >= start && scheduledDate <= end
  })
}

/**
 * Group team members by team name
 */
export const groupMembersByTeam = (members: TeamMember[]): Record<string, TeamMember[]> => {
  if (!members || members.length === 0) {
    return {}
  }

  return members.reduce((groups, member) => {
    const teamName = member.teamName || 'Unassigned'
    if (!groups[teamName]) {
      groups[teamName] = []
    }
    groups[teamName].push(member)
    return groups
  }, {} as Record<string, TeamMember[]>)
}

/**
 * Sort team members by workload percentage (descending)
 */
export const sortMembersByWorkload = (members: TeamMember[]): TeamMember[] => {
  return [...members].sort((a, b) => {
    const workloadA = a.workloadPercent ?? 0
    const workloadB = b.workloadPercent ?? 0
    return workloadB - workloadA // Descending order
  })
}

/**
 * Check if team member is over capacity
 */
export const isOverCapacity = (member: TeamMember): boolean => {
  return (member.workloadPercent ?? 0) > WORKLOAD_THRESHOLDS.HIGH
}

/**
 * Get available capacity in hours for a team member
 */
export const getAvailableCapacity = (member: TeamMember): number => {
  const available = member.availableHours ?? WORKLOAD_CONSTANTS.DEFAULT_AVAILABLE_HOURS_PER_WEEK
  const assigned = member.assignedHours ?? 0
  const remaining = available - assigned
  return Math.max(0, remaining) // Never return negative
}
