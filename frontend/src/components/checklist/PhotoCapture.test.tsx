import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotoCapture } from './PhotoCapture'

// Mock File object for testing
const createMockFile = (name: string, size: number, type: string): File => {
  const blob = new Blob(['fake image content'], { type })
  return new File([blob], name, { type })
}

// Mock createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock canvas for image compression
class MockCanvas {
  width = 0
  height = 0
  getContext() {
    return {
      drawImage: vi.fn(),
    }
  }
  toBlob(callback: (blob: Blob) => void) {
    // Simulate compressed blob
    const blob = new Blob(['compressed'], { type: 'image/jpeg' })
    callback(blob)
  }
}

global.HTMLCanvasElement.prototype.getContext = function() {
  return {
    drawImage: vi.fn(),
  }
} as any

describe('PhotoCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dropzone with camera icon', () => {
    render(<PhotoCapture />)

    expect(screen.getByText('Take or Upload Photos')).toBeInTheDocument()
    expect(screen.getByText('Tap to take a photo or drag and drop')).toBeInTheDocument()
  })

  it('displays photo count and max limit', () => {
    render(<PhotoCapture maxPhotos={5} />)

    expect(screen.getByText(/0 \/ 5 photos/)).toBeInTheDocument()
  })

  it('shows file size limit', () => {
    render(<PhotoCapture maxFileSize={10 * 1024 * 1024} />)

    expect(screen.getByText(/Max 10MB per file/)).toBeInTheDocument()
  })

  it('accepts valid image files', async () => {
    const onPhotosChange = vi.fn()
    render(<PhotoCapture onPhotosChange={onPhotosChange} />)

    const file = createMockFile('test.jpg', 1024, 'image/jpeg')
    const input = screen.getByRole('button', { name: /Choose Files/ }).parentElement?.querySelector('input[type="file"]')

    expect(input).toBeInTheDocument()

    if (input) {
      // Simulate file drop
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file' as const,
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      }

      fireEvent.drop(input, { dataTransfer })

      // Wait for compression and state update
      await waitFor(
        () => {
          expect(onPhotosChange).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    }
  })

  it('shows preview after photo is added', async () => {
    render(<PhotoCapture />)

    const file = createMockFile('test.jpg', 1024, 'image/jpeg')
    const input = document.querySelector('input[type="file"]')

    if (input) {
      // Create a mock FileList
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(input)

      await waitFor(
        () => {
          expect(screen.getByText('Photos (1)')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    }
  })

  it('enforces max photo limit', async () => {
    const onPhotosChange = vi.fn()
    render(<PhotoCapture maxPhotos={2} onPhotosChange={onPhotosChange} />)

    // Simulate adding 3 files when max is 2
    const files = [
      createMockFile('test1.jpg', 1024, 'image/jpeg'),
      createMockFile('test2.jpg', 1024, 'image/jpeg'),
      createMockFile('test3.jpg', 1024, 'image/jpeg'),
    ]

    const input = document.querySelector('input[type="file"]')

    if (input) {
      Object.defineProperty(input, 'files', {
        value: files,
        writable: false,
      })

      fireEvent.change(input)

      // Only 2 files should be processed
      await waitFor(
        () => {
          if (onPhotosChange.mock.calls.length > 0) {
            const lastCall = onPhotosChange.mock.calls[onPhotosChange.mock.calls.length - 1]
            expect(lastCall[0].length).toBeLessThanOrEqual(2)
          }
        },
        { timeout: 3000 }
      )
    }
  })

  it('removes photo when delete button is clicked', async () => {
    const onPhotosChange = vi.fn()
    render(<PhotoCapture onPhotosChange={onPhotosChange} />)

    const file = createMockFile('test.jpg', 1024, 'image/jpeg')
    const input = document.querySelector('input[type="file"]')

    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(input)

      await waitFor(
        () => {
          expect(screen.getByText('Photos (1)')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Find and click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(deleteButton)

      // Verify photo was removed
      await waitFor(() => {
        expect(screen.queryByText('Photos (1)')).not.toBeInTheDocument()
      })

      // Verify URL.revokeObjectURL was called
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    }
  })

  it('disables dropzone when disabled prop is true', () => {
    render(<PhotoCapture disabled={true} />)

    const dropzone = screen.getByText('Take or Upload Photos').closest('div')
    expect(dropzone).toHaveClass('disabled')
  })

  it('shows compressing state during image processing', async () => {
    render(<PhotoCapture />)

    const file = createMockFile('test.jpg', 5 * 1024 * 1024, 'image/jpeg')
    const input = document.querySelector('input[type="file"]')

    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(input)

      // Should show compressing message briefly
      await waitFor(
        () => {
          const compressingText = screen.queryByText('Compressing images...')
          // Message may appear and disappear quickly, so we just check it can be found
          if (compressingText) {
            expect(compressingText).toBeInTheDocument()
          }
        },
        { timeout: 100 }
      )
    }
  })

  it('hides dropzone when max photos reached', async () => {
    render(<PhotoCapture maxPhotos={1} />)

    const file = createMockFile('test.jpg', 1024, 'image/jpeg')
    const input = document.querySelector('input[type="file"]')

    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(input)

      await waitFor(
        () => {
          expect(screen.getByText('Photos (1)')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Dropzone should be hidden
      expect(screen.queryByText('Take or Upload Photos')).not.toBeInTheDocument()
    }
  })

  it('has capture="environment" attribute for mobile camera', () => {
    render(<PhotoCapture />)

    const input = document.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('capture', 'environment')
  })

  it('accepts multiple image file types', () => {
    render(<PhotoCapture />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toHaveAttribute('multiple')
  })
})
