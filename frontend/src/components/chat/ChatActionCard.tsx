import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import BuildIcon from '@mui/icons-material/Build'
import CategoryIcon from '@mui/icons-material/Category'
import DescriptionIcon from '@mui/icons-material/Description'
import EventIcon from '@mui/icons-material/Event'
import EngineeringIcon from '@mui/icons-material/Engineering'
import MapIcon from '@mui/icons-material/Map'
import ContactsIcon from '@mui/icons-material/Contacts'
import ApprovalIcon from '@mui/icons-material/Approval'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { useTranslation } from 'react-i18next'
import type { ChatAction } from '../../api/chat'

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  equipment: <BuildIcon fontSize="small" />,
  material: <CategoryIcon fontSize="small" />,
  rfi: <DescriptionIcon fontSize="small" />,
  inspection: <EngineeringIcon fontSize="small" />,
  meeting: <EventIcon fontSize="small" />,
  area: <MapIcon fontSize="small" />,
  contact: <ContactsIcon fontSize="small" />,
  equipment_submission: <ApprovalIcon fontSize="small" />,
  material_submission: <ApprovalIcon fontSize="small" />,
}

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  proposed: 'warning',
  executed: 'success',
  rejected: 'error',
  failed: 'error',
}

interface ChatActionCardProps {
  action: ChatAction
  onExecute: (actionId: string) => Promise<void>
  onReject: (actionId: string) => Promise<void>
}

export default function ChatActionCard({ action, onExecute, onReject }: ChatActionCardProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleExecute = async () => {
    setLoading(true)
    try {
      await onExecute(action.id)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      await onReject(action.id)
    } finally {
      setLoading(false)
    }
  }

  const icon = ENTITY_ICONS[action.entityType] || <BuildIcon fontSize="small" />
  const statusColor = STATUS_COLORS[action.status] || 'default'
  const isProposed = action.status === 'proposed'

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 1,
        mb: 0.5,
        borderColor: isProposed ? 'warning.main' : statusColor === 'success' ? 'success.main' : statusColor === 'error' ? 'error.main' : 'divider',
        borderWidth: isProposed ? 1.5 : 1,
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
            {action.description}
          </Typography>
          <Chip
            label={t(`chat.action.${action.status}`)}
            color={statusColor}
            size="small"
            variant={isProposed ? 'outlined' : 'filled'}
          />
        </Box>

        {action.status === 'failed' && action.result && 'error' in action.result && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <ErrorOutlineIcon fontSize="small" color="error" />
            <Typography variant="caption" color="error">
              {String(action.result.error)}
            </Typography>
          </Box>
        )}

        {isProposed && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={handleReject}
                >
                  {t('chat.action.reject')}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleExecute}
                >
                  {t('chat.action.approve')}
                </Button>
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
