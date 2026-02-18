import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { TeamMemberCard, type TeamMember } from '../components/TeamMemberCard'
import { teamMembersApi } from '../api/teamMembers'
import { useToast } from '../components/common/ToastProvider'
import { GroupIcon } from '@/icons'
import { Box, Typography, Skeleton, Grid } from '@/mui'

export default function TeamMembersPage() {
  const { t } = useTranslation()
  const { showError } = useToast()
  const { projectId } = useParams<{ projectId: string }>()
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    loadTeamMembers()
  }, [projectId])

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      const data = await teamMembersApi.list(projectId)
      setTeamMembers(data)
    } catch (error) {
      showError(t('teamMembers.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Grid container spacing={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          {t('teamMembers.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('teamMembers.subtitle')}
        </Typography>
      </Box>

      {teamMembers.length > 0 ? (
        <Grid container spacing={3}>
          {teamMembers.map((member) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
              <TeamMemberCard member={member} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState
          title={t('teamMembers.noMembers')}
          description={t('teamMembers.noMembersDescription')}
          icon={<GroupIcon sx={{ color: 'text.secondary' }} />}
        />
      )}
    </Box>
  )
}
