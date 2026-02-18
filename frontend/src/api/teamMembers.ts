import { apiClient } from './client'
import type { TeamMember } from '../components/TeamMemberCard'

export const teamMembersApi = {
  list: async (projectId?: string): Promise<TeamMember[]> => {
    const url = projectId ? `/projects/${projectId}/members` : '/team-members'
    const response = await apiClient.get(url)
    return response.data
  },
}
