import { useTranslation } from 'react-i18next'
import { HelpOutlineIcon } from '@/icons'
import { Tooltip, IconButton } from '@/mui'

interface HelpTooltipProps {
  helpKey: string
}

export default function HelpTooltip({ helpKey }: HelpTooltipProps) {
  const { t } = useTranslation()

  return (
    <Tooltip title={t(helpKey)} arrow placement="top">
      <IconButton size="small" aria-label={t('help.title')} sx={{ ml: 0.5, opacity: 0.6, '&:hover': { opacity: 1 } }}>
        <HelpOutlineIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  )
}
