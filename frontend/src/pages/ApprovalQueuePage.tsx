import Box from '@mui/material/Box'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Card } from '../components/ui/Card'
import { ApprovalQueueList } from '../components/ApprovalQueueList'
import type { ApprovalRequest } from '../types'

export default function ApprovalQueuePage() {
  const handleViewDetails = (approval: ApprovalRequest) => {
    // Navigate to approval details page when implemented
    // Future implementation: Use react-router-dom's useNavigate to navigate to detail page
    // e.g., navigate(`/approvals/${approval.id}`)
    void approval // Prevent unused parameter warning
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Approval Queue"
        subtitle="Review and manage pending approvals"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approval Queue' }]}
      />

      <Card>
        <Box sx={{ p: 2.5 }}>
          <ApprovalQueueList onViewDetails={handleViewDetails} />
        </Box>
      </Card>
    </Box>
  )
}
