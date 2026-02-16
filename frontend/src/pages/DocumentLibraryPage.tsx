import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { SearchField } from '../components/ui/TextField'
import { useToast } from '../components/common/ToastProvider'
import { FolderTree } from '../components/documents/FolderTree'
import { FileList } from '../components/documents/FileList'
import { UploadZone } from '../components/documents/UploadZone'
import { FilePreview } from '../components/documents/FilePreview'
import { ConfirmModal } from '../components/ui/Modal'
import { useDocuments } from '../hooks/useDocuments'
import { filesApi } from '../api/files'
import type { FileRecord } from '../types'
import { FolderIcon, DescriptionIcon, CloudUploadIcon, InsertDriveFileIcon } from '@/icons'
import { Box, Typography, Chip, Grid, Paper, Skeleton } from '@/mui'

export default function DocumentLibraryPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [search, setSearch] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null)

  const {
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
  } = useDocuments(projectId)

  const handleUpload = async (file: File) => {
    try {
      await uploadFile(file)
      showSuccess(t('documents.uploadSuccess', { name: file.name }))
    } catch (error) {
      showError(t('documents.uploadFailed', { name: file.name }))
      throw error
    }
  }

  const handleDownload = async (file: FileRecord) => {
    if (!projectId) return
    try {
      const url = await filesApi.getDownloadUrl(projectId, file.id)
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showSuccess(t('documents.downloading', { name: file.filename }))
    } catch (error) {
      showError(t('documents.downloadFailed', { name: file.filename }))
    }
  }

  const handleDeleteClick = (file: FileRecord) => {
    setFileToDelete(file)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return
    try {
      await deleteFile(fileToDelete.id)
      showSuccess(t('documents.deleteSuccess', { name: fileToDelete.filename }))
      setDeleteModalOpen(false)
      setFileToDelete(null)
    } catch (error) {
      showError(t('documents.deleteFailed', { name: fileToDelete.filename }))
    }
  }

  const filteredFiles = files.filter((file) =>
    file.filename.toLowerCase().includes(search.toLowerCase())
  )

  const totalFiles = files.length
  const totalFolders = folders.reduce((count, folder) => {
    const countChildren = (f: typeof folders[0]): number => {
      return 1 + (f.children?.reduce((sum, child) => sum + countChildren(child), 0) || 0)
    }
    return count + countChildren(folder)
  }, 0)
  const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0)
  const formatTotalSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    const gb = mb / 1024
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`
    }
    return `${mb.toFixed(1)} MB`
  }

  if (loading && files.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t('documents.title')}
        subtitle={t('documents.subtitle')}
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('documents.title') }]}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
          overflow: 'hidden',
        }}
      >
        <KPICard title={t('documents.totalFiles')} value={totalFiles} icon={<DescriptionIcon />} color="primary" />
        <KPICard title={t('documents.totalFolders')} value={totalFolders} icon={<FolderIcon />} color="warning" />
        <KPICard title={t('documents.totalSize')} value={formatTotalSize(totalSize)} icon={<CloudUploadIcon />} color="info" />
        <KPICard
          title={t('documents.recentUploads')}
          value={files.filter((f) => {
            const dayAgo = new Date()
            dayAgo.setDate(dayAgo.getDate() - 1)
            return new Date(f.uploadedAt) > dayAgo
          }).length}
          icon={<InsertDriveFileIcon />}
          color="success"
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <Box sx={{ p: 2.5 }}>
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                files={files}
                onSelectFolder={setSelectedFolderId}
                onCreateFolder={createFolder}
                onRenameFolder={renameFolder}
                onDeleteFolder={deleteFolder}
              />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <UploadZone onUpload={handleUpload} disabled={uploading} />

            <Card>
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
                    <SearchField
                      placeholder={t('documents.searchPlaceholder')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </Box>
                  <Chip label={`${filteredFiles.length} ${t('documents.files')}`} size="small" />
                </Box>

                <FileList
                  files={filteredFiles}
                  loading={loading}
                  onFileClick={setSelectedFile}
                  onDownload={handleDownload}
                  onDelete={handleDeleteClick}
                  emptyMessage={
                    search
                      ? t('documents.noSearchResults')
                      : t('documents.noFiles')
                  }
                />
              </Box>
            </Card>
          </Box>
        </Grid>

        <Grid item xs={12} md={3}>
          <Box sx={{ position: 'sticky', top: 24 }}>
            {projectId && (
              <FilePreview
                file={selectedFile}
                projectId={projectId}
                onClose={() => setSelectedFile(null)}
                onDownload={handleDownload}
              />
            )}
          </Box>
        </Grid>
      </Grid>

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setFileToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title={t('documents.deleteFile')}
        message={t('documents.deleteConfirmation', { name: fileToDelete?.filename })}
        confirmLabel={t('common.delete')}
        variant="danger"
      />
    </Box>
  )
}
