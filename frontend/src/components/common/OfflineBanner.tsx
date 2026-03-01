import { useTranslation } from 'react-i18next'
import { useNetwork } from '../../contexts/NetworkContext'
import { Alert, Slide } from '@/mui'
import { styled } from '@/mui'

const StyledBannerContainer = styled('div')(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: theme.zIndex.snackbar,
  display: 'flex',
  justifyContent: 'center',
  pointerEvents: 'none',
}))

const StyledAlert = styled(Alert)(({ theme }) => ({
  width: '100%',
  borderRadius: 0,
  pointerEvents: 'auto',
  boxShadow: theme.shadows[3],
}))

export function OfflineBanner() {
  const { isOnline } = useNetwork()
  const { t } = useTranslation()

  return (
    <Slide direction="down" in={!isOnline} mountOnEnter unmountOnExit>
      <StyledBannerContainer>
        <StyledAlert severity="warning" variant="filled">
          {t('offline.offlineBanner')}
        </StyledAlert>
      </StyledBannerContainer>
    </Slide>
  )
}
