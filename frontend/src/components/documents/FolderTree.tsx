import { useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  Typography,
  TextField,
} from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { FormModal, ConfirmModal } from '../ui/Modal'
import type { Folder, FileRecord } from '../../types'

interface FolderTreeProps {
  folders: Folder[]
  selectedFolderId: string | null
  files: FileRecord[]
  onSelectFolder: (folderId: string) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onRenameFolder: (folderId: string, newName: string) => void
  onDeleteFolder: (folderId: string) => void
}

const StyledListItem = styled(ListItem)(() => ({
  padding: 0,
  marginBottom: 2,
}))

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'isSelected',
})<{ isSelected?: boolean }>(({ theme, isSelected }) => ({
  borderRadius: 8,
  padding: theme.spacing(0.75, 1),
  transition: 'all 150ms ease-out',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    '& .folder-actions': {
      opacity: 1,
    },
  },
  ...(isSelected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
  }),
}))

const ActionsBox = styled(Box)(() => ({
  display: 'flex',
  gap: 4,
  opacity: 0,
  transition: 'opacity 150ms ease-out',
}))

export function FolderTree({
  folders,
  selectedFolderId,
  files,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']))
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [targetParentId, setTargetParentId] = useState<string | null>(null)
  const [targetFolder, setTargetFolder] = useState<Folder | null>(null)

  const toggleExpand = (folderId: string) => {
    setExpanded((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId)
      } else {
        newExpanded.add(folderId)
      }
      return newExpanded
    })
  }

  const handleOpenCreateModal = (parentId: string | null) => {
    setTargetParentId(parentId)
    setNewFolderName('')
    setCreateModalOpen(true)
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), targetParentId)
      setCreateModalOpen(false)
      setNewFolderName('')
      // Expand the parent folder to show the new child
      if (targetParentId) {
        setExpanded((prev) => new Set(prev).add(targetParentId))
      }
    }
  }

  const handleOpenRenameModal = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation()
    setTargetFolder(folder)
    setNewFolderName(folder.name)
    setRenameModalOpen(true)
  }

  const handleRenameFolder = () => {
    if (targetFolder && newFolderName.trim()) {
      onRenameFolder(targetFolder.id, newFolderName.trim())
      setRenameModalOpen(false)
      setTargetFolder(null)
      setNewFolderName('')
    }
  }

  const handleOpenDeleteModal = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation()
    setTargetFolder(folder)
    setDeleteModalOpen(true)
  }

  const handleDeleteFolder = () => {
    if (targetFolder) {
      onDeleteFolder(targetFolder.id)
      setDeleteModalOpen(false)
      setTargetFolder(null)
    }
  }

  const renderFolder = (folder: Folder, level: number = 0) => {
    const isExpanded = expanded.has(folder.id)
    const isSelected = selectedFolderId === folder.id
    const hasChildren = folder.children && folder.children.length > 0
    const isRoot = folder.id === 'root'

    return (
      <Box key={folder.id}>
        <StyledListItem
          sx={{ pl: level * 2 }}
          secondaryAction={
            !isRoot && (
              <ActionsBox className="folder-actions">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenCreateModal(folder.id)
                  }}
                  sx={{ p: 0.5 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => handleOpenRenameModal(folder, e)}
                  sx={{ p: 0.5 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => handleOpenDeleteModal(folder, e)}
                  sx={{ p: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ActionsBox>
            )
          }
        >
          <StyledListItemButton
            isSelected={isSelected}
            onClick={() => onSelectFolder(folder.id)}
          >
            {hasChildren && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(folder.id)
                }}
                sx={{ p: 0.5, mr: 0.5 }}
              >
                {isExpanded ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 28 }} />}
            <ListItemIcon sx={{ minWidth: 32 }}>
              {isExpanded ? (
                <FolderOpenIcon fontSize="small" color={isSelected ? 'primary' : 'inherit'} />
              ) : (
                <FolderIcon fontSize="small" color={isSelected ? 'primary' : 'inherit'} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={folder.name}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: isSelected ? 600 : 500,
                noWrap: true,
              }}
            />
          </StyledListItemButton>
        </StyledListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {folder.children.map((child) => renderFolder(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  const hasFolderContent = (folder: Folder): boolean => {
    // Check for child folders
    if (folder.children && folder.children.length > 0) return true

    // Check for files in this folder
    const filesInFolder = files.filter(f => f.entityId === folder.id)
    return filesInFolder.length > 0
  }

  const getContentDescription = (folder: Folder): string => {
    const childFolders = folder.children?.length || 0
    const filesInFolder = files.filter(f => f.entityId === folder.id).length

    const parts = []
    if (childFolders > 0) parts.push(`${childFolders} subfolder${childFolders > 1 ? 's' : ''}`)
    if (filesInFolder > 0) parts.push(`${filesInFolder} file${filesInFolder > 1 ? 's' : ''}`)

    return parts.join(' and ')
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
          FOLDERS
        </Typography>
        <IconButton
          size="small"
          onClick={() => handleOpenCreateModal('root')}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      <List component="nav" disablePadding>
        {folders.map((folder) => renderFolder(folder, 0))}
      </List>

      {/* Create Folder Modal */}
      <FormModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setNewFolderName('')
        }}
        onSubmit={handleCreateFolder}
        title="Create New Folder"
        submitLabel="Create"
        submitDisabled={!newFolderName.trim()}
      >
        <TextField
          autoFocus
          fullWidth
          label="Folder Name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && newFolderName.trim()) {
              e.preventDefault()
              handleCreateFolder()
            }
          }}
          placeholder="Enter folder name"
        />
      </FormModal>

      {/* Rename Folder Modal */}
      <FormModal
        open={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false)
          setTargetFolder(null)
          setNewFolderName('')
        }}
        onSubmit={handleRenameFolder}
        title="Rename Folder"
        submitLabel="Rename"
        submitDisabled={!newFolderName.trim()}
      >
        <TextField
          autoFocus
          fullWidth
          label="Folder Name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && newFolderName.trim()) {
              e.preventDefault()
              handleRenameFolder()
            }
          }}
          placeholder="Enter new folder name"
        />
      </FormModal>

      {/* Delete Folder Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setTargetFolder(null)
        }}
        onConfirm={handleDeleteFolder}
        title="Delete Folder"
        message={
          targetFolder && hasFolderContent(targetFolder)
            ? `Cannot delete "${targetFolder.name}". Folder contains ${getContentDescription(targetFolder)}. Please delete or move items first.`
            : `Are you sure you want to delete "${targetFolder?.name}"? This action cannot be undone.`
        }
        confirmLabel={targetFolder && hasFolderContent(targetFolder) ? 'OK' : 'Delete'}
        variant="danger"
      />
    </Box>
  )
}
