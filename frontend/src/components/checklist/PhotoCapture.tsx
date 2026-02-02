import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Box, Typography, IconButton, Grid, Card, CardMedia, CardActions } from '@mui/material'
import { styled } from '@mui/material/styles'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { Button } from '../ui/Button'

interface PhotoFile {
  file: File
  preview: string
  compressed?: Blob
}

interface PhotoCaptureProps {
  maxPhotos?: number
  maxFileSize?: number
  onPhotosChange?: (files: File[]) => void
  disabled?: boolean
}

const DropZone = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 200ms ease-out',
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  '&.active': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.selected,
  },
  '&.disabled': {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
}))

const PhotoPreview = styled(Card)(({ theme }) => ({
  position: 'relative',
  height: 200,
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
}))

const DeleteButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: theme.palette.error.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}))

/**
 * Compress an image file to reduce size before upload
 */
const compressImage = async (file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

export function PhotoCapture({
  maxPhotos = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  onPhotosChange,
  disabled = false,
}: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [compressing, setCompressing] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return

      // Check if adding new files would exceed max
      const availableSlots = maxPhotos - photos.length
      const filesToAdd = acceptedFiles.slice(0, availableSlots)

      if (filesToAdd.length === 0) return

      setCompressing(true)

      try {
        // Compress images and create previews
        const newPhotos: PhotoFile[] = await Promise.all(
          filesToAdd.map(async (file) => {
            const compressed = await compressImage(file)
            return {
              file,
              preview: URL.createObjectURL(file),
              compressed,
            }
          })
        )

        const updatedPhotos = [...photos, ...newPhotos]
        setPhotos(updatedPhotos)

        // Notify parent component
        if (onPhotosChange) {
          const files = updatedPhotos.map((p) => {
            // Return compressed version as a File object
            if (p.compressed) {
              return new File([p.compressed], p.file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
            }
            return p.file
          })
          onPhotosChange(files)
        }
      } catch (error) {
        console.error('Error compressing images:', error)
      } finally {
        setCompressing(false)
      }
    },
    [photos, maxPhotos, onPhotosChange, disabled]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.heic'],
    },
    maxSize: maxFileSize,
    disabled: disabled || photos.length >= maxPhotos,
    multiple: true,
  })

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index)

    // Revoke object URL to free memory
    URL.revokeObjectURL(photos[index].preview)

    setPhotos(updatedPhotos)

    // Notify parent component
    if (onPhotosChange) {
      const files = updatedPhotos.map((p) => {
        if (p.compressed) {
          return new File([p.compressed], p.file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
        }
        return p.file
      })
      onPhotosChange(files)
    }
  }

  return (
    <Box>
      {photos.length < maxPhotos && (
        <DropZone
          {...getRootProps()}
          className={`${isDragActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        >
          <input
            {...getInputProps()}
            capture="environment" // Use back camera on mobile
          />
          <CameraAltIcon
            sx={{
              fontSize: 48,
              color: 'primary.main',
              mb: 2,
            }}
          />
          <Typography variant="h6" gutterBottom>
            {compressing ? 'Compressing images...' : 'Take or Upload Photos'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isDragActive
              ? 'Drop photos here'
              : 'Tap to take a photo or drag and drop'}
          </Typography>
          <Button
            variant="secondary"
            icon={<CloudUploadIcon />}
            disabled={disabled || compressing}
            loading={compressing}
          >
            Choose Files
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {photos.length} / {maxPhotos} photos • Max {Math.round(maxFileSize / (1024 * 1024))}MB per file
          </Typography>
        </DropZone>
      )}

      {photos.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Photos ({photos.length})
          </Typography>
          <Grid container spacing={2}>
            {photos.map((photo, index) => (
              <Grid item xs={6} sm={4} md={3} key={photo.preview}>
                <PhotoPreview>
                  <CardMedia
                    component="img"
                    height="200"
                    image={photo.preview}
                    alt={`Photo ${index + 1}`}
                    sx={{ objectFit: 'cover' }}
                  />
                  <DeleteButton
                    size="small"
                    onClick={() => removePhoto(index)}
                    disabled={disabled}
                  >
                    <DeleteIcon fontSize="small" />
                  </DeleteButton>
                </PhotoPreview>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  )
}
