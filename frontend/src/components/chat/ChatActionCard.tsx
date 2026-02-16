import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatAction } from '../../api/chat'
import { CheckCircleIcon, CancelIcon, ExpandMoreIcon, ExpandLessIcon, BuildIcon, CategoryIcon, DescriptionIcon, EventIcon, EngineeringIcon, MapIcon, ContactsIcon, ApprovalIcon, ErrorOutlineIcon, ReportProblemIcon } from '@/icons'
import { Box, Card, CardContent, Typography, Button, Chip, CircularProgress, Table, TableBody, TableCell, TableRow, Collapse, IconButton } from '@/mui'

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  equipment: <BuildIcon fontSize="small" />,
  material: <CategoryIcon fontSize="small" />,
  rfi: <DescriptionIcon fontSize="small" />,
  inspection: <EngineeringIcon fontSize="small" />,
  meeting: <EventIcon fontSize="small" />,
  area: <MapIcon fontSize="small" />,
  contact: <ContactsIcon fontSize="small" />,
  defect: <ReportProblemIcon fontSize="small" />,
  equipment_submission: <ApprovalIcon fontSize="small" />,
  material_submission: <ApprovalIcon fontSize="small" />,
}

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  proposed: 'warning',
  executed: 'success',
  rejected: 'error',
  failed: 'error',
}

const PARAM_LABELS: Record<string, Record<string, string>> = {
  en: {
    new_status: 'New Status', reason: 'Reason', name: 'Name', equipment_type: 'Type',
    material_type: 'Type', manufacturer: 'Manufacturer', model_number: 'Model',
    notes: 'Notes', quantity: 'Quantity', unit: 'Unit', subject: 'Subject',
    question: 'Question', category: 'Category', priority: 'Priority',
    to_email: 'To Email', title: 'Title', description: 'Description',
    scheduled_date: 'Date', location: 'Location', contact_name: 'Name',
    contact_type: 'Type', company_name: 'Company', email: 'Email',
    phone: 'Phone', role_description: 'Role', new_progress: 'Progress',
    area_type: 'Area Type', floor_number: 'Floor', area_code: 'Code',
    total_units: 'Units', consultant_type_id: 'Consultant Type', comments: 'Comments',
    severity: 'Severity', defect_type: 'Defect Type', defect_number: 'Defect #',
  },
  he: {
    new_status: 'סטטוס חדש', reason: 'סיבה', name: 'שם', equipment_type: 'סוג',
    material_type: 'סוג', manufacturer: 'יצרן', model_number: 'דגם',
    notes: 'הערות', quantity: 'כמות', unit: 'יחידה', subject: 'נושא',
    question: 'שאלה', category: 'קטגוריה', priority: 'עדיפות',
    to_email: 'אימייל נמען', title: 'כותרת', description: 'תיאור',
    scheduled_date: 'תאריך', location: 'מיקום', contact_name: 'שם',
    contact_type: 'סוג', company_name: 'חברה', email: 'אימייל',
    phone: 'טלפון', role_description: 'תפקיד', new_progress: 'התקדמות',
    area_type: 'סוג אזור', floor_number: 'קומה', area_code: 'קוד',
    total_units: 'יחידות', consultant_type_id: 'סוג יועץ', comments: 'הערות',
    severity: 'חומרה', defect_type: 'סוג ליקוי', defect_number: 'מספר ליקוי',
  },
  es: {
    new_status: 'Nuevo Estado', reason: 'Razon', name: 'Nombre', equipment_type: 'Tipo',
    material_type: 'Tipo', manufacturer: 'Fabricante', model_number: 'Modelo',
    notes: 'Notas', quantity: 'Cantidad', unit: 'Unidad', subject: 'Asunto',
    question: 'Pregunta', category: 'Categoria', priority: 'Prioridad',
    to_email: 'Email', title: 'Titulo', description: 'Descripcion',
    scheduled_date: 'Fecha', location: 'Ubicacion', contact_name: 'Nombre',
    contact_type: 'Tipo', company_name: 'Empresa', email: 'Email',
    phone: 'Telefono', role_description: 'Rol', new_progress: 'Progreso',
    area_type: 'Tipo de Area', floor_number: 'Piso', area_code: 'Codigo',
    total_units: 'Unidades', consultant_type_id: 'Tipo Consultor', comments: 'Comentarios',
    severity: 'Severidad', defect_type: 'Tipo de Defecto', defect_number: 'Defecto #',
  },
}

interface ChatActionCardProps {
  action: ChatAction
  onExecute: (actionId: string) => Promise<void>
  onReject: (actionId: string) => Promise<void>
}

export default function ChatActionCard({ action, onExecute, onReject }: ChatActionCardProps) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(action.status === 'proposed')

  const lang = i18n.language as 'en' | 'he' | 'es'
  const labels = PARAM_LABELS[lang] || PARAM_LABELS.en

  const handleExecute = async () => {
    setLoading(true)
    try {
      await onExecute(action.id)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      await onReject(action.id)
    } finally {
      setLoading(false)
    }
  }

  const icon = ENTITY_ICONS[action.entityType] || <BuildIcon fontSize="small" />
  const statusColor = STATUS_COLORS[action.status] || 'default'
  const isProposed = action.status === 'proposed'

  const params = action.parameters || {}
  const paramEntries = Object.entries(params).filter(
    ([, v]) => v !== '' && v !== null && v !== undefined
  )

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 1,
        mb: 0.5,
        borderColor: isProposed ? 'warning.main' : statusColor === 'success' ? 'success.main' : statusColor === 'error' ? 'error.main' : 'divider',
        borderWidth: isProposed ? 1.5 : 1,
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
            {action.description}
          </Typography>
          <Chip
            label={t(`chat.action.${action.status}`)}
            color={statusColor}
            size="small"
            variant={isProposed ? 'outlined' : 'filled'}
          />
          {paramEntries.length > 0 && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>

        <Collapse in={expanded}>
          {paramEntries.length > 0 && (
            <Table size="small" sx={{ mt: 1, '& td': { py: 0.5, px: 1, borderBottom: '1px solid', borderColor: 'divider' } }}>
              <TableBody>
                {paramEntries.map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: '40%', fontSize: '0.8rem' }}>
                      {labels[key] || key}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      {typeof value === 'number' ? String(value) : String(value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Collapse>

        {action.status === 'failed' && action.result && 'error' in action.result && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <ErrorOutlineIcon fontSize="small" color="error" />
            <Typography variant="caption" color="error">
              {String(action.result.error)}
            </Typography>
          </Box>
        )}

        {isProposed && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={handleReject}
                >
                  {t('chat.action.reject')}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleExecute}
                >
                  {t('chat.action.approve')}
                </Button>
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
