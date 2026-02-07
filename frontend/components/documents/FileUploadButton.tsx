'use client'

import { useRef, useState } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { filesApi, FileRecord } from '@/lib/api/files'

interface FileUploadButtonProps {
  projectId: string
  entityType: string
  entityId: string
  onUploadComplete: (file: FileRecord) => void
  onError?: (error: string) => void
}

export default function FileUploadButton({ projectId, entityType, entityId, onUploadComplete, onError }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleClick = () => {
    if (inputRef.current) inputRef.current.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''
    try {
      setUploading(true)
      const uploaded = await filesApi.upload(projectId, entityType, entityId, file)
      onUploadComplete(uploaded)
    } catch {
      onError?.('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
        onClick={handleClick}
        disabled={uploading}
        sx={{ textTransform: 'none' }}
      >
        {uploading ? 'Uploading...' : 'Upload Document'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
      />
    </>
  )
}
