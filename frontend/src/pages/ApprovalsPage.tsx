import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import StepContent from '@mui/material/StepContent'
import BuildIcon from '@mui/icons-material/Build'
import InventoryIcon from '@mui/icons-material/Inventory'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import { mockApprovals, mockEquipment, mockMaterials } from '../mocks/data'
import StatusBadge from '../components/common/StatusBadge'
import type { ApprovalRequest, ApprovalStep } from '../types'

export default function ApprovalsPage() {
  const [tabValue, setTabValue] = useState(0)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')

  const pendingApprovals = mockApprovals.filter(a => a.currentStatus !== 'approved' && a.currentStatus !== 'rejected')
  const completedApprovals = mockApprovals.filter(a => a.currentStatus === 'approved' || a.currentStatus === 'rejected')

  const displayedApprovals = tabValue === 0 ? pendingApprovals : completedApprovals

  const getEntityDetails = (approval: ApprovalRequest) => {
    if (approval.entityType === 'equipment') {
      return mockEquipment.find(e => e.id === approval.entityId)
    }
    return mockMaterials.find(m => m.id === approval.entityId)
  }

  const getStepIcon = (step: ApprovalStep) => {
    switch (step.status) {
      case 'approved': return <CheckCircleIcon color="success" />
      case 'rejected': return <CancelIcon color="error" />
      case 'under_review': return <PendingIcon color="warning" />
      default: return <PendingIcon color="disabled" />
    }
  }

  const handleAction = (approval: ApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedApproval(approval)
    setActionType(action)
    setDialogOpen(true)
  }

  const handleSubmitAction = () => {
    console.log(`${actionType} approval ${selectedApproval?.id} with comment: ${comment}`)
    setDialogOpen(false)
    setSelectedApproval(null)
    setActionType(null)
    setComment('')
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Approvals</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review and manage approval requests
      </Typography>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label={`Pending (${pendingApprovals.length})`} />
        <Tab label={`Completed (${completedApprovals.length})`} />
      </Tabs>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {displayedApprovals.map((approval) => {
          const entity = getEntityDetails(approval)
          const currentStep = approval.steps.find(s => s.status === 'under_review' || s.status === 'submitted')
          const isMyTurn = currentStep?.approverRole === 'inspector'

          return (
            <Card key={approval.id} sx={{ border: isMyTurn ? 2 : 0, borderColor: 'primary.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar sx={{ bgcolor: approval.entityType === 'equipment' ? 'primary.light' : 'secondary.light', width: 48, height: 48 }}>
                      {approval.entityType === 'equipment' ? <BuildIcon /> : <InventoryIcon />}
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h6">{entity?.name}</Typography>
                        <StatusBadge status={approval.currentStatus} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {approval.entityType.charAt(0).toUpperCase() + approval.entityType.slice(1)} - {(entity as { equipmentCode?: string; materialCode?: string })?.equipmentCode || (entity as { materialCode?: string })?.materialCode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Submitted by {approval.createdBy?.fullName} on {new Date(approval.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>

                  {tabValue === 0 && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleAction(approval, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => handleAction(approval, 'reject')}
                      >
                        Reject
                      </Button>
                    </Box>
                  )}
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Approval Progress
                  </Typography>
                  <Stepper orientation="vertical" sx={{ mt: 1 }}>
                    {approval.steps.map((step, index) => (
                      <Step key={step.id} active={step.status === 'under_review'} completed={step.status === 'approved'}>
                        <StepLabel
                          icon={getStepIcon(step)}
                          optional={
                            step.decidedAt && (
                              <Typography variant="caption">
                                {new Date(step.decidedAt).toLocaleDateString()}
                              </Typography>
                            )
                          }
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>Step {index + 1}: {step.approverRole?.replace('_', ' ')}</Typography>
                            {step.approver && <Chip label={step.approver.fullName} size="small" />}
                          </Box>
                        </StepLabel>
                        {step.comments && (
                          <StepContent>
                            <Typography variant="body2" color="text.secondary">
                              "{step.comments}"
                            </Typography>
                          </StepContent>
                        )}
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {displayedApprovals.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {tabValue === 0 ? 'No pending approvals' : 'No completed approvals'}
          </Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {actionType === 'approve'
              ? 'Add any comments for this approval (optional).'
              : 'Please provide a reason for rejection.'}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={actionType === 'approve' ? 'Comments (optional)' : 'Rejection Reason'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={actionType === 'reject'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            onClick={handleSubmitAction}
            disabled={actionType === 'reject' && !comment}
          >
            {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
