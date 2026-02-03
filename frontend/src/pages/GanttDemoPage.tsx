import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { GanttChart } from '../components/GanttChart'
import type { GanttTask, GanttViewMode } from '../types/gantt'

export default function GanttDemoPage() {
  const [viewMode, setViewMode] = useState<GanttViewMode>('Day')
  const [tasks, setTasks] = useState<GanttTask[]>(generateSampleTasks())

  const handleDateChange = (task: GanttTask, start: Date, end: Date) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id
          ? { ...t, start, end }
          : t
      )
    )
  }

  const handleProgressChange = (task: GanttTask, progress: number) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id
          ? { ...t, progress }
          : t
      )
    )
  }

  const handleDelete = (task: GanttTask) => {
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== task.id))
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
          Project Timeline
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gantt chart view of construction project tasks and milestones
        </Typography>
      </Box>

      <GanttChart
        tasks={tasks}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onDateChange={handleDateChange}
        onProgressChange={handleProgressChange}
        onDelete={handleDelete}
      />
    </Box>
  )
}

// Generate realistic construction project sample data
function generateSampleTasks(): GanttTask[] {
  const today = new Date()
  const addDays = (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  return [
    // Phase 1: Pre-Construction
    {
      id: 'phase-1',
      name: 'Pre-Construction Phase',
      type: 'project',
      start: addDays(today, 0),
      end: addDays(today, 15),
      progress: 80,
    },
    {
      id: 'task-1-1',
      name: 'Site Survey & Preparation',
      type: 'task',
      start: addDays(today, 0),
      end: addDays(today, 5),
      progress: 100,
      project: 'phase-1',
    },
    {
      id: 'task-1-2',
      name: 'Permits & Approvals',
      type: 'task',
      start: addDays(today, 3),
      end: addDays(today, 10),
      progress: 90,
      project: 'phase-1',
      dependencies: ['task-1-1'],
    },
    {
      id: 'task-1-3',
      name: 'Equipment Mobilization',
      type: 'task',
      start: addDays(today, 8),
      end: addDays(today, 15),
      progress: 60,
      project: 'phase-1',
      dependencies: ['task-1-2'],
    },
    {
      id: 'milestone-1',
      name: 'Pre-Construction Complete',
      type: 'milestone',
      start: addDays(today, 15),
      end: addDays(today, 15),
      progress: 0,
      dependencies: ['task-1-3'],
    },

    // Phase 2: Foundation Work
    {
      id: 'phase-2',
      name: 'Foundation Phase',
      type: 'project',
      start: addDays(today, 15),
      end: addDays(today, 40),
      progress: 45,
    },
    {
      id: 'task-2-1',
      name: 'Excavation & Grading',
      type: 'task',
      start: addDays(today, 15),
      end: addDays(today, 22),
      progress: 100,
      project: 'phase-2',
      dependencies: ['milestone-1'],
    },
    {
      id: 'task-2-2',
      name: 'Footer & Foundation Pour',
      type: 'task',
      start: addDays(today, 22),
      end: addDays(today, 30),
      progress: 75,
      project: 'phase-2',
      dependencies: ['task-2-1'],
    },
    {
      id: 'task-2-3',
      name: 'Foundation Curing',
      type: 'task',
      start: addDays(today, 30),
      end: addDays(today, 37),
      progress: 20,
      project: 'phase-2',
      dependencies: ['task-2-2'],
    },
    {
      id: 'task-2-4',
      name: 'Waterproofing & Drainage',
      type: 'task',
      start: addDays(today, 37),
      end: addDays(today, 40),
      progress: 0,
      project: 'phase-2',
      dependencies: ['task-2-3'],
    },
    {
      id: 'milestone-2',
      name: 'Foundation Complete',
      type: 'milestone',
      start: addDays(today, 40),
      end: addDays(today, 40),
      progress: 0,
      dependencies: ['task-2-4'],
    },

    // Phase 3: Framing & Structure
    {
      id: 'phase-3',
      name: 'Framing & Structure Phase',
      type: 'project',
      start: addDays(today, 40),
      end: addDays(today, 70),
      progress: 15,
    },
    {
      id: 'task-3-1',
      name: 'Steel Framework Installation',
      type: 'task',
      start: addDays(today, 40),
      end: addDays(today, 52),
      progress: 40,
      project: 'phase-3',
      dependencies: ['milestone-2'],
    },
    {
      id: 'task-3-2',
      name: 'Roof Structure & Trusses',
      type: 'task',
      start: addDays(today, 52),
      end: addDays(today, 62),
      progress: 0,
      project: 'phase-3',
      dependencies: ['task-3-1'],
    },
    {
      id: 'task-3-3',
      name: 'Exterior Sheathing',
      type: 'task',
      start: addDays(today, 62),
      end: addDays(today, 70),
      progress: 0,
      project: 'phase-3',
      dependencies: ['task-3-2'],
    },
    {
      id: 'milestone-3',
      name: 'Structure Weatherproof',
      type: 'milestone',
      start: addDays(today, 70),
      end: addDays(today, 70),
      progress: 0,
      dependencies: ['task-3-3'],
    },

    // Phase 4: MEP Systems
    {
      id: 'phase-4',
      name: 'MEP Systems Phase',
      type: 'project',
      start: addDays(today, 70),
      end: addDays(today, 100),
      progress: 0,
    },
    {
      id: 'task-4-1',
      name: 'Electrical Rough-In',
      type: 'task',
      start: addDays(today, 70),
      end: addDays(today, 80),
      progress: 0,
      project: 'phase-4',
      dependencies: ['milestone-3'],
    },
    {
      id: 'task-4-2',
      name: 'Plumbing Rough-In',
      type: 'task',
      start: addDays(today, 70),
      end: addDays(today, 82),
      progress: 0,
      project: 'phase-4',
      dependencies: ['milestone-3'],
    },
    {
      id: 'task-4-3',
      name: 'HVAC Installation',
      type: 'task',
      start: addDays(today, 82),
      end: addDays(today, 95),
      progress: 0,
      project: 'phase-4',
      dependencies: ['task-4-1', 'task-4-2'],
    },
    {
      id: 'task-4-4',
      name: 'Insulation & Drywall',
      type: 'task',
      start: addDays(today, 90),
      end: addDays(today, 100),
      progress: 0,
      project: 'phase-4',
      dependencies: ['task-4-3'],
    },
    {
      id: 'milestone-4',
      name: 'MEP Systems Complete',
      type: 'milestone',
      start: addDays(today, 100),
      end: addDays(today, 100),
      progress: 0,
      dependencies: ['task-4-4'],
    },

    // Phase 5: Finishes
    {
      id: 'phase-5',
      name: 'Interior Finishes Phase',
      type: 'project',
      start: addDays(today, 100),
      end: addDays(today, 125),
      progress: 0,
    },
    {
      id: 'task-5-1',
      name: 'Interior Painting',
      type: 'task',
      start: addDays(today, 100),
      end: addDays(today, 110),
      progress: 0,
      project: 'phase-5',
      dependencies: ['milestone-4'],
    },
    {
      id: 'task-5-2',
      name: 'Flooring Installation',
      type: 'task',
      start: addDays(today, 108),
      end: addDays(today, 118),
      progress: 0,
      project: 'phase-5',
      dependencies: ['task-5-1'],
    },
    {
      id: 'task-5-3',
      name: 'Fixtures & Hardware',
      type: 'task',
      start: addDays(today, 115),
      end: addDays(today, 125),
      progress: 0,
      project: 'phase-5',
      dependencies: ['task-5-2'],
    },

    // Phase 6: Final Inspection
    {
      id: 'task-6-1',
      name: 'Final Walkthrough',
      type: 'task',
      start: addDays(today, 125),
      end: addDays(today, 128),
      progress: 0,
      dependencies: ['task-5-3'],
    },
    {
      id: 'task-6-2',
      name: 'Punch List Completion',
      type: 'task',
      start: addDays(today, 128),
      end: addDays(today, 133),
      progress: 0,
      dependencies: ['task-6-1'],
    },
    {
      id: 'milestone-final',
      name: 'Project Complete',
      type: 'milestone',
      start: addDays(today, 135),
      end: addDays(today, 135),
      progress: 0,
      dependencies: ['task-6-2'],
    },
  ]
}
