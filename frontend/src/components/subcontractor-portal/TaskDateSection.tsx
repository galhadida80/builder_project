import { Box, Typography } from '@/mui'
import type { Task } from '@/types'

interface TaskDateSectionProps {
  label: string
  count: number
  tasks: Task[]
  renderCard: (task: Task) => React.ReactNode
}

export function TaskDateSection({ label, count, tasks, renderCard }: TaskDateSectionProps) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {label}
        </Typography>
        <Box
          sx={{
            bgcolor: 'primary.dark',
            color: 'primary.contrastText',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {count}
        </Box>
      </Box>
      {tasks.map(renderCard)}
    </>
  )
}
