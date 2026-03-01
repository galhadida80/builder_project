import { ArrowBackIcon, ArrowForwardIcon } from '@/icons'
import { useTheme } from '@/mui'
import type { SvgIconProps } from '@mui/material'

export function BackArrowIcon(props: SvgIconProps) {
  const theme = useTheme()
  return theme.direction === 'rtl' ? <ArrowForwardIcon {...props} /> : <ArrowBackIcon {...props} />
}
