import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AnnotationToolbar, type AnnotationTool } from './AnnotationToolbar';
import { Box } from '@/mui';

interface DrawOperation {
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  points?: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  text?: string;
}

interface PhotoAnnotatorProps {
  imageUrl: string;
  onSave: (annotatedImageDataUrl: string) => void;
  onCancel: () => void;
}

export function PhotoAnnotator({ imageUrl, onSave, onCancel }: PhotoAnnotatorProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [activeTool, setActiveTool] = useState<AnnotationTool>('pen');
  const [activeColor, setActiveColor] = useState('#f44336');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [operations, setOperations] = useState<DrawOperation[]>([]);
  const [redoStack, setRedoStack] = useState<DrawOperation[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentOp, setCurrentOp] = useState<DrawOperation | null>(null);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
      }
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    },
    [],
  );

  const drawOperationOnCtx = useCallback(
    (ctx: CanvasRenderingContext2D, op: DrawOperation) => {
      ctx.strokeStyle = op.color;
      ctx.fillStyle = op.color;
      ctx.lineWidth = op.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (op.tool) {
        case 'pen':
          if (op.points && op.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(op.points[0].x, op.points[0].y);
            for (let i = 1; i < op.points.length; i++) {
              ctx.lineTo(op.points[i].x, op.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'arrow':
          if (op.startX != null && op.startY != null && op.endX != null && op.endY != null) {
            const headLen = 15 + op.strokeWidth * 2;
            const angle = Math.atan2(op.endY - op.startY, op.endX - op.startX);
            ctx.beginPath();
            ctx.moveTo(op.startX, op.startY);
            ctx.lineTo(op.endX, op.endY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(op.endX, op.endY);
            ctx.lineTo(
              op.endX - headLen * Math.cos(angle - Math.PI / 6),
              op.endY - headLen * Math.sin(angle - Math.PI / 6),
            );
            ctx.moveTo(op.endX, op.endY);
            ctx.lineTo(
              op.endX - headLen * Math.cos(angle + Math.PI / 6),
              op.endY - headLen * Math.sin(angle + Math.PI / 6),
            );
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (op.startX != null && op.startY != null && op.endX != null && op.endY != null) {
            ctx.beginPath();
            ctx.rect(op.startX, op.startY, op.endX - op.startX, op.endY - op.startY);
            ctx.stroke();
          }
          break;

        case 'circle':
          if (op.startX != null && op.startY != null && op.endX != null && op.endY != null) {
            const rx = Math.abs(op.endX - op.startX) / 2;
            const ry = Math.abs(op.endY - op.startY) / 2;
            const cx = op.startX + (op.endX - op.startX) / 2;
            const cy = op.startY + (op.endY - op.startY) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;

        case 'text':
          if (op.text && op.startX != null && op.startY != null) {
            ctx.font = `bold ${16 + op.strokeWidth * 2}px sans-serif`;
            ctx.fillText(op.text, op.startX, op.startY);
          }
          break;
      }
    },
    [],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const op of operations) {
      drawOperationOnCtx(ctx, op);
    }
    if (currentOp) {
      drawOperationOnCtx(ctx, currentOp);
    }
  }, [operations, currentOp, drawOperationOnCtx]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) e.preventDefault();
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'text') {
      const text = window.prompt(t('annotations.textPrompt'));
      if (text) {
        const op: DrawOperation = { tool: 'text', color: activeColor, strokeWidth, text, startX: x, startY: y };
        setOperations((prev) => [...prev, op]);
        setRedoStack([]);
      }
      return;
    }

    setDrawing(true);
    const op: DrawOperation = {
      tool: activeTool,
      color: activeColor,
      strokeWidth,
      ...(activeTool === 'pen' ? { points: [{ x, y }] } : { startX: x, startY: y, endX: x, endY: y }),
    };
    setCurrentOp(op);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing || !currentOp) return;
    if ('touches' in e) e.preventDefault();
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'pen') {
      setCurrentOp((prev) =>
        prev ? { ...prev, points: [...(prev.points || []), { x, y }] } : prev,
      );
    } else {
      setCurrentOp((prev) => (prev ? { ...prev, endX: x, endY: y } : prev));
    }
  };

  const handlePointerUp = () => {
    if (!drawing || !currentOp) return;
    setDrawing(false);
    setOperations((prev) => [...prev, currentOp]);
    setRedoStack([]);
    setCurrentOp(null);
  };

  const handleUndo = () => {
    setOperations((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setOperations((ops) => [...ops, last]);
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setRedoStack([...operations]);
    setOperations([]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AnnotationToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        strokeWidth={strokeWidth}
        canUndo={operations.length > 0}
        canRedo={redoStack.length > 0}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSave={handleSave}
        onCancel={onCancel}
      />
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'grey.900',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', maxHeight: '100%', cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </Box>
    </Box>
  );
}
