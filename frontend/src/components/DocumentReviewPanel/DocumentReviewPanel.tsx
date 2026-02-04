import { Box, Divider, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'
import { DocumentViewer } from './DocumentViewer'
import { CommentsPanel } from './CommentsPanel'
import { Button } from '../ui/Button'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import RateReviewIcon from '@mui/icons-material/RateReview'
import { Comment } from './CommentThread'

export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested'

export interface DocumentReviewPanelProps {
  // Document props
  documentUrl: string
  documentName: string
  documentType: 'pdf' | 'image' | string
  documentLoading?: boolean
  onDownload?: () => void
  onPrint?: () => void

  // Comments props
  comments: Comment[]
  commentsLoading?: boolean
  currentUserId?: string
  onAddComment?: (text: string) => void | Promise<void>
  onReplyComment?: (parentCommentId: string, text: string) => void | Promise<void>
  onEditComment?: (commentId: string, text: string) => void | Promise<void>
  onDeleteComment?: (commentId: string) => void | Promise<void>
  onResolveComment?: (commentId: string, resolved: boolean) => void | Promise<void>

  // Review status props
  reviewStatus?: ReviewStatus
  onApprove?: () => void | Promise<void>
  onReject?: () => void | Promise<void>
  onRequestChanges?: () => void | Promise<void>
}

const RootContainer = styled(Box)(() => ({
  height: '100vh',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}))

const SplitViewContainer = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
  position: 'relative',
}))

const LeftPane = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    flex: '1 1 60%',
  },
}))

const StyledDivider = styled(Divider)(({ theme }) => ({
  width: 2,
  backgroundColor: theme.palette.divider,
  flexShrink: 0,
  cursor: 'col-resize',
  transition: 'background-color 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
  },
}))

const RightPane = styled(Box)(({ theme }) => ({
  width: 400,
  minWidth: 300,
  maxWidth: 600,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden',
  [theme.breakpoints.down('lg')]: {
    width: 380,
    minWidth: 280,
  },
  [theme.breakpoints.down('md')]: {
    flex: '1 1 40%',
    width: 'auto',
    minWidth: 0,
  },
}))

const ApprovalButtonsContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  borderRadius: 0,
  justifyContent: 'center',
  alignItems: 'center',
  flexShrink: 0,
}))

export function DocumentReviewPanel({
  documentUrl,
  documentName,
  documentType,
  documentLoading = false,
  onDownload,
  onPrint,
  comments,
  commentsLoading = false,
  currentUserId,
  onAddComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
  onResolveComment,
  reviewStatus = 'pending',
  onApprove,
  onReject,
  onRequestChanges,
}: DocumentReviewPanelProps) {
  const isApproved = reviewStatus === 'approved'
  const isRejected = reviewStatus === 'rejected'
  const changesRequested = reviewStatus === 'changes_requested'

  return (
    <RootContainer>
      <SplitViewContainer>
        <LeftPane>
          <DocumentViewer
            documentUrl={documentUrl}
            documentName={documentName}
            documentType={documentType}
            loading={documentLoading}
            onDownload={onDownload}
            onPrint={onPrint}
          />
        </LeftPane>

        <StyledDivider orientation="vertical" flexItem />

        <RightPane>
          <CommentsPanel
            comments={comments}
            loading={commentsLoading}
            currentUserId={currentUserId}
            onAddComment={onAddComment}
            onReplyComment={onReplyComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            onResolveComment={onResolveComment}
          />
        </RightPane>
      </SplitViewContainer>

      {(onApprove || onReject || onRequestChanges) && (
        <ApprovalButtonsContainer elevation={3}>
          {onApprove && (
            <Button
              variant={isApproved ? 'primary' : 'secondary'}
              size="medium"
              onClick={onApprove}
              disabled={isApproved}
              icon={<CheckCircleIcon />}
              iconPosition="start"
              sx={{
                minWidth: 160,
                backgroundColor: isApproved ? 'success.main' : undefined,
                color: isApproved ? 'white' : undefined,
                '&:hover': {
                  backgroundColor: isApproved ? 'success.dark' : 'success.light',
                  color: isApproved ? 'white' : 'success.dark',
                },
              }}
            >
              {isApproved ? 'Approved' : 'Approve'}
            </Button>
          )}

          {onRequestChanges && (
            <Button
              variant={changesRequested ? 'primary' : 'secondary'}
              size="medium"
              onClick={onRequestChanges}
              disabled={changesRequested}
              icon={<RateReviewIcon />}
              iconPosition="start"
              sx={{
                minWidth: 180,
                backgroundColor: changesRequested ? 'warning.main' : undefined,
                color: changesRequested ? 'white' : undefined,
                '&:hover': {
                  backgroundColor: changesRequested ? 'warning.dark' : 'warning.light',
                  color: changesRequested ? 'white' : 'warning.dark',
                },
              }}
            >
              {changesRequested ? 'Changes Requested' : 'Request Changes'}
            </Button>
          )}

          {onReject && (
            <Button
              variant={isRejected ? 'primary' : 'secondary'}
              size="medium"
              onClick={onReject}
              disabled={isRejected}
              icon={<CancelIcon />}
              iconPosition="start"
              sx={{
                minWidth: 160,
                backgroundColor: isRejected ? 'error.main' : undefined,
                color: isRejected ? 'white' : undefined,
                '&:hover': {
                  backgroundColor: isRejected ? 'error.dark' : 'error.light',
                  color: isRejected ? 'white' : 'error.dark',
                },
              }}
            >
              {isRejected ? 'Rejected' : 'Reject'}
            </Button>
          )}
        </ApprovalButtonsContainer>
      )}
    </RootContainer>
  )
}
