import { useTranslation } from 'react-i18next';
import {
  CreateIcon,
  ArrowForwardIcon,
  CropSquareIcon,
  PanoramaFishEyeIcon,
  TextFieldsIcon,
  UndoIcon,
  RedoIcon,
  DeleteIcon,
  SaveIcon,
  CloseIcon,
} from '@/icons';
import { Box, ToggleButton, ToggleButtonGroup, IconButton, Tooltip } from '@/mui';

export type AnnotationTool = 'pen' | 'arrow' | 'rectangle' | 'circle' | 'text';

const COLORS = ['#f44336', '#ffeb3b', '#f28c26', '#4caf50', '#ffffff', '#000000'];
const STROKE_WIDTHS = [2, 4, 6];

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  activeColor: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AnnotationToolbar({
  activeTool,
  activeColor,
  strokeWidth,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onCancel,
}: AnnotationToolbarProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', p: 1 }}>
      <ToggleButtonGroup
        value={activeTool}
        exclusive
        onChange={(_, val) => val && onToolChange(val)}
        size="small"
      >
        <ToggleButton value="pen" aria-label={t('annotations.pen')}>
          <Tooltip title={t('annotations.pen')}><CreateIcon fontSize="small" /></Tooltip>
        </ToggleButton>
        <ToggleButton value="arrow" aria-label={t('annotations.arrow')}>
          <Tooltip title={t('annotations.arrow')}><ArrowForwardIcon fontSize="small" /></Tooltip>
        </ToggleButton>
        <ToggleButton value="rectangle" aria-label={t('annotations.rectangle')}>
          <Tooltip title={t('annotations.rectangle')}><CropSquareIcon fontSize="small" /></Tooltip>
        </ToggleButton>
        <ToggleButton value="circle" aria-label={t('annotations.circle')}>
          <Tooltip title={t('annotations.circle')}><PanoramaFishEyeIcon fontSize="small" /></Tooltip>
        </ToggleButton>
        <ToggleButton value="text" aria-label={t('annotations.text')}>
          <Tooltip title={t('annotations.text')}><TextFieldsIcon fontSize="small" /></Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        {COLORS.map((color) => (
          <Box
            key={color}
            onClick={() => onColorChange(color)}
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: color,
              cursor: 'pointer',
              border: activeColor === color ? '3px solid' : '1px solid',
              borderColor: activeColor === color ? 'primary.main' : 'divider',
              transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.2)' },
            }}
          />
        ))}
      </Box>

      <ToggleButtonGroup
        value={strokeWidth}
        exclusive
        onChange={(_, val) => val && onStrokeWidthChange(val)}
        size="small"
      >
        {STROKE_WIDTHS.map((w) => (
          <ToggleButton key={w} value={w} aria-label={`${w}px`}>
            <Box
              sx={{
                width: 20,
                height: w,
                backgroundColor: 'currentColor',
                borderRadius: w / 2,
              }}
            />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
        <Tooltip title={t('annotations.undo')}>
          <span>
            <IconButton size="small" onClick={onUndo} disabled={!canUndo} aria-label={t('annotations.undo')}>
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('annotations.redo')}>
          <span>
            <IconButton size="small" onClick={onRedo} disabled={!canRedo} aria-label={t('annotations.redo')}>
              <RedoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('annotations.clear')}>
          <IconButton size="small" onClick={onClear} aria-label={t('annotations.clear')}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('annotations.save')}>
          <IconButton size="small" onClick={onSave} color="primary" aria-label={t('annotations.save')}>
            <SaveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('annotations.cancel')}>
          <IconButton size="small" onClick={onCancel} aria-label={t('annotations.cancel')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
