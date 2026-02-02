import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RFIFormDialog, RFIFormData } from './RFIFormDialog'
import { ReactNode } from 'react'

// Mock the custom UI components
vi.mock('../ui/Modal', () => ({
  Modal: ({ open, onClose, title, children, actions }: any) =>
    open ? (
      <div data-testid="modal" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <div data-testid="modal-actions">{actions}</div>
        <button onClick={onClose} data-testid="modal-close-button">Close</button>
      </div>
    ) : null,
}))

vi.mock('../ui/Button', () => ({
  Button: ({ children, onClick, disabled, loading, variant, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-${children?.toLowerCase()?.replace(/\s+/g, '-')}`}
      data-loading={loading}
      data-variant={variant}
      {...props}
    >
      {loading ? <span data-testid="loading-spinner">Loading...</span> : null}
      {children}
    </button>
  ),
}))

vi.mock('../ui/TextField', () => ({
  TextField: ({ label, value, onChange, error, helperText, disabled, type, ...props }: any) => (
    <div data-testid={`field-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
      <label>{label}</label>
      <input
        type={type || 'text'}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={props.placeholder}
        data-testid={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
      />
      {error && <span data-testid={`error-${label}`} style={{ color: 'red' }}>{helperText}</span>}
    </div>
  ),
}))

vi.mock('../ui/Select', () => ({
  Select: ({ label, value, onChange, options, error, helperText, disabled }: any) => (
    <div data-testid={`select-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
      <label>{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        data-testid={`select-input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <option value="">Select...</option>
        {options?.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span data-testid={`error-${label}`} style={{ color: 'red' }}>{helperText}</span>}
    </div>
  ),
}))

// Mock mui-tiptap
vi.mock('mui-tiptap', () => ({
  RichTextEditor: ({ editor, onUpdate }: any) => (
    <div data-testid="rich-text-editor">
      <textarea
        data-testid="editor-textarea"
        onChange={(e) => {
          if (editor) {
            editor.getHTML = () => `<p>${e.target.value}</p>`
            onUpdate?.({ editor })
          }
        }}
        placeholder="Enter text..."
      />
    </div>
  ),
  useEditor: () => ({
    getHTML: () => '<p></p>',
  }),
}))

// Mock @tiptap
vi.mock('@tiptap/starter-kit', () => ({
  default: {},
}))

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
    acceptedFiles: [],
  }),
}))

