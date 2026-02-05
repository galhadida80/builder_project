import { useState } from 'react'
import { Box, Container, Typography, Button as MuiButton, Stack, Paper, Alert, Chip } from '@mui/material'
import { RFIFormDialog } from '../components/RFI'
import { rfiApi } from '../api/rfi'
import type { RFIFormData } from '../components/RFI'

/**
 * Test page to verify RFIFormDialog component rendering and API integration
 *
 * This page tests:
 * 1. All 12 fields render without errors
 * 2. Form validation prevents invalid submissions
 * 3. API integration for both draft and send flows
 * 4. Proper status codes and response handling
 *
 * Fields:
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

// Test project ID - using a fixed UUID for testing
const TEST_PROJECT_ID = 'test-project-001'

export default function RFIFormDialogTestPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [lastSubmittedData, setLastSubmittedData] = useState<RFIFormData | null>(null)
  const [actionType, setActionType] = useState<'draft' | 'send' | null>(null)
  const [apiResponse, setApiResponse] = useState<Record<string, unknown> | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenDialog = () => {
    setDialogOpen(true)
    setApiError(null)
    setApiResponse(null)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
  }

  /**
   * Convert form data from camelCase to snake_case for API
   */
  const convertToApiFormat = (data: RFIFormData) => {
    return {
      subject: data.subject,
      question: data.question,
      to_email: data.toEmail,
      to_name: data.toName,
      cc_emails: data.ccEmails,
      category: data.category,
      priority: data.priority,
      due_date: data.dueDate,
      location: data.location,
      drawing_reference: data.drawingReference,
      specification_reference: data.specificationReference,
      assigned_to_id: data.assignedToId,
      // attachments would be handled separately with FormData for file uploads
    }
  }

  const handleFormSubmit = async (data: RFIFormData, action?: 'draft' | 'send') => {
    setIsLoading(true)
    setApiError(null)
    setApiResponse(null)

    try {
      console.log('Form submitted with action:', action)
      console.log('Form data:', data)

      // Convert form data to API format
      const apiData = convertToApiFormat(data)

      // Add status based on action
      const requestData = {
        ...apiData,
        status: action === 'draft' ? 'draft' : 'sent',
      }

      console.log('Sending to API:', requestData)

      // Call the API
      const response = await rfiApi.create(TEST_PROJECT_ID, requestData as Parameters<typeof rfiApi.create>[1])

      console.log('API Response:', response)

      setLastSubmittedData(data)
      setActionType(action || null)
      setApiResponse(response as unknown as Record<string, unknown>)
      setDialogOpen(false)

      // Show success message
      setApiError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit RFI'
      console.error('API Error:', error)
      setApiError(errorMessage)
      setLastSubmittedData(data)
      setActionType(action || null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            RFIFormDialog Verification Test
          </Typography>
          <Typography variant="body1" color="textSecondary">
            This page tests the RFIFormDialog component rendering, validation, and API integration.
          </Typography>
        </Box>

        <Paper elevation={1} sx={{ p: 3, backgroundColor: 'info.light', borderLeft: 4, borderColor: 'info.main' }}>
          <Typography variant="h6" gutterBottom>
            Component & API Verification Checklist:
          </Typography>
          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
            {`Component Rendering:
✓ Component can be imported from src/components/RFI
✓ Dialog opens when button is clicked
✓ All 12 fields display correctly
✓ Form can be closed via Cancel button

Form Validation:
✓ Required fields (toEmail, subject, question) show validation errors when empty
✓ Email validation works for toEmail field
✓ Optional fields allow empty submission
✓ Error messages display below fields

API Integration:
✓ Save as Draft creates RFI with status='draft'
✓ Send Now creates RFI with status='sent'
✓ API returns 201 status code on success
✓ Response contains created RFI data (id, status, etc.)
✓ Loading states display during API calls
✓ Error messages display for API failures
✓ Dialog closes on successful submission
✓ Form resets after successful submission`}
          </Typography>
        </Paper>

        <MuiButton
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
          size="large"
          disabled={isLoading}
        >
          Open RFIFormDialog
        </MuiButton>

        {isLoading && (
          <Alert severity="info">
            Processing API request...
          </Alert>
        )}

        {apiError && (
          <Alert severity="error">
            <Typography variant="subtitle2" gutterBottom>
              API Error:
            </Typography>
            <Typography variant="body2">
              {apiError}
            </Typography>
          </Alert>
        )}

        {apiResponse && (
          <Paper elevation={1} sx={{ p: 3, backgroundColor: 'success.light', borderLeft: 4, borderColor: 'success.main' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  ✓ RFI Submitted Successfully
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label={`Action: ${actionType}`} color={actionType === 'draft' ? 'warning' : 'success'} />
                  <Chip label={`Status: ${(apiResponse.status as string)?.toUpperCase() || 'UNKNOWN'}`} />
                  <Chip label={`ID: ${(apiResponse.id as string)?.substring(0, 8)}...`} />
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Form Data Submitted:
                </Typography>
                <Box component="pre" sx={{ overflow: 'auto', fontSize: '0.75rem', backgroundColor: 'background.paper', p: 1, borderRadius: 1 }}>
                  {JSON.stringify(lastSubmittedData, null, 2)}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  API Response:
                </Typography>
                <Box component="pre" sx={{ overflow: 'auto', fontSize: '0.75rem', backgroundColor: 'background.paper', p: 1, borderRadius: 1 }}>
                  {JSON.stringify(apiResponse, null, 2)}
                </Box>
              </Box>
            </Stack>
          </Paper>
        )}

        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            <strong>Test Instructions:</strong>
          </Typography>
          <Typography variant="body2" component="div" sx={{ mt: 1 }}>
            1. Click "Open RFIFormDialog" to render the dialog<br />
            2. Verify all 12 form fields display correctly<br />
            3. Test validation by clicking Submit without filling required fields<br />
            4. Fill in the required fields (To Email, Subject, Question)<br />
            5. Click "Save as Draft" - should create RFI with status='draft'<br />
            6. Or click "Send Now" - should create RFI with status='sent'<br />
            7. Check browser console for detailed API logs<br />
            8. Verify the API response appears below
          </Typography>
        </Alert>
      </Stack>

      {/* RFIFormDialog Component */}
      <RFIFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        loading={isLoading}
        mode="create"
      />
    </Container>
  )
}
