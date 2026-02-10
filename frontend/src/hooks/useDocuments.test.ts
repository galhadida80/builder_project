import { renderHook, act } from '@testing-library/react'
import { useDocuments } from './useDocuments'

describe('useDocuments', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with default root folder', () => {
    const { result } = renderHook(() => useDocuments('project1'))
    expect(result.current.folders).toHaveLength(1)
    expect(result.current.folders[0].name).toBe('Documents')
  })

  it('loads folders from localStorage', () => {
    const testFolders = [
      { id: 'root', name: 'Documents', parentId: null, children: [] },
    ]
    localStorage.setItem('project_folders_project1', JSON.stringify(testFolders))

    const { result } = renderHook(() => useDocuments('project1'))
    expect(result.current.folders).toEqual(testFolders)
  })

  it('creates new folder', () => {
    const { result } = renderHook(() => useDocuments('project1'))

    act(() => {
      result.current.createFolder('New Folder', 'root')
    })

    expect(result.current.folders[0].children).toHaveLength(1)
    expect(result.current.folders[0].children[0].name).toBe('New Folder')
  })

  it('renames folder', () => {
    const { result } = renderHook(() => useDocuments('project1'))

    act(() => {
      result.current.createFolder('Old Name', 'root')
    })

    const folderId = result.current.folders[0].children[0].id

    act(() => {
      result.current.renameFolder(folderId, 'New Name')
    })

    expect(result.current.folders[0].children[0].name).toBe('New Name')
  })

  it('deletes folder', () => {
    const { result } = renderHook(() => useDocuments('project1'))

    act(() => {
      result.current.createFolder('To Delete', 'root')
    })

    const folderId = result.current.folders[0].children[0].id

    act(() => {
      result.current.deleteFolder(folderId)
    })

    expect(result.current.folders[0].children).toHaveLength(0)
  })
})
