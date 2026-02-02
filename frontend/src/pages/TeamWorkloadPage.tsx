import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { PageHeader } from '../components/ui/Breadcrumbs'

export default function TeamWorkloadPage() {
  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Team Workload"
        subtitle="View and manage team member workload distribution"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Team Workload' }]}
      />

      <Box sx={{ mt: 4 }}>
        <Typography variant="body1" color="text.secondary">
          Team workload view coming soon...
        </Typography>
      </Box>
    </Box>
  )
}
