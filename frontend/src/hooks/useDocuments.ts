import { useState, useEffect, useCallback } from 'react'
import { filesApi } from '../api/files'
import type { FileRecord, Folder } from '../types'

interface UseDocumentsReturn {
  folders: Folder[]
  files: FileRecord[]
  selectedFolderId: string | null
  selectedFile: FileRecord | null
  loading: boolean
  uploading: boolean
  setSelectedFolderId: (id: string | null) => void
  setSelectedFile: (file: FileRecord | null) => void
  loadFiles: () => Promise<void>
  createFolder: (name: string, parentId: string | null) => void
  renameFolder: (id: string, newName: string) => void
  deleteFolder: (id: string) => void
  uploadFile: (file: File) => Promise<void>
  deleteFile: (fileId: string) => Promise<void>
}

const STORAGE_KEY_PREFIX = 'project_folders_'

const createDefaultFolders = (): Folder[] => [
  {
    id: 'root',
    name: 'Documents',
    parentId: undefined,
    children: [],
    projectId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export function useDocuments(projectId: string | undefined): UseDocumentsReturn {
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root')
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Load folders from localStorage
  useEffect(() => {
    if (!projectId) return

    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      try {
        const parsedFolders = JSON.parse(stored)
        setFolders(parsedFolders)
      } catch {
        // If parsing fails, use default folders
        const defaultFolders = createDefaultFolders()
        setFolders(defaultFolders)
        localStorage.setItem(storageKey, JSON.stringify(defaultFolders))
      }
    } else {
      // Initialize with default folders
      const defaultFolders = createDefaultFolders()
      setFolders(defaultFolders)
      localStorage.setItem(storageKey, JSON.stringify(defaultFolders))
    }
  }, [projectId])

  // Save folders to localStorage whenever they change
  useEffect(() => {
    if (!projectId || folders.length === 0) return

    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`
    localStorage.setItem(storageKey, JSON.stringify(folders))
  }, [projectId, folders])

  // Load files when project or selected folder changes
  const loadFiles = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const data = await filesApi.list(
        projectId,
        'document',
        selectedFolderId || undefined
      )
      setFiles(data)
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }, [projectId, selectedFolderId])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Helper function to find a folder by id (recursive)
  const findFolder = (folders: Folder[], id: string): Folder | null => {
    for (const folder of folders) {
      if (folder.id === id) return folder
      if (folder.children && folder.children.length > 0) {
        const found = findFolder(folder.children, id)
        if (found) return found
      }
    }
    return null
  }

  // Helper function to update folders recursively
  const updateFolderTree = (
    folders: Folder[],
    targetId: string,
    updateFn: (folder: Folder) => Folder
  ): Folder[] => {
    return folders.map((folder) => {
      if (folder.id === targetId) {
        return updateFn(folder)
      }
      if (folder.children && folder.children.length > 0) {
        return {
          ...folder,
          children: updateFolderTree(folder.children, targetId, updateFn),
        }
      }
      return folder
    })
  }

  // Helper function to remove a folder recursively
  const removeFolderFromTree = (folders: Folder[], targetId: string): Folder[] => {
    return folders
      .filter((folder) => folder.id !== targetId)
      .map((folder) => ({
        ...folder,
        children: folder.children ? removeFolderFromTree(folder.children, targetId) : [],
      }))
  }

  const createFolder = (name: string, parentId: string | null) => {
    const newFolder: Folder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      parentId: parentId || undefined,
      children: [],
      projectId: projectId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (parentId === undefined || parentId === 'root') {
      // Add to root level
      setFolders((prev) => [
        ...prev.map((folder) => {
          if (folder.id === 'root') {
            return {
              ...folder,
              children: [...(folder.children || []), newFolder],
            }
          }
          return folder
        }),
      ])
    } else {
      // Add to specific parent folder
      setFolders((prev) =>
        updateFolderTree(prev, parentId!, (folder) => ({
          ...folder,
          children: [...(folder.children || []), newFolder],
        }))
      )
    }
  }

  const renameFolder = (id: string, newName: string) => {
    setFolders((prev) =>
      updateFolderTree(prev, id, (folder) => ({
        ...folder,
        name: newName,
      }))
    )
  }

  const deleteFolder = (id: string) => {
    // Don't allow deleting root folder
    if (id === 'root') return

    // If deleting the currently selected folder, reset selection to root
    if (selectedFolderId === id) {
      setSelectedFolderId('root')
    }

    setFolders((prev) => removeFolderFromTree(prev, id))
  }

  const uploadFile = async (file: File) => {
    if (!projectId || !selectedFolderId) {
      throw new Error('Project ID or folder not selected')
    }

    try {
      setUploading(true)
      await filesApi.upload(projectId, 'document', selectedFolderId, file)
      await loadFiles()
    } catch (error) {
      throw error
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileId: string) => {
    if (!projectId) {
      throw new Error('Project ID not available')
    }

    try {
      await filesApi.delete(projectId, fileId)
      await loadFiles()

      // If the deleted file was selected, clear selection
      if (selectedFile?.id === fileId) {
        setSelectedFile(null)
      }
    } catch (error) {
      throw error
    }
  }

  return {
    folders,
    files,
    selectedFolderId,
    selectedFile,
    loading,
    uploading,
    setSelectedFolderId,
    setSelectedFile,
    loadFiles,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadFile,
    deleteFile,
  }
}
