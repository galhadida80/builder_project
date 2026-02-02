import { describe, it, expect } from 'vitest'
import {
  WORKLOAD_CONSTANTS,
  WORKLOAD_THRESHOLDS,
  estimateAssignmentHours,
  calculateTotalAssignedHours,
  calculateWorkloadPercentage,
  getWorkloadLevel,
  getWorkloadColor,
  getWorkloadLabel,
  calculateTeamMemberWorkload,
  calculateTeamWorkloadStats,
  filterAssignmentsByDateRange,
  groupMembersByTeam,
  sortMembersByWorkload,
  isOverCapacity,
  getAvailableCapacity,
} from './workloadCalculation'
import type { TeamMember, WorkloadAssignment } from '../types'

describe('workloadCalculation', () => {
  describe('estimateAssignmentHours', () => {
    it('should use provided estimatedHours when available', () => {
      const assignment: WorkloadAssignment = {
        id: '1',
        type: 'meeting',
        entityId: 'meeting-1',
        title: 'Team Meeting',
        estimatedHours: 5,
        status: 'scheduled',
      }
      expect(estimateAssignmentHours(assignment)).toBe(5)
    })

    it('should use default estimate for meeting when no hours provided', () => {
      const assignment: WorkloadAssignment = {
        id: '1',
        type: 'meeting',
        entityId: 'meeting-1',
        title: 'Team Meeting',
        estimatedHours: 0,
        status: 'scheduled',
      }
      expect(estimateAssignmentHours(assignment)).toBe(WORKLOAD_CONSTANTS.MEETING_HOURS_ESTIMATE)
    })

    it('should use default estimate for inspection', () => {
      const assignment: WorkloadAssignment = {
        id: '1',
        type: 'inspection',
        entityId: 'inspection-1',
        title: 'Site Inspection',
        estimatedHours: 0,
        status: 'scheduled',
      }
      expect(estimateAssignmentHours(assignment)).toBe(WORKLOAD_CONSTANTS.INSPECTION_HOURS_ESTIMATE)
    })

    it('should use default estimate for approval', () => {
      const assignment: WorkloadAssignment = {
        id: '1',
        type: 'approval',
        entityId: 'approval-1',
        title: 'Document Approval',
        estimatedHours: 0,
        status: 'pending',
      }
      expect(estimateAssignmentHours(assignment)).toBe(WORKLOAD_CONSTANTS.APPROVAL_HOURS_ESTIMATE)
    })

    it('should use default estimate for task', () => {
      const assignment: WorkloadAssignment = {
        id: '1',
        type: 'task',
        entityId: 'task-1',
        title: 'Complete Report',
        estimatedHours: 0,
        status: 'in_progress',
      }
      expect(estimateAssignmentHours(assignment)).toBe(WORKLOAD_CONSTANTS.TASK_HOURS_DEFAULT)
    })
  })

  describe('calculateTotalAssignedHours', () => {
    it('should return 0 for empty assignments array', () => {
      expect(calculateTotalAssignedHours([])).toBe(0)
    })

    it('should return 0 for null assignments', () => {
      expect(calculateTotalAssignedHours(null as any)).toBe(0)
    })

    it('should sum up all assignment hours', () => {
      const assignments: WorkloadAssignment[] = [
        {
          id: '1',
          type: 'meeting',
          entityId: 'meeting-1',
          title: 'Team Meeting',
          estimatedHours: 2,
          status: 'scheduled',
        },
        {
          id: '2',
          type: 'inspection',
          entityId: 'inspection-1',
          title: 'Site Inspection',
          estimatedHours: 4,
          status: 'scheduled',
        },
        {
          id: '3',
          type: 'approval',
          entityId: 'approval-1',
          title: 'Document Approval',
          estimatedHours: 1,
          status: 'pending',
        },
      ]
      expect(calculateTotalAssignedHours(assignments)).toBe(7)
    })

    it('should use default estimates when hours not specified', () => {
      const assignments: WorkloadAssignment[] = [
        {
          id: '1',
          type: 'meeting',
          entityId: 'meeting-1',
          title: 'Team Meeting',
          estimatedHours: 0,
          status: 'scheduled',
        },
        {
          id: '2',
          type: 'inspection',
          entityId: 'inspection-1',
          title: 'Site Inspection',
          estimatedHours: 0,
          status: 'scheduled',
        },
      ]
      const expected = WORKLOAD_CONSTANTS.MEETING_HOURS_ESTIMATE + WORKLOAD_CONSTANTS.INSPECTION_HOURS_ESTIMATE
      expect(calculateTotalAssignedHours(assignments)).toBe(expected)
    })
  })

  describe('calculateWorkloadPercentage', () => {
    it('should return 0 when availableHours is 0', () => {
      expect(calculateWorkloadPercentage(10, 0)).toBe(0)
    })

    it('should return 0 when availableHours is negative', () => {
      expect(calculateWorkloadPercentage(10, -5)).toBe(0)
    })

    it('should calculate correct percentage', () => {
      expect(calculateWorkloadPercentage(20, 40)).toBe(50)
    })

    it('should round to 1 decimal place', () => {
      expect(calculateWorkloadPercentage(13, 40)).toBe(32.5)
    })

    it('should handle over 100% workload', () => {
      expect(calculateWorkloadPercentage(50, 40)).toBe(125)
    })

    it('should handle 0 assigned hours', () => {
      expect(calculateWorkloadPercentage(0, 40)).toBe(0)
    })
  })

  describe('getWorkloadLevel', () => {
    it('should return under-utilized for 0%', () => {
      expect(getWorkloadLevel(0)).toBe('under-utilized')
    })

    it('should return under-utilized for 60%', () => {
      expect(getWorkloadLevel(60)).toBe('under-utilized')
    })

    it('should return optimal for 61%', () => {
      expect(getWorkloadLevel(61)).toBe('optimal')
    })

    it('should return optimal for 90%', () => {
      expect(getWorkloadLevel(90)).toBe('optimal')
    })

    it('should return high for 91%', () => {
      expect(getWorkloadLevel(91)).toBe('high')
    })

    it('should return high for 100%', () => {
      expect(getWorkloadLevel(100)).toBe('high')
    })

    it('should return over-allocated for 101%', () => {
      expect(getWorkloadLevel(101)).toBe('over-allocated')
    })

    it('should return over-allocated for 150%', () => {
      expect(getWorkloadLevel(150)).toBe('over-allocated')
    })
  })

  describe('getWorkloadColor', () => {
    it('should return success for under-utilized', () => {
      expect(getWorkloadColor(50)).toBe('success')
    })

    it('should return success for optimal', () => {
      expect(getWorkloadColor(75)).toBe('success')
    })

    it('should return success at 90% threshold', () => {
      expect(getWorkloadColor(90)).toBe('success')
    })

    it('should return warning for high workload', () => {
      expect(getWorkloadColor(95)).toBe('warning')
    })

    it('should return warning at 100% threshold', () => {
      expect(getWorkloadColor(100)).toBe('warning')
    })

    it('should return error for over-allocated', () => {
      expect(getWorkloadColor(101)).toBe('error')
    })

    it('should return error for significantly over-allocated', () => {
      expect(getWorkloadColor(150)).toBe('error')
    })
  })

  describe('getWorkloadLabel', () => {
    it('should return correct label for under-utilized', () => {
      expect(getWorkloadLabel(30)).toBe('Under-utilized')
    })

    it('should return correct label for optimal', () => {
      expect(getWorkloadLabel(75)).toBe('Optimal')
    })

    it('should return correct label for high', () => {
      expect(getWorkloadLabel(95)).toBe('High')
    })

    it('should return correct label for over-allocated', () => {
      expect(getWorkloadLabel(110)).toBe('Over-allocated')
    })
  })

  describe('calculateTeamMemberWorkload', () => {
    const mockUser = {
      id: 'user-1',
      email: 'john@example.com',
      fullName: 'John Doe',
      isActive: true,
      createdAt: '2024-01-01',
    }

    it('should calculate workload with provided available hours', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 20,
        workloadPercent: 0,
        assignments: [],
        createdAt: '2024-01-01',
      }

      const result = calculateTeamMemberWorkload(member)
      expect(result.availableHours).toBe(40)
      expect(result.assignedHours).toBe(20)
      expect(result.workloadPercent).toBe(50)
    })

    it('should use default available hours when not specified', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 0,
        assignedHours: 20,
        workloadPercent: 0,
        createdAt: '2024-01-01',
      }

      const result = calculateTeamMemberWorkload(member)
      expect(result.availableHours).toBe(WORKLOAD_CONSTANTS.DEFAULT_AVAILABLE_HOURS_PER_WEEK)
    })

    it('should calculate workload from assignments', () => {
      const assignments: WorkloadAssignment[] = [
        {
          id: '1',
          type: 'meeting',
          entityId: 'meeting-1',
          title: 'Team Meeting',
          estimatedHours: 2,
          status: 'scheduled',
        },
        {
          id: '2',
          type: 'task',
          entityId: 'task-1',
          title: 'Complete Report',
          estimatedHours: 8,
          status: 'in_progress',
        },
      ]

      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 0,
        workloadPercent: 0,
        assignments,
        createdAt: '2024-01-01',
      }

      const result = calculateTeamMemberWorkload(member)
      expect(result.assignedHours).toBe(10)
      expect(result.workloadPercent).toBe(25)
    })

    it('should override available hours when provided', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 20,
        workloadPercent: 0,
        createdAt: '2024-01-01',
      }

      const result = calculateTeamMemberWorkload(member, 30)
      expect(result.availableHours).toBe(30)
      expect(result.workloadPercent).toBe(66.7)
    })
  })

  describe('calculateTeamWorkloadStats', () => {
    const mockUser1 = {
      id: 'user-1',
      email: 'john@example.com',
      fullName: 'John Doe',
      isActive: true,
      createdAt: '2024-01-01',
    }

    const mockUser2 = {
      id: 'user-2',
      email: 'jane@example.com',
      fullName: 'Jane Smith',
      isActive: true,
      createdAt: '2024-01-01',
    }

    it('should return zero stats for empty members array', () => {
      const stats = calculateTeamWorkloadStats([])
      expect(stats.totalMembers).toBe(0)
      expect(stats.totalAvailableHours).toBe(0)
      expect(stats.totalAssignedHours).toBe(0)
      expect(stats.averageWorkloadPercent).toBe(0)
      expect(stats.underUtilizedCount).toBe(0)
      expect(stats.optimalCount).toBe(0)
      expect(stats.highCount).toBe(0)
      expect(stats.overAllocatedCount).toBe(0)
    })

    it('should calculate stats for multiple team members', () => {
      const members: TeamMember[] = [
        {
          id: 'member-1',
          userId: 'user-1',
          user: mockUser1,
          role: 'contractor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 20,
          workloadPercent: 50,
          createdAt: '2024-01-01',
        },
        {
          id: 'member-2',
          userId: 'user-2',
          user: mockUser2,
          role: 'consultant',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 30,
          workloadPercent: 75,
          createdAt: '2024-01-01',
        },
      ]

      const stats = calculateTeamWorkloadStats(members)
      expect(stats.totalMembers).toBe(2)
      expect(stats.totalAvailableHours).toBe(80)
      expect(stats.totalAssignedHours).toBe(50)
      expect(stats.averageWorkloadPercent).toBe(62.5)
      expect(stats.underUtilizedCount).toBe(1)
      expect(stats.optimalCount).toBe(1)
      expect(stats.highCount).toBe(0)
      expect(stats.overAllocatedCount).toBe(0)
    })

    it('should count workload levels correctly', () => {
      const members: TeamMember[] = [
        {
          id: 'member-1',
          userId: 'user-1',
          user: mockUser1,
          role: 'contractor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 20,
          workloadPercent: 50, // under-utilized
          createdAt: '2024-01-01',
        },
        {
          id: 'member-2',
          userId: 'user-2',
          user: mockUser2,
          role: 'consultant',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 30,
          workloadPercent: 75, // optimal
          createdAt: '2024-01-01',
        },
        {
          id: 'member-3',
          userId: 'user-3',
          user: { ...mockUser1, id: 'user-3' },
          role: 'supervisor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 38,
          workloadPercent: 95, // high
          createdAt: '2024-01-01',
        },
        {
          id: 'member-4',
          userId: 'user-4',
          user: { ...mockUser2, id: 'user-4' },
          role: 'inspector',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 50,
          workloadPercent: 125, // over-allocated
          createdAt: '2024-01-01',
        },
      ]

      const stats = calculateTeamWorkloadStats(members)
      expect(stats.underUtilizedCount).toBe(1)
      expect(stats.optimalCount).toBe(1)
      expect(stats.highCount).toBe(1)
      expect(stats.overAllocatedCount).toBe(1)
    })
  })

  describe('filterAssignmentsByDateRange', () => {
    it('should return empty array for empty assignments', () => {
      const result = filterAssignmentsByDateRange([], '2024-01-01', '2024-01-31')
      expect(result).toEqual([])
    })

    it('should filter assignments within date range', () => {
      const assignments: WorkloadAssignment[] = [
        {
          id: '1',
          type: 'meeting',
          entityId: 'meeting-1',
          title: 'Team Meeting',
          estimatedHours: 2,
          scheduledDate: '2024-01-15',
          status: 'scheduled',
        },
        {
          id: '2',
          type: 'inspection',
          entityId: 'inspection-1',
          title: 'Site Inspection',
          estimatedHours: 4,
          scheduledDate: '2024-02-15',
          status: 'scheduled',
        },
        {
          id: '3',
          type: 'task',
          entityId: 'task-1',
          title: 'Complete Report',
          estimatedHours: 8,
          scheduledDate: '2024-01-20',
          status: 'in_progress',
        },
      ]

      const result = filterAssignmentsByDateRange(assignments, '2024-01-01', '2024-01-31')
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('3')
    })

    it('should include assignments without scheduled date', () => {
      const assignments: WorkloadAssignment[] = [
        {
          id: '1',
          type: 'meeting',
          entityId: 'meeting-1',
          title: 'Team Meeting',
          estimatedHours: 2,
          scheduledDate: '2024-01-15',
          status: 'scheduled',
        },
        {
          id: '2',
          type: 'task',
          entityId: 'task-1',
          title: 'Ongoing Task',
          estimatedHours: 8,
          status: 'in_progress',
        },
      ]

      const result = filterAssignmentsByDateRange(assignments, '2024-01-01', '2024-01-31')
      expect(result).toHaveLength(2)
    })

    it('should handle string dates', () => {
      const assignments: WorkloadAssignment[] = [
        {
          id: '1',
          type: 'meeting',
          entityId: 'meeting-1',
          title: 'Team Meeting',
          estimatedHours: 2,
          scheduledDate: '2024-01-15T10:00:00',
          status: 'scheduled',
        },
      ]

      const result = filterAssignmentsByDateRange(assignments, '2024-01-01', '2024-01-31')
      expect(result).toHaveLength(1)
    })

    it('should handle Date objects', () => {
      const assignments: WorkloadAssignment[] = [
        {
          id: '1',
          type: 'meeting',
          entityId: 'meeting-1',
          title: 'Team Meeting',
          estimatedHours: 2,
          scheduledDate: '2024-01-15',
          status: 'scheduled',
        },
      ]

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const result = filterAssignmentsByDateRange(assignments, startDate, endDate)
      expect(result).toHaveLength(1)
    })
  })

  describe('groupMembersByTeam', () => {
    const mockUser1 = {
      id: 'user-1',
      email: 'john@example.com',
      fullName: 'John Doe',
      isActive: true,
      createdAt: '2024-01-01',
    }

    const mockUser2 = {
      id: 'user-2',
      email: 'jane@example.com',
      fullName: 'Jane Smith',
      isActive: true,
      createdAt: '2024-01-01',
    }

    it('should return empty object for empty members array', () => {
      const result = groupMembersByTeam([])
      expect(result).toEqual({})
    })

    it('should group members by team name', () => {
      const members: TeamMember[] = [
        {
          id: 'member-1',
          userId: 'user-1',
          user: mockUser1,
          role: 'contractor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 20,
          workloadPercent: 50,
          createdAt: '2024-01-01',
        },
        {
          id: 'member-2',
          userId: 'user-2',
          user: mockUser2,
          role: 'consultant',
          teamName: 'Team B',
          availableHours: 40,
          assignedHours: 30,
          workloadPercent: 75,
          createdAt: '2024-01-01',
        },
        {
          id: 'member-3',
          userId: 'user-3',
          user: { ...mockUser1, id: 'user-3' },
          role: 'supervisor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 25,
          workloadPercent: 62.5,
          createdAt: '2024-01-01',
        },
      ]

      const result = groupMembersByTeam(members)
      expect(Object.keys(result)).toHaveLength(2)
      expect(result['Team A']).toHaveLength(2)
      expect(result['Team B']).toHaveLength(1)
    })

    it('should assign members without team to Unassigned', () => {
      const members: TeamMember[] = [
        {
          id: 'member-1',
          userId: 'user-1',
          user: mockUser1,
          role: 'contractor',
          availableHours: 40,
          assignedHours: 20,
          workloadPercent: 50,
          createdAt: '2024-01-01',
        },
      ]

      const result = groupMembersByTeam(members)
      expect(result['Unassigned']).toHaveLength(1)
    })
  })

  describe('sortMembersByWorkload', () => {
    const mockUser = {
      id: 'user-1',
      email: 'john@example.com',
      fullName: 'John Doe',
      isActive: true,
      createdAt: '2024-01-01',
    }

    it('should sort members by workload in descending order', () => {
      const members: TeamMember[] = [
        {
          id: 'member-1',
          userId: 'user-1',
          user: mockUser,
          role: 'contractor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 20,
          workloadPercent: 50,
          createdAt: '2024-01-01',
        },
        {
          id: 'member-2',
          userId: 'user-2',
          user: { ...mockUser, id: 'user-2' },
          role: 'consultant',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 35,
          workloadPercent: 87.5,
          createdAt: '2024-01-01',
        },
        {
          id: 'member-3',
          userId: 'user-3',
          user: { ...mockUser, id: 'user-3' },
          role: 'supervisor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 10,
          workloadPercent: 25,
          createdAt: '2024-01-01',
        },
      ]

      const result = sortMembersByWorkload(members)
      expect(result[0].workloadPercent).toBe(87.5)
      expect(result[1].workloadPercent).toBe(50)
      expect(result[2].workloadPercent).toBe(25)
    })

    it('should not mutate original array', () => {
      const members: TeamMember[] = [
        {
          id: 'member-1',
          userId: 'user-1',
          user: mockUser,
          role: 'contractor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 20,
          workloadPercent: 50,
          createdAt: '2024-01-01',
        },
        {
          id: 'member-2',
          userId: 'user-2',
          user: { ...mockUser, id: 'user-2' },
          role: 'consultant',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 35,
          workloadPercent: 87.5,
          createdAt: '2024-01-01',
        },
      ]

      const originalFirst = members[0].id
      sortMembersByWorkload(members)
      expect(members[0].id).toBe(originalFirst)
    })

    it('should handle members with undefined workloadPercent', () => {
      const members: TeamMember[] = [
        {
          id: 'member-1',
          userId: 'user-1',
          user: mockUser,
          role: 'contractor',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 20,
          workloadPercent: 50,
          createdAt: '2024-01-01',
        },
        {
          id: 'member-2',
          userId: 'user-2',
          user: { ...mockUser, id: 'user-2' },
          role: 'consultant',
          teamName: 'Team A',
          availableHours: 40,
          assignedHours: 0,
          workloadPercent: 0,
          createdAt: '2024-01-01',
        },
      ]

      const result = sortMembersByWorkload(members)
      expect(result).toHaveLength(2)
      expect(result[0].workloadPercent).toBe(50)
    })
  })

  describe('isOverCapacity', () => {
    const mockUser = {
      id: 'user-1',
      email: 'john@example.com',
      fullName: 'John Doe',
      isActive: true,
      createdAt: '2024-01-01',
    }

    it('should return false for workload at 100%', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 40,
        workloadPercent: 100,
        createdAt: '2024-01-01',
      }

      expect(isOverCapacity(member)).toBe(false)
    })

    it('should return true for workload over 100%', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 45,
        workloadPercent: 112.5,
        createdAt: '2024-01-01',
      }

      expect(isOverCapacity(member)).toBe(true)
    })

    it('should return false for workload under 100%', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 30,
        workloadPercent: 75,
        createdAt: '2024-01-01',
      }

      expect(isOverCapacity(member)).toBe(false)
    })

    it('should handle undefined workloadPercent', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 0,
        workloadPercent: 0,
        createdAt: '2024-01-01',
      }

      expect(isOverCapacity(member)).toBe(false)
    })
  })

  describe('getAvailableCapacity', () => {
    const mockUser = {
      id: 'user-1',
      email: 'john@example.com',
      fullName: 'John Doe',
      isActive: true,
      createdAt: '2024-01-01',
    }

    it('should calculate remaining capacity', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 25,
        workloadPercent: 62.5,
        createdAt: '2024-01-01',
      }

      expect(getAvailableCapacity(member)).toBe(15)
    })

    it('should return 0 when at capacity', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 40,
        workloadPercent: 100,
        createdAt: '2024-01-01',
      }

      expect(getAvailableCapacity(member)).toBe(0)
    })

    it('should return 0 when over capacity', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 40,
        assignedHours: 50,
        workloadPercent: 125,
        createdAt: '2024-01-01',
      }

      expect(getAvailableCapacity(member)).toBe(0)
    })

    it('should use default available hours when not specified', () => {
      const member: TeamMember = {
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
        role: 'contractor',
        teamName: 'Team A',
        availableHours: 0,
        assignedHours: 20,
        workloadPercent: 0,
        createdAt: '2024-01-01',
      }

      const expected = WORKLOAD_CONSTANTS.DEFAULT_AVAILABLE_HOURS_PER_WEEK - 20
      expect(getAvailableCapacity(member)).toBe(expected)
    })
  })
})
