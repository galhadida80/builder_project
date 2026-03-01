import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { getDateLocale } from '../../utils/dateLocale'
import { CheckCircleIcon, CancelIcon } from '@/icons'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@/mui'
import type { ToolboxTalk } from '../../types/safety'

interface AttendanceDialogProps {
  open: boolean
  talk: ToolboxTalk | null
  onClose: () => void
  onToggleAttendance: (attendeeId: string) => Promise<void>
}

export function AttendanceDialog({ open, talk, onClose, onToggleAttendance }: AttendanceDialogProps) {
  const { t } = useTranslation()
  const [attendanceStates, setAttendanceStates] = useState<Record<string, boolean>>({})

  // Initialize attendance states when dialog opens
  if (talk && Object.keys(attendanceStates).length === 0) {
    const states: Record<string, boolean> = {}
    talk.attendees.forEach((a) => {
      states[a.id] = a.attended
    })
    setAttendanceStates(states)
  }

  const handleToggle = async (attendeeId: string) => {
    const newAttended = !attendanceStates[attendeeId]
    setAttendanceStates((prev) => ({ ...prev, [attendeeId]: newAttended }))

    try {
      await onToggleAttendance(attendeeId)
    } catch (error) {
      // Revert on error
      setAttendanceStates((prev) => ({ ...prev, [attendeeId]: !newAttended }))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('toolboxTalks.manageAttendance')}</DialogTitle>
      <DialogContent>
        {talk && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              {talk.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('toolboxTalks.scheduledDate')}: {new Date(talk.scheduledDate).toLocaleDateString(getDateLocale())}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <List>
              {talk.attendees.map((attendee) => (
                <ListItem key={attendee.id}>
                  <ListItemText
                    primary={attendee.workerName || t('common.unknown')}
                    secondary={
                      attendee.signedAt
                        ? `Signed: ${new Date(attendee.signedAt).toLocaleString(getDateLocale())}`
                        : null
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleToggle(attendee.id)}
                      color={attendanceStates[attendee.id] ? 'success' : 'default'}
                    >
                      {attendanceStates[attendee.id] ? <CheckCircleIcon /> : <CancelIcon />}
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {talk.attendees.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  {t('toolboxTalks.noAttendees')}
                </Typography>
              )}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
