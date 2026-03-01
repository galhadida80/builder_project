import { Box } from '@/mui'

interface TemplateDataTabProps {
  templateData: unknown
}

export function TemplateDataTab({ templateData }: TemplateDataTabProps) {
  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      <Box
        component="pre"
        sx={{
          bgcolor: 'grey.100',
          p: 2,
          borderRadius: 1,
          overflow: 'auto',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
        }}
      >
        {JSON.stringify(templateData, null, 2)}
      </Box>
    </Box>
  )
}
