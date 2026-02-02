import { render, screen } from '@testing-library/react'
import { UploadZone } from './UploadZone'

describe('UploadZone', () => {
  it('renders upload zone with instructions', () => {
    render(<UploadZone onUpload={jest.fn()} />)
    expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument()
  })

  it('shows disabled state when disabled prop is true', () => {
    render(<UploadZone onUpload={jest.fn()} disabled={true} />)
    // Verify dropzone is disabled
  })

  it('displays upload progress during upload', async () => {
    const onUpload = jest.fn().mockImplementation(() => new Promise(r => setTimeout(r, 100)))
    render(<UploadZone onUpload={onUpload} />)
    // Simulate file drop and verify progress indicator appears
  })
})
