'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import GroupIcon from '@mui/icons-material/Group'
import ConstructionIcon from '@mui/icons-material/Construction'
import { apiClient } from '@/lib/api/client'

interface TeamMember {
  id?: string
  user?: {
    fullName: string
    email: string
    role?: string
  }
  activeTasks?: number
  completedTasks?: number
  role?: string
}

export default function TeamWorkloadPage() {
  const t = useTranslations()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [notAvailable, setNotAvailable] = useState(false)

  useEffect(() => {
    loadTeamWorkload()
  }, [])

  const loadTeamWorkload = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/team-members')
      setMembers(response.data || [])
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotAvailable(true)
      } else {
        console.error('Failed to load team workload:', err)
        setNotAvailable(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={280} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={380} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={160} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    )
  }

  if (notAvailable || members.length === 0) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
            {t('teamWorkload.title', { defaultValue: 'Team Workload' })}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('teamWorkload.subtitle', { defaultValue: 'Monitor team assignments and capacity' })}
          </Typography>
        </Box>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <ConstructionIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
              {t('teamWorkload.comingSoon', { defaultValue: 'Coming Soon' })}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
              {t('teamWorkload.comingSoonDescription', { defaultValue: 'Team workload tracking is currently under development. Check back soon for real-time team capacity monitoring.' })}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
            {t('teamWorkload.title', { defaultValue: 'Team Workload' })}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('teamWorkload.subtitle', { defaultValue: 'Monitor team assignments and capacity' })}
          </Typography>
        </Box>
        <Chip icon={<GroupIcon />} label={`${members.length} ${t('teamWorkload.members', { defaultValue: 'Members' })}`} color="primary" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {members.map((member, index) => {
          const name = member.user?.fullName || member.user?.email || 'Team Member'
          const totalTasks = (member.activeTasks || 0) + (member.completedTasks || 0)
          const progress = totalTasks > 0 ? Math.round(((member.completedTasks || 0) / totalTasks) * 100) : 0

          return (
            <Card key={member.id || index} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: `hsl(${(index * 60) % 360}, 70%, 50%)`, fontWeight: 600 }}>
                    {name[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {member.role || member.user?.role || t('teamWorkload.teamMember', { defaultValue: 'Team Member' })}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('teamWorkload.progress', { defaultValue: 'Progress' })}
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>{progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={`${member.activeTasks || 0} ${t('teamWorkload.active', { defaultValue: 'Active' })}`} size="small" color="warning" variant="outlined" />
                  <Chip label={`${member.completedTasks || 0} ${t('teamWorkload.done', { defaultValue: 'Done' })}`} size="small" color="success" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>
    </Box>
  )
}
