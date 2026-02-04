import { apiClient } from './client'
import type { TeamMember } from '../components/TeamMemberCard'

export const teamMembersApi = {
  list: async (): Promise<TeamMember[]> => {
    const response = await apiClient.get('/team-members')
    return response.data
  },
}
