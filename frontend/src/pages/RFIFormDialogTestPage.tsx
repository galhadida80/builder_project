import { useState } from 'react'
import { Box, Container, Typography, Button as MuiButton, Stack, Paper, Alert } from '@mui/material'
import { RFIFormDialog } from '../components/RFI'
import type { RFIFormData } from '../components/RFI'

/**
 * Test page to verify RFIFormDialog component rendering
 *
 * This page tests that all 12 fields render without errors:
 * 1. To Email (required, email validation)
 * 2. To Name
 * 3. CC Emails (multi-input)
 * 4. Subject (required)
 * 5. Category dropdown
 * 6. Priority dropdown
 * 7. Due Date picker
 * 8. Question (rich text editor)
 * 9. Location reference
 * 10. Drawing Reference
 * 11. Specification Reference
 * 12. Attachments upload (multi-file)
 */
export default function RFIFormDialogTestPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [lastSubmittedData, setLastSubmittedData] = useState<RFIFormData | null>(null)
  const [actionType, setActionType] = useState<'draft' | 'send' | null>(null)

  const handleOpenDialog = () => {
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setLastSubmittedData(null)
    setActionType(null)
  }

  const handleFormSubmit = (data: RFIFormData, action?: 'draft' | 'send') => {
    console.log('Form submitted with action:', action)
    console.log('Form data:', data)
    setLastSubmittedData(data)
    setActionType(action || null)
    setDialogOpen(false)
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            RFIFormDialog Verification Test
          </Typography>
          <Typography variant="body1" color="textSecondary">
            This page tests the RFIFormDialog component to verify all 12 fields render without errors.
          </Typography>
        </Box>

        <Paper elevation={1} sx={{ p: 3, backgroundColor: 'info.light', borderLeft: 4, borderColor: 'info.main' }}>
          <Typography variant="h6" gutterBottom>
            Verification Checklist:
          </Typography>
          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
            {`✓ Component can be imported from src/components/RFI
✓ Dialog opens when "Open Dialog" button is clicked
✓ All 12 fields display in the dialog:
  1. To Email (required, email validation)
  2. To Name (optional)
  3. CC Emails (multi-input with chips)
  4. Subject (required)
  5. Category (dropdown with 8 options)
  6. Priority (dropdown with 4 options)
  7. Due Date (date/time picker)
  8. Question (rich text editor with toolbar)
  9. Location (optional)
  10. Drawing Reference (optional)
  11. Specification Reference (optional)
  12. Attachments (drag-and-drop file upload)
✓ Form can be closed via Cancel/Close button
✓ Submit buttons are present (Save as Draft, Send Now)
✓ No console errors during rendering or interaction
✓ Error messages display for validation errors
✓ Loading states work during submission`}
          </Typography>
        </Paper>

        <MuiButton
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
          size="large"
        >
          Open RFIFormDialog
        </MuiButton>

        {lastSubmittedData && (
          <Paper elevation={1} sx={{ p: 3, backgroundColor: 'success.light', borderLeft: 4, borderColor: 'success.main' }}>
            <Typography variant="h6" gutterBottom>
              Form Submitted Successfully ({actionType})
            </Typography>
            <Box component="pre" sx={{ overflow: 'auto', fontSize: '0.85rem' }}>
              {JSON.stringify(lastSubmittedData, null, 2)}
            </Box>
          </Paper>
        )}

        <Alert severity="info">
          <Typography variant="body2">
            <strong>Instructions:</strong> Click "Open RFIFormDialog" to render the dialog. Verify:
          </Typography>
          <Typography variant="body2" component="div" sx={{ mt: 1 }}>
            • All 12 form fields display correctly<br />
            • Dialog can be closed with Cancel button<br />
            • Required fields show validation errors when empty<br />
            • Rich text editor displays with formatting toolbar<br />
            • File upload area shows drag-and-drop zone<br />
            • No console errors appear<br />
            • Submit buttons (Save as Draft, Send Now) are functional
          </Typography>
        </Alert>
      </Stack>

      {/* RFIFormDialog Component */}
      <RFIFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        mode="create"
      />
    </Container>
  )
}
