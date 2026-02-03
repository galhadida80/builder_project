import { render, screen, fireEvent } from '@testing-library/react'
import { FolderTree } from './FolderTree'
import type { Folder } from '../../types'

describe('FolderTree', () => {
  const mockFolders: Folder[] = [
    {
      id: 'root',
      name: 'Documents',
      parentId: null,
      children: [
        { id: 'folder1', name: 'Drawings', parentId: 'root', children: [] },
      ],
    },
  ]

  it('renders folder hierarchy', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selectedFolderId={null}
        files={[]}
        onSelectFolder={jest.fn()}
        onCreateFolder={jest.fn()}
        onRenameFolder={jest.fn()}
        onDeleteFolder={jest.fn()}
      />
    )
    expect(screen.getByText('Documents')).toBeInTheDocument()
  })

  it('expands and collapses folders', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selectedFolderId={null}
        files={[]}
        onSelectFolder={jest.fn()}
        onCreateFolder={jest.fn()}
        onRenameFolder={jest.fn()}
        onDeleteFolder={jest.fn()}
      />
    )
    // Add expand/collapse test logic
  })

  it('calls onSelectFolder when folder is clicked', () => {
    const onSelectFolder = jest.fn()
    render(
      <FolderTree
        folders={mockFolders}
        selectedFolderId={null}
        files={[]}
        onSelectFolder={onSelectFolder}
        onCreateFolder={jest.fn()}
        onRenameFolder={jest.fn()}
        onDeleteFolder={jest.fn()}
      />
    )
    fireEvent.click(screen.getByText('Documents'))
    expect(onSelectFolder).toHaveBeenCalledWith('root')
  })
})
