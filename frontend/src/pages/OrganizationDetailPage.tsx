import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { organizationsApi } from '../api/organizations'
import type { Organization, OrganizationMember } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField } from '../components/ui/TextField'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { BusinessIcon, AddIcon, GroupIcon, DeleteIcon, FolderIcon, ArrowBackIcon } from '@/icons'
import {
  Box, Typography, Skeleton, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tab as MuiTab, Tabs as MuiTabs,
} from '@/mui'

export default function OrganizationDetailPage() {
  const { t } = useTranslation()
  const { orgId } = useParams()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [tabIndex, setTabIndex] = useState(0)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'org_member' })
  const [saving, setSaving] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)

  useEffect(() => {
    if (orgId) loadData()
  }, [orgId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [orgData, membersData, projectsData] = await Promise.all([
        organizationsApi.get(orgId!),
        organizationsApi.listMembers(orgId!),
        organizationsApi.listProjects(orgId!),
      ])
      setOrg(orgData)
      setMembers(membersData)
      setProjects(projectsData)
    } catch {
      showError(t('organizations.failedToLoad', 'Failed to load organization'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!orgId || !memberForm.userId.trim()) return
    setSaving(true)
    try {
      await organizationsApi.addMember(orgId, {
        user_id: memberForm.userId,
        role: memberForm.role,
      })
      showSuccess(t('organizations.memberAdded', 'Member added'))
      setAddMemberOpen(false)
      setMemberForm({ userId: '', role: 'org_member' })
      const updated = await organizationsApi.listMembers(orgId)
      setMembers(updated)
    } catch {
      showError(t('organizations.failedToAddMember', 'Failed to add member'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!orgId || !removeMemberId) return
    try {
      await organizationsApi.removeMember(orgId, removeMemberId)
      showSuccess(t('organizations.memberRemoved', 'Member removed'))
      setRemoveMemberId(null)
      const updated = await organizationsApi.listMembers(orgId)
      setMembers(updated)
    } catch {
      showError(t('organizations.failedToRemoveMember', 'Failed to remove member'))
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (!org) {
    return (
      <Box sx={{ p: 3 }}>
        <EmptyState
          variant="no-results"
          title={t('organizations.notFound', 'Organization not found')}
          description={t('organizations.notFoundDescription', 'This organization does not exist or you do not have access')}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={org.name}
        subtitle={org.description || org.code}
        breadcrumbs={[
          { label: t('organizations.title', 'Organizations'), href: '/organizations' },
          { label: org.name },
        ]}
        actions={
          <Button variant="secondary" icon={<ArrowBackIcon />} onClick={() => navigate('/organizations')}>
            {t('common.back', 'Back')}
          </Button>
        }
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BusinessIcon sx={{ color: 'white', fontSize: 26 }} />
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={org.code} size="small" variant="outlined" />
            <Chip
              icon={<GroupIcon sx={{ fontSize: 14 }} />}
              label={`${org.memberCount} ${t('organizations.members', 'members')}`}
              size="small"
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('organizations.createdAt', 'Created')}: {new Date(org.createdAt).toLocaleDateString(getDateLocale())}
          </Typography>
        </Box>
      </Box>

      <MuiTabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
        <MuiTab label={t('organizations.membersTab', 'Members')} />
        <MuiTab label={t('organizations.projectsTab', 'Projects')} />
      </MuiTabs>

      {tabIndex === 0 && (
        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {t('organizations.membersTab', 'Members')} ({members.length})
              </Typography>
              <Button variant="primary" size="small" icon={<AddIcon />} onClick={() => setAddMemberOpen(true)}>
                {t('organizations.addMember', 'Add Member')}
              </Button>
            </Box>

            {members.length === 0 ? (
              <EmptyState
                variant="no-results"
                title={t('organizations.noMembers', 'No members yet')}
                description={t('organizations.noMembersDescription', 'Add members to your organization')}
                action={{ label: t('organizations.addMember', 'Add Member'), onClick: () => setAddMemberOpen(true) }}
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('organizations.memberEmail', 'Email')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('organizations.memberName', 'Full Name')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('organizations.memberRole', 'Role')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('organizations.addedAt', 'Added')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }} align="center">{t('common.actions', 'Actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} hover>
                        <TableCell>
                          <Typography variant="body2">{member.user?.email || member.userId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {member.user?.fullName || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={member.role === 'org_admin' ? t('organizations.admin', 'Admin') : t('organizations.member', 'Member')}
                            size="small"
                            color={member.role === 'org_admin' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(member.addedAt).toLocaleDateString(getDateLocale())}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => setRemoveMemberId(member.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Card>
      )}

      {tabIndex === 1 && (
        <Card>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              {t('organizations.projectsTab', 'Projects')} ({projects.length})
            </Typography>

            {projects.length === 0 ? (
              <EmptyState
                variant="no-results"
                title={t('organizations.noProjects', 'No projects yet')}
                description={t('organizations.noProjectsDescription', 'Projects linked to this organization will appear here')}
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('organizations.projectName', 'Name')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('organizations.projectStatus', 'Status')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('organizations.projectCreated', 'Created')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.map((project: any) => (
                      <TableRow key={project.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FolderIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography variant="body2" fontWeight={600}>{project.name}</Typography>
                            {project.code && <Chip label={project.code} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={project.status || 'active'} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {project.createdAt ? new Date(project.createdAt).toLocaleDateString(getDateLocale()) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Card>
      )}

      <FormModal
        open={addMemberOpen}
        onClose={() => { setAddMemberOpen(false); setMemberForm({ userId: '', role: 'org_member' }) }}
        onSubmit={handleAddMember}
        title={t('organizations.addMember', 'Add Member')}
        submitLabel={t('organizations.addMember', 'Add Member')}
        loading={saving}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label={t('organizations.userIdOrEmail', 'User ID')}
            required
            value={memberForm.userId}
            onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
            helperText={t('organizations.userIdHint', 'Enter the user ID to add')}
          />
        </Box>
      </FormModal>

      <ConfirmModal
        open={!!removeMemberId}
        onClose={() => setRemoveMemberId(null)}
        onConfirm={handleRemoveMember}
        title={t('organizations.removeMember', 'Remove Member')}
        message={t('organizations.removeMemberConfirm', 'Are you sure you want to remove this member from the organization?')}
        confirmLabel={t('common.delete', 'Remove')}
        variant="danger"
      />
    </Box>
  )
}
