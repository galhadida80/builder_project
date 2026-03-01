import { apiClient } from './client'

export interface OrganizationRole {
  id: string
  organizationId: string
  name: string
  description: string | null
  permissions: string[] | null
  isSystemRole: boolean
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectRole {
  id: string
  projectId: string
  name: string
  description: string | null
  permissions: string[] | null
  inheritsFromId: string | null
  isSystemRole: boolean
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganizationRoleCreate {
  organization_id: string
  name: string
  description?: string
  permissions?: string[]
}

export interface OrganizationRoleUpdate {
  name?: string
  description?: string
  permissions?: string[]
}

export interface ProjectRoleCreate {
  project_id: string
  name: string
  description?: string
  permissions?: string[]
  inherits_from_id?: string
}

export interface ProjectRoleUpdate {
  name?: string
  description?: string
  permissions?: string[]
  inherits_from_id?: string
}

export const rolesApi = {
  // Organization Roles
  listOrganizationRoles: async (organizationId: string): Promise<OrganizationRole[]> => {
    const response = await apiClient.get(`/organizations/${organizationId}/roles`)
    return response.data
  },

  getOrganizationRole: async (organizationId: string, roleId: string): Promise<OrganizationRole> => {
    const response = await apiClient.get(`/organizations/${organizationId}/roles/${roleId}`)
    return response.data
  },

  createOrganizationRole: async (organizationId: string, data: OrganizationRoleCreate): Promise<OrganizationRole> => {
    const response = await apiClient.post(`/organizations/${organizationId}/roles`, data)
    return response.data
  },

  updateOrganizationRole: async (
    organizationId: string,
    roleId: string,
    data: OrganizationRoleUpdate
  ): Promise<OrganizationRole> => {
    const response = await apiClient.put(`/organizations/${organizationId}/roles/${roleId}`, data)
    return response.data
  },

  deleteOrganizationRole: async (organizationId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${organizationId}/roles/${roleId}`)
  },

  // Project Roles
  listProjectRoles: async (projectId: string): Promise<ProjectRole[]> => {
    const response = await apiClient.get(`/projects/${projectId}/roles`)
    return response.data
  },

  getProjectRole: async (projectId: string, roleId: string): Promise<ProjectRole> => {
    const response = await apiClient.get(`/projects/${projectId}/roles/${roleId}`)
    return response.data
  },

  createProjectRole: async (projectId: string, data: ProjectRoleCreate): Promise<ProjectRole> => {
    const response = await apiClient.post(`/projects/${projectId}/roles`, data)
    return response.data
  },

  updateProjectRole: async (projectId: string, roleId: string, data: ProjectRoleUpdate): Promise<ProjectRole> => {
    const response = await apiClient.put(`/projects/${projectId}/roles/${roleId}`, data)
    return response.data
  },

  deleteProjectRole: async (projectId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/roles/${roleId}`)
  },
}
