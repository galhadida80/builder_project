import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Canvas, PencilBrush, FabricImage, Rect, Circle, FabricText, Line } from 'fabric'
import {
  Box, Typography, IconButton, Dialog, DialogActions, Slider, Tooltip,
} from '@/mui'
import { Button } from '../ui/Button'
import {
  CloseIcon, UndoIcon, RedoIcon, CheckCircleIcon, DeleteIcon,
  EditIcon, TextFieldsIcon, CropSquareIcon,
} from '@/icons'

type AnnotationTool = 'pen' | 'highlighter' | 'arrow' | 'rectangle' | 'circle' | 'text'

const TOOL_COLORS = ['#FF0000', '#FF6600', '#FFCC00', '#00CC00', '#0066FF', '#9933FF', '#000000', '#FFFFFF']

interface ImageAnnotatorProps {
  imageUrl: string
  open: boolean
  onClose: () => void
  onSave: (annotatedBlob: Blob) => void
}

export function ImageAnnotator({ imageUrl, open, onClose, onSave }: ImageAnnotatorProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [activeTool, setActiveTool] = useState<AnnotationTool>('pen')
  const [activeColor, setActiveColor] = useState('#FF0000')
  const [brushSize, setBrushSize] = useState(3)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [canvasReady, setCanvasReady] = useState(false)
  const isDrawingShape = useRef(false)
  const shapeStart = useRef<{ x: number; y: number } | null>(null)

  const saveState = useCallback(() => {
    if (!fabricRef.current) return
    const json = JSON.stringify(fabricRef.current.toJSON())
    setUndoStack((prev) => [...prev.slice(-30), json])
    setRedoStack([])
  }, [])

  useEffect(() => {
    if (!open || !canvasRef.current) return

    const canvas = new Canvas(canvasRef.current, {
      width: window.innerWidth > 600 ? 560 : window.innerWidth - 32,
      height: window.innerHeight > 700 ? 500 : window.innerHeight - 200,
      backgroundColor: '#f5f5f5',
    })
    fabricRef.current = canvas

    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const canvasW = canvas.width!
      const canvasH = canvas.height!
      const scale = Math.min(canvasW / img.width!, canvasH / img.height!)
      img.scale(scale)
      img.set({
        left: (canvasW - img.width! * scale) / 2,
        top: (canvasH - img.height! * scale) / 2,
        selectable: false,
        evented: false,
      })
      canvas.backgroundImage = img
      canvas.renderAll()
      setCanvasReady(true)
      saveState()
    })

    return () => {
      canvas.dispose()
      fabricRef.current = null
      setCanvasReady(false)
      setUndoStack([])
      setRedoStack([])
    }
  }, [open, imageUrl])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !canvasReady) return

    canvas.off('mouse:down')
    canvas.off('mouse:move')
    canvas.off('mouse:up')
    canvas.off('path:created')

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      canvas.isDrawingMode = true
      const brush = new PencilBrush(canvas)
      brush.color = activeTool === 'highlighter' ? `${activeColor}66` : activeColor
      brush.width = activeTool === 'highlighter' ? brushSize * 4 : brushSize
      canvas.freeDrawingBrush = brush
      canvas.on('path:created', () => saveState())
    } else {
      canvas.isDrawingMode = false

      if (activeTool === 'text') {
        canvas.on('mouse:down', (opt) => {
          if (opt.target) return
          const pointer = canvas.getScenePoint(opt.e)
          const text = new FabricText(t('checklists.annotationText', 'Text'), {
            left: pointer.x,
            top: pointer.y,
            fontSize: brushSize * 6,
            fill: activeColor,
            fontFamily: 'Arial',
            editable: true,
          })
          canvas.add(text)
          canvas.setActiveObject(text)
          saveState()
        })
      } else if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'arrow') {
        canvas.on('mouse:down', (opt) => {
          if (opt.target) return
          const pointer = canvas.getScenePoint(opt.e)
          isDrawingShape.current = true
          shapeStart.current = { x: pointer.x, y: pointer.y }
        })

        canvas.on('mouse:up', (opt) => {
          if (!isDrawingShape.current || !shapeStart.current) return
          isDrawingShape.current = false
          const pointer = canvas.getScenePoint(opt.e)
          const { x: sx, y: sy } = shapeStart.current
          const w = pointer.x - sx
          const h = pointer.y - sy

          if (Math.abs(w) < 5 && Math.abs(h) < 5) return

          if (activeTool === 'rectangle') {
            const rect = new Rect({
              left: Math.min(sx, pointer.x),
              top: Math.min(sy, pointer.y),
              width: Math.abs(w),
              height: Math.abs(h),
              fill: 'transparent',
              stroke: activeColor,
              strokeWidth: brushSize,
            })
            canvas.add(rect)
          } else if (activeTool === 'circle') {
            const rx = Math.abs(w) / 2
            const ry = Math.abs(h) / 2
            const circle = new Circle({
              left: Math.min(sx, pointer.x),
              top: Math.min(sy, pointer.y),
              radius: Math.max(rx, ry),
              fill: 'transparent',
              stroke: activeColor,
              strokeWidth: brushSize,
              scaleX: rx / Math.max(rx, ry),
              scaleY: ry / Math.max(rx, ry),
            })
            canvas.add(circle)
          } else if (activeTool === 'arrow') {
            const line = new Line([sx, sy, pointer.x, pointer.y], {
              stroke: activeColor,
              strokeWidth: brushSize,
            })
            canvas.add(line)
            const angle = Math.atan2(pointer.y - sy, pointer.x - sx)
            const headLen = brushSize * 5
            const head1 = new Line([
              pointer.x, pointer.y,
              pointer.x - headLen * Math.cos(angle - Math.PI / 6),
              pointer.y - headLen * Math.sin(angle - Math.PI / 6),
            ], { stroke: activeColor, strokeWidth: brushSize })
            const head2 = new Line([
              pointer.x, pointer.y,
              pointer.x - headLen * Math.cos(angle + Math.PI / 6),
              pointer.y - headLen * Math.sin(angle + Math.PI / 6),
            ], { stroke: activeColor, strokeWidth: brushSize })
            canvas.add(head1)
            canvas.add(head2)
          }
          canvas.renderAll()
          saveState()
        })
      }
    }
  }, [activeTool, activeColor, brushSize, canvasReady, saveState, t])

  const handleUndo = () => {
    if (undoStack.length <= 1 || !fabricRef.current) return
    const current = undoStack[undoStack.length - 1]
    const prev = undoStack[undoStack.length - 2]
    setRedoStack((r) => [...r, current])
    setUndoStack((u) => u.slice(0, -1))
    fabricRef.current.loadFromJSON(prev).then(() => fabricRef.current?.renderAll())
  }

  const handleRedo = () => {
    if (redoStack.length === 0 || !fabricRef.current) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((r) => r.slice(0, -1))
    setUndoStack((u) => [...u, next])
    fabricRef.current.loadFromJSON(next).then(() => fabricRef.current?.renderAll())
  }

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const active = canvas.getActiveObjects()
    active.forEach((obj) => canvas.remove(obj))
    canvas.discardActiveObject()
    canvas.renderAll()
    saveState()
  }

  const handleSave = () => {
    if (!fabricRef.current) return
    fabricRef.current.discardActiveObject()
    fabricRef.current.renderAll()
    const dataUrl = fabricRef.current.toDataURL({ format: 'png', multiplier: 2 })
    fetch(dataUrl).then((res) => res.blob()).then((blob) => onSave(blob))
  }

  const tools: { key: AnnotationTool; icon: React.ReactNode; label: string }[] = [
    { key: 'pen', icon: <EditIcon />, label: t('checklists.toolPen', 'Pen') },
    { key: 'highlighter', icon: <EditIcon sx={{ opacity: 0.5 }} />, label: t('checklists.toolHighlighter', 'Highlighter') },
    { key: 'arrow', icon: <span style={{ fontSize: 18 }}>↗</span>, label: t('checklists.toolArrow', 'Arrow') },
    { key: 'rectangle', icon: <CropSquareIcon />, label: t('checklists.toolRectangle', 'Rectangle') },
    { key: 'circle', icon: <span style={{ fontSize: 18, lineHeight: 1 }}>○</span>, label: t('checklists.toolCircle', 'Circle') },
    { key: 'text', icon: <TextFieldsIcon />, label: t('checklists.toolText', 'Text') },
  ]

  return (
    <Dialog open={open} onClose={onClose} fullScreen maxWidth={false}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
        {/* Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
          <Box sx={{ mx: 0.5, width: 1, height: 24, bgcolor: 'divider' }} />

          {/* Tool buttons */}
          {tools.map((tool) => (
            <Tooltip key={tool.key} title={tool.label}>
              <IconButton
                size="small"
                onClick={() => setActiveTool(tool.key)}
                sx={{
                  bgcolor: activeTool === tool.key ? 'primary.light' : 'transparent',
                  color: activeTool === tool.key ? 'primary.main' : 'text.secondary',
                  border: activeTool === tool.key ? 2 : 0,
                  borderColor: 'primary.main',
                }}
              >
                {tool.icon}
              </IconButton>
            </Tooltip>
          ))}

          <Box sx={{ mx: 0.5, width: 1, height: 24, bgcolor: 'divider' }} />

          {/* Color picker */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {TOOL_COLORS.map((color) => (
              <Box
                key={color}
                onClick={() => setActiveColor(color)}
                sx={{
                  width: 24, height: 24, borderRadius: '50%', bgcolor: color,
                  border: activeColor === color ? '3px solid' : '1px solid',
                  borderColor: activeColor === color ? 'primary.main' : 'divider',
                  cursor: 'pointer', transition: 'transform 100ms',
                  '&:hover': { transform: 'scale(1.2)' },
                }}
              />
            ))}
          </Box>

          <Box sx={{ mx: 0.5, width: 1, height: 24, bgcolor: 'divider' }} />

          {/* Brush size */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {brushSize}px
            </Typography>
            <Slider
              value={brushSize}
              onChange={(_, v) => setBrushSize(v as number)}
              min={1} max={12} step={1}
              size="small"
              sx={{ width: 80 }}
            />
          </Box>

          <Box sx={{ mx: 0.5, width: 1, height: 24, bgcolor: 'divider' }} />

          {/* Actions */}
          <Tooltip title={t('common.undo')}>
            <span>
              <IconButton size="small" onClick={handleUndo} disabled={undoStack.length <= 1}><UndoIcon /></IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('common.redo')}>
            <span>
              <IconButton size="small" onClick={handleRedo} disabled={redoStack.length === 0}><RedoIcon /></IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton size="small" onClick={handleDeleteSelected} color="error"><DeleteIcon /></IconButton>
          </Tooltip>
        </Box>

        {/* Canvas */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', p: 2 }}>
          <canvas ref={canvasRef} />
        </Box>

        {/* Footer */}
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" icon={<CheckCircleIcon />} onClick={handleSave}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
