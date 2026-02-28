import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Card } from '../components/ui/Card'
import { ApprovalQueueList } from '../components/ApprovalQueueList'
import { Box } from '@/mui'

export default function ApprovalQueuePage() {
  const { t } = useTranslation()

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <PageHeader
        title={t('approvalQueue.title')}
        subtitle={t('approvalQueue.subtitle')}
        breadcrumbs={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('approvalQueue.title') }]}
      />

      <Card>
        <Box sx={{ p: 2.5 }}>
          <ApprovalQueueList />
        </Box>
      </Card>
    </Box>
  )
}
