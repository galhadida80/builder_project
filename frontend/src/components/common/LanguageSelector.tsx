import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageIcon } from '@/icons'
import { IconButton, Menu, MenuItem, Box, Typography } from '@/mui'

export default function LanguageSelector() {
  const { t, i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng)
    handleClose()
  }

  return (
    <Box>
      <IconButton
        onClick={handleClick}
        title={t('language.selectLanguage')}
        sx={{ ml: 1 }}
      >
        <LanguageIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{ sx: { width: 150 } }}
      >
        <MenuItem
          onClick={() => handleLanguageChange('en')}
          selected={i18n.language === 'en'}
        >
          <Typography variant="body2">{t('language.english')}</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => handleLanguageChange('he')}
          selected={i18n.language === 'he'}
        >
          <Typography variant="body2">{t('language.hebrew')}</Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}
