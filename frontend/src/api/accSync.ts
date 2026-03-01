import { apiClient } from './client';

export interface AccProjectLink {
  id: string;
  projectId: string;
  accProjectId: string;
  accHubId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccProjectLinkStatus {
  linked: boolean;
  link: AccProjectLink | null;
}

export interface RfiSyncStatus {
  rfiId: string;
  accRfiId: string | null;
  syncStatus: string;
  lastSyncedAt: string | null;
  syncError: string | null;
}

export interface SyncLog {
  id: string;
  rfiId: string;
  direction: string;
  status: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface AccUserMapping {
  id: string;
  projectId: string;
  accUserId: string;
  builderopsUserId: string;
  createdAt: string;
}

export interface SyncHealth {
  linked: boolean;
  enabled: boolean;
  totalRfis: number;
  syncedCount: number;
  failedCount: number;
  pendingCount: number;
  lastSync: string | null;
}

export interface PushAllResult {
  pushed: number;
  failed: number;
  errors: string[];
}

export interface PullResult {
  created: number;
  updated: number;
  errors: string[];
}

export async function linkAccProject(
  projectId: string,
  data: { acc_project_id: string; acc_hub_id: string }
): Promise<AccProjectLink> {
  const resp = await apiClient.post(`/projects/${projectId}/acc-sync/link`, data);
  return resp.data;
}

export async function unlinkAccProject(projectId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/acc-sync/link`);
}

export async function getAccLinkStatus(projectId: string): Promise<AccProjectLinkStatus> {
  const resp = await apiClient.get(`/projects/${projectId}/acc-sync/status`);
  return resp.data;
}

export async function syncRfiToAcc(projectId: string, rfiId: string): Promise<RfiSyncStatus> {
  const resp = await apiClient.post(`/projects/${projectId}/acc-sync/rfis/${rfiId}/sync`);
  return resp.data;
}

export async function pushAllRfis(projectId: string): Promise<PushAllResult> {
  const resp = await apiClient.post(`/projects/${projectId}/acc-sync/push-all`);
  return resp.data;
}

export async function pullRfisFromAcc(projectId: string): Promise<PullResult> {
  const resp = await apiClient.post(`/projects/${projectId}/acc-sync/pull`);
  return resp.data;
}

export async function getSyncHealth(projectId: string): Promise<SyncHealth> {
  const resp = await apiClient.get(`/projects/${projectId}/acc-sync/health`);
  return resp.data;
}

export async function getSyncLogs(projectId: string, limit = 50): Promise<SyncLog[]> {
  const resp = await apiClient.get(`/projects/${projectId}/acc-sync/logs`, { params: { limit } });
  return resp.data;
}

export async function getUserMappings(projectId: string): Promise<AccUserMapping[]> {
  const resp = await apiClient.get(`/projects/${projectId}/acc-sync/user-mappings`);
  return resp.data;
}

export async function createUserMapping(
  projectId: string,
  data: { acc_user_id: string; builderops_user_id: string }
): Promise<AccUserMapping> {
  const resp = await apiClient.post(`/projects/${projectId}/acc-sync/user-mappings`, data);
  return resp.data;
}
