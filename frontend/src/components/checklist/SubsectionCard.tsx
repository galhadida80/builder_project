import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChecklistSubSection } from '../../types'
import { ExpandMoreIcon, ExpandLessIcon } from '@/icons'
import { Box, Typography, Chip, Collapse } from '@/mui'

interface SubsectionCardProps {
  subsection: ChecklistSubSection
}

export default function SubsectionCard({ subsection }: SubsectionCardProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, cursor: 'pointer',
          '&:hover': { bgcolor: 'grey.50' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600 }}>
            {subsection.order + 1}
          </Box>
          <Typography variant="body2" fontWeight={500}>{subsection.name}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip size="small" label={`${subsection.items.length} ${t('checklists.items')}`} variant="outlined" />
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>
      <Collapse in={open}>
        <Box onClick={(e) => e.stopPropagation()} sx={{ pl: 5, pr: 2, py: 1 }}>
          {subsection.items.map((item, idx) => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75, borderBottom: idx < subsection.items.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.primary">{item.name}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {item.must_image && <Chip size="small" label={t('checklists.requiresImage')} color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                {item.must_note && <Chip size="small" label={t('checklists.requiresNote')} color="info" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                {item.must_signature && <Chip size="small" label={t('checklists.requiresSignature')} color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}
