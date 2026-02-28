import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/common/ToastProvider'
import { useAuth } from '../contexts/AuthContext'
import { AttachMoneyIcon, ReceiptLongIcon, PeopleIcon, AssignmentIcon } from '@/icons'
import { Box, Typography, Paper, Tabs, Tab, useTheme } from '@/mui'
import { SubscriptionManager } from '../components/billing/SubscriptionManager'
import { InvoiceHistory } from '../components/billing/InvoiceHistory'
import { PaymentMethodManager } from '../components/billing/PaymentMethodManager'
import { SeatManager } from '../components/billing/SeatManager'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`billing-tabpanel-${index}`}
      aria-labelledby={`billing-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function BillingPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const theme = useTheme()
  const [currentTab, setCurrentTab] = useState(0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue)
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 12, sm: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {t('billing.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('billing.subtitle')}
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1200 }}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: 2,
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              },
            }}
          >
            <Tab
              icon={<AssignmentIcon />}
              iconPosition="start"
              label={t('billing.tabs.subscription')}
              id="billing-tab-0"
              aria-controls="billing-tabpanel-0"
            />
            <Tab
              icon={<ReceiptLongIcon />}
              iconPosition="start"
              label={t('billing.tabs.invoices')}
              id="billing-tab-1"
              aria-controls="billing-tabpanel-1"
            />
            <Tab
              icon={<AttachMoneyIcon />}
              iconPosition="start"
              label={t('billing.tabs.paymentMethods')}
              id="billing-tab-2"
              aria-controls="billing-tabpanel-2"
            />
            <Tab
              icon={<PeopleIcon />}
              iconPosition="start"
              label={t('billing.tabs.seats')}
              id="billing-tab-3"
              aria-controls="billing-tabpanel-3"
            />
          </Tabs>

          <Box sx={{ px: { xs: 2, sm: 3 } }}>
            <TabPanel value={currentTab} index={0}>
              <SubscriptionManager />
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
              <InvoiceHistory />
            </TabPanel>

            <TabPanel value={currentTab} index={2}>
              <PaymentMethodManager />
            </TabPanel>

            <TabPanel value={currentTab} index={3}>
              <SeatManager />
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
