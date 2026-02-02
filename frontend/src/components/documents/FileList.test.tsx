import { render, screen, fireEvent } from '@testing-library/react'
import { FileList } from './FileList'
import type { FileRecord } from '../../types'

describe('FileList', () => {
  const mockFiles: FileRecord[] = [
    {
      id: '1',
      projectId: 'proj1',
      entityType: 'document',
      entityId: 'folder1',
      filename: 'test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      storagePath: '/path/to/file',
      uploadedAt: '2026-02-02T00:00:00Z',
    },
  ]

  it('displays files in table', () => {
    render(<FileList files={mockFiles} />)
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
  })

  it('shows empty message when no files', () => {
    render(<FileList files={[]} emptyMessage="No files here" />)
    expect(screen.getByText('No files here')).toBeInTheDocument()
  })

  it('calls onFileClick when row is clicked', () => {
    const onFileClick = jest.fn()
    render(<FileList files={mockFiles} onFileClick={onFileClick} />)
    fireEvent.click(screen.getByText('test.pdf'))
    expect(onFileClick).toHaveBeenCalledWith(mockFiles[0])
  })
})
