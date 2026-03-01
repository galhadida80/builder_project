import { apiClient } from './client'
import type { TeamMember } from '../components/TeamMemberCard'

interface ProjectMemberResponse {
  id: string
  userId: string
  user: {
    id: string
    email: string
    fullName?: string
    avatarUrl?: string
  }
  role: string
  addedAt: string
}

export const teamMembersApi = {
  list: async (projectId?: string): Promise<TeamMember[]> => {
    if (!projectId) return []
    const response = await apiClient.get<ProjectMemberResponse[]>(`/projects/${projectId}/members`)
    return response.data.map((m) => ({
      id: m.id,
      name: m.user.fullName || m.user.email,
      email: m.user.email,
      avatar: m.user.avatarUrl,
      roles: [m.role],
    }))
  },
}
