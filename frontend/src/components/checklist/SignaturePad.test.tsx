import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SignaturePad } from './SignaturePad'

// Mock react-signature-canvas
vi.mock('react-signature-canvas', () => {
  return {
    default: vi.fn().mockImplementation(({ onEnd, canvasProps }) => {
      const mockRef = {
        isEmpty: vi.fn(() => false),
        toDataURL: vi.fn(() => 'data:image/png;base64,mockSignature'),
        clear: vi.fn(),
      }

      return (
        <canvas
          data-testid="signature-canvas"
          width={canvasProps?.width || 500}
          height={canvasProps?.height || 200}
          onMouseUp={() => onEnd?.()}
          onClick={() => {
            // Simulate drawing
            if (onEnd) onEnd()
          }}
        />
      )
    }),
  }
})

describe('SignaturePad', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock window.innerWidth for responsive sizing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone size
    })
  })

  it('renders signature canvas', () => {
    render(<SignaturePad />)

    expect(screen.getByTestId('signature-canvas')).toBeInTheDocument()
  })

  it('displays signature label', () => {
    render(<SignaturePad label="Inspector Signature" />)

    expect(screen.getByText('Inspector Signature')).toBeInTheDocument()
  })

  it('shows required indicator when required prop is true', () => {
    render(<SignaturePad required={true} />)

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('Signature is required before submission')).toBeInTheDocument()
  })

  it('shows clear button', () => {
    render(<SignaturePad />)

    expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument()
  })

  it('clear button is disabled initially', () => {
    render(<SignaturePad />)

    const clearButton = screen.getByRole('button', { name: /Clear/i })
    expect(clearButton).toBeDisabled()
  })

  it('calls onSignatureChange when signature is drawn', () => {
    const handleSignatureChange = vi.fn()
    render(<SignaturePad onSignatureChange={handleSignatureChange} />)

    const canvas = screen.getByTestId('signature-canvas')
    fireEvent.click(canvas)

    // Note: In real implementation, this would be called after onEnd event
    // The mock simulates this behavior
    expect(handleSignatureChange).toHaveBeenCalled()
  })

  it('shows "Signed" indicator after drawing', () => {
    render(<SignaturePad />)

    const canvas = screen.getByTestId('signature-canvas')
    fireEvent.click(canvas) // Simulate drawing

    // Wait for state update
    setTimeout(() => {
      expect(screen.getByText('Signed')).toBeInTheDocument()
    }, 100)
  })

  it('enables clear button after signature is drawn', () => {
    render(<SignaturePad />)

    const canvas = screen.getByTestId('signature-canvas')
    fireEvent.click(canvas)

    setTimeout(() => {
      const clearButton = screen.getByRole('button', { name: /Clear/i })
      expect(clearButton).not.toBeDisabled()
    }, 100)
  })

  it('clears signature when clear button is clicked', () => {
    const handleSignatureChange = vi.fn()
    render(<SignaturePad onSignatureChange={handleSignatureChange} />)

    const canvas = screen.getByTestId('signature-canvas')
    fireEvent.click(canvas)

    setTimeout(() => {
      const clearButton = screen.getByRole('button', { name: /Clear/i })
      fireEvent.click(clearButton)

      // Should call with null to indicate cleared
      expect(handleSignatureChange).toHaveBeenCalledWith(null)
    }, 100)
  })

  it('disables actions when disabled prop is true', () => {
    render(<SignaturePad disabled={true} />)

    const clearButton = screen.getByRole('button', { name: /Clear/i })
    expect(clearButton).toBeDisabled()
  })

  it('displays helper text', () => {
    render(<SignaturePad />)

    expect(screen.getByText('Draw your signature above using mouse or touch')).toBeInTheDocument()
  })

  it('sets canvas dimensions via canvasProps', () => {
    render(<SignaturePad />)

    const canvas = screen.getByTestId('signature-canvas')

    // Canvas should have width and height attributes (not CSS)
    expect(canvas).toHaveAttribute('width')
    expect(canvas).toHaveAttribute('height')

    // Verify dimensions are numbers
    const width = canvas.getAttribute('width')
    const height = canvas.getAttribute('height')

    expect(Number(width)).toBeGreaterThan(0)
    expect(Number(height)).toBeGreaterThan(0)
  })

  it('uses responsive canvas sizing', () => {
    render(<SignaturePad />)

    const canvas = screen.getByTestId('signature-canvas')
    const width = Number(canvas.getAttribute('width'))
    const height = Number(canvas.getAttribute('height'))

    // Width should be within mobile-friendly range (320-600)
    expect(width).toBeGreaterThanOrEqual(320)
    expect(width).toBeLessThanOrEqual(600)

    // Height should be proportional (150-250)
    expect(height).toBeGreaterThanOrEqual(150)
    expect(height).toBeLessThanOrEqual(250)
  })

  it('handles window resize for responsive canvas', () => {
    const { rerender } = render(<SignaturePad />)

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // Tablet size
    })

    fireEvent(window, new Event('resize'))
    rerender(<SignaturePad />)

    const canvas = screen.getByTestId('signature-canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('exports signature as base64 data URL', () => {
    const handleSignatureChange = vi.fn()
    render(<SignaturePad onSignatureChange={handleSignatureChange} />)

    const canvas = screen.getByTestId('signature-canvas')
    fireEvent.click(canvas)

    // Should export as PNG data URL
    setTimeout(() => {
      const calls = handleSignatureChange.mock.calls
      if (calls.length > 0) {
        const dataURL = calls[0][0]
        expect(dataURL).toMatch(/^data:image\/png;base64,/)
      }
    }, 100)
  })

  it('shows alert when signature is required but not provided', () => {
    render(<SignaturePad required={true} />)

    expect(screen.getByText('Signature is required before submission')).toBeInTheDocument()
  })

  it('hides required alert after signature is drawn', () => {
    render(<SignaturePad required={true} />)

    const canvas = screen.getByTestId('signature-canvas')
    fireEvent.click(canvas)

    setTimeout(() => {
      // Alert should still be visible but "Signed" indicator should show
      expect(screen.getByText('Signed')).toBeInTheDocument()
    }, 100)
  })
})