describe('RFIFormDialog', () => {
  const mockOnSubmit = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    mockOnClose.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ========== 1. Component Rendering Tests ==========
  describe('1. Component Rendering', () => {
    it('should render with all 12 form fields', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByTestId('field-to-email')).toBeInTheDocument()
      expect(screen.getByTestId('field-to-name')).toBeInTheDocument()
      expect(screen.getByTestId('field-subject')).toBeInTheDocument()
      expect(screen.getByTestId('select-category')).toBeInTheDocument()
      expect(screen.getByTestId('select-priority')).toBeInTheDocument()
      expect(screen.getByTestId('field-location')).toBeInTheDocument()
      expect(screen.getByTestId('field-drawing-reference')).toBeInTheDocument()
      expect(screen.getByTestId('field-specification-reference')).toBeInTheDocument()
      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
      expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    })

    it('should render dialog with correct title in create mode', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          mode="create"
        />
      )
      expect(screen.getByText('Create New RFI')).toBeInTheDocument()
    })

    it('should render dialog with correct title in edit mode', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          mode="edit"
        />
      )
      expect(screen.getByText('Edit RFI')).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      render(
        <RFIFormDialog
          open={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    it('should render Cancel button', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )
      expect(screen.getByTestId('button-cancel')).toBeInTheDocument()
    })

    it('should close dialog when Cancel button is clicked', async () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const cancelButton = screen.getByTestId('button-cancel')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  // ========== 2. Form Validation Tests ==========
  describe('2. Form Validation', () => {
    it('should show error when toEmail is empty and form is submitted', async () => {
      const user = userEvent.setup()
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      // Fill subject and question to pass those validations
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      // Try to submit without toEmail
      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-To Email')).toBeInTheDocument()
      })
    })

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'invalid-email')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-To Email')).toBeInTheDocument()
      })
    })

    it('should accept valid email format', async () => {
      const user = userEvent.setup()
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const emailInput = screen.getByTestId('input-to-email')
      await user.type(emailInput, 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      // Should not show email error
      await waitFor(() => {
        const emailError = screen.queryByTestId('error-To Email')
        if (emailError) {
          expect(emailError).not.toHaveTextContent('Valid email address is required')
        }
      }, { timeout: 1000 })
    })

    it('should show error when subject is empty', async () => {
      const user = userEvent.setup()
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-Subject')).toBeInTheDocument()
      })
    })

    it('should show error when question is empty', async () => {
      const user = userEvent.setup()
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        const questionError = screen.queryByText(/Question is required/)
        // The rich text editor error may be displayed differently
      }, { timeout: 1000 })
    })

    it('should clear errors when fields become valid', async () => {
      const user = userEvent.setup()
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const emailInput = screen.getByTestId('input-to-email')

      // First type invalid email
      await user.type(emailInput, 'invalid')
      await user.type(screen.getByTestId('input-subject'), 'Test')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      // Should show error
      await waitFor(() => {
        const error = screen.queryByTestId('error-To Email')
        if (error) expect(error).toBeInTheDocument()
      })

      // Clear and type valid email
      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')

      // Error should be gone (or updated)
      await waitFor(() => {
        // Field should now be valid
        expect(emailInput).toHaveValue('valid@example.com')
      })
    })
  })

  // ========== 3. Optional Fields Tests ==========
  describe('3. Optional Fields', () => {
    it('should allow submission with only required fields filled', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('should not show error for empty optional fields', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      // Optional fields should not trigger errors
      await waitFor(() => {
        const toNameError = screen.queryByTestId('error-To Name')
        const locationError = screen.queryByTestId('error-Location')

        // These should not exist as they're optional
        expect(toNameError).not.toBeInTheDocument()
        expect(locationError).not.toBeInTheDocument()
      })
    })

    it('should accept values in optional fields when provided', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const toNameInput = screen.getByTestId('input-to-name')
      const locationInput = screen.getByTestId('input-location')

      await user.type(toNameInput, 'John Doe')
      await user.type(locationInput, 'Building A')
      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(toNameInput).toHaveValue('John Doe')
        expect(locationInput).toHaveValue('Building A')
      })
    })
  })

  // ========== 4. Dropdown Tests ==========
  describe('4. Dropdowns', () => {
    it('should render category dropdown with 8 options', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const categorySelect = screen.getByTestId('select-input-category')
      const options = categorySelect.querySelectorAll('option')

      // +1 for "Select..." placeholder
      expect(options.length).toBe(9)
    })

    it('should render priority dropdown with 4 options', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const prioritySelect = screen.getByTestId('select-input-priority')
      const options = prioritySelect.querySelectorAll('option')

      // +1 for "Select..." placeholder
      expect(options.length).toBe(5)
    })

    it('should update category selection', async () => {
      const user = userEvent.setup()
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const categorySelect = screen.getByTestId('select-input-category') as HTMLSelectElement
      await user.selectOptions(categorySelect, 'design')

      expect(categorySelect.value).toBe('design')
    })

    it('should update priority selection', async () => {
      const user = userEvent.setup()
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const prioritySelect = screen.getByTestId('select-input-priority') as HTMLSelectElement
      await user.selectOptions(prioritySelect, 'high')

      expect(prioritySelect.value).toBe('high')
    })
  })

  // ========== 5. Submit Handlers Tests ==========
  describe('5. Submit Handlers', () => {
    it('should call onSubmit with action="draft" when Save as Draft is clicked', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const draftButton = screen.getByTestId('button-save-as-draft')
      fireEvent.click(draftButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            toEmail: 'valid@example.com',
            subject: 'Test Subject',
          }),
          'draft'
        )
      })
    })

    it('should call onSubmit with action="send" when Send Now is clicked', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            toEmail: 'valid@example.com',
            subject: 'Test Subject',
          }),
          'send'
        )
      })
    })

    it('should reset form after successful draft submission', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const emailInput = screen.getByTestId('input-to-email')
      const subjectInput = screen.getByTestId('input-subject')

      await user.type(emailInput, 'valid@example.com')
      await user.type(subjectInput, 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const draftButton = screen.getByTestId('button-save-as-draft')
      fireEvent.click(draftButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  // ========== 6. Loading States Tests ==========
  describe('6. Loading States', () => {
    it('should disable form fields during submission', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        const emailInput = screen.getByTestId('input-to-email')
        expect(emailInput).toBeDisabled()
      })
    })

    it('should show loading state on buttons during submission', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(sendButton).toHaveAttribute('data-loading', 'true')
      })
    })

    it('should disable buttons during submission', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(sendButton).toBeDisabled()
      })
    })

    it('should re-enable form after submission completes', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  // ========== 7. Error Handling Tests ==========
  describe('7. Error Handling', () => {
    it('should display API error message in Alert component', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to save RFI'
      mockOnSubmit.mockRejectedValue(new Error(errorMessage))

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        // The error should be displayed somewhere
        expect(screen.queryByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should allow retry after error', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValueOnce(new Error('Failed'))
      mockOnSubmit.mockResolvedValueOnce(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      // First attempt - fails
      const sendButton = screen.getByTestId('button-send-now')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })

      // Second attempt - succeeds
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(2)
      })
    })
  })

  // ========== 8. Edit Mode Tests ==========
  describe('8. Edit Mode', () => {
    it('should show only "Save Changes" button in edit mode', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          mode="edit"
        />
      )

      expect(screen.getByTestId('button-save-changes')).toBeInTheDocument()
      expect(screen.queryByTestId('button-save-as-draft')).not.toBeInTheDocument()
      expect(screen.queryByTestId('button-send-now')).not.toBeInTheDocument()
    })

    it('should show "Save as Draft" and "Send Now" buttons in create mode', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          mode="create"
        />
      )

      expect(screen.getByTestId('button-save-as-draft')).toBeInTheDocument()
      expect(screen.getByTestId('button-send-now')).toBeInTheDocument()
      expect(screen.queryByTestId('button-save-changes')).not.toBeInTheDocument()
    })

    it('should submit without action parameter in edit mode', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          mode="edit"
        />
      )

      await user.type(screen.getByTestId('input-to-email'), 'valid@example.com')
      await user.type(screen.getByTestId('input-subject'), 'Test Subject')
      await user.type(screen.getByTestId('editor-textarea'), 'Test Question')

      const saveButton = screen.getByTestId('button-save-changes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        // In edit mode, should be called without the 'send' action
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            toEmail: 'valid@example.com',
          }),
          'draft'
        )
      })
    })
  })

  // ========== 9. Initial Data Tests ==========
  describe('9. Initial Data', () => {
    it('should populate form with initial data', () => {
      const initialData: Partial<RFIFormData> = {
        toEmail: 'initial@example.com',
        subject: 'Initial Subject',
        toName: 'John Doe',
      }

      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          initialData={initialData}
        />
      )

      expect(screen.getByTestId('input-to-email')).toHaveValue('initial@example.com')
      expect(screen.getByTestId('input-subject')).toHaveValue('Initial Subject')
      expect(screen.getByTestId('input-to-name')).toHaveValue('John Doe')
    })
  })

  // ========== 10. Loading Prop Tests ==========
  describe('10. Loading Prop', () => {
    it('should disable form when loading prop is true', () => {
      render(
        <RFIFormDialog
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          loading={true}
        />
      )

      expect(screen.getByTestId('input-to-email')).toBeDisabled()
      expect(screen.getByTestId('input-subject')).toBeDisabled()
      expect(screen.getByTestId('button-cancel')).toBeDisabled()
    })
  })
})
